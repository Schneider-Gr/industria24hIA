import { chatComBot } from "./openai";
import { abrirChamadoJira, JIRA_OWNER_EMAIL } from "./jira";
import { buscarConhecimentoPRD } from "./confluence";
import { pontuarLead } from "./leadScoring";
import { enviarEmail } from "../email";
import type { ServiceClient } from "./botDb";
import type { ServiceClientSemTipos } from "./botDb";
import type { Persona } from "./systemPrompt";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

export type ResultadoPedido = Record<string, unknown> | { erro: string };

// Spec #308: contato já conhecido pelo canal (telefone do WhatsApp, e-mail
// de usuário logado) não deve ser reperguntado. `args.contato` do modelo
// tem prioridade quando presente; string vazia/só espaço conta como
// "não mandou" e cai no fallback — antes disso era `??`, que não pega
// string vazia (bug real: o schema tornava `contato` obrigatório, então o
// modelo enviava "" em vez de omitir, e o fallback nunca era usado).
export function resolverContatoLead(argsContato: string | undefined, contatoFallback: string | undefined): string {
  const informado = (argsContato ?? "").trim();
  return informado || (contatoFallback ?? "");
}

export type ProcessarMensagemBotInput = {
  svc: ServiceClientSemTipos;
  conversaId: string;
  mensagemUsuario: string;
  usuarioId: string | null;
  buscarPedido: (pedidoId: string) => Promise<ResultadoPedido>;
  /** PRD 009 US05 — lista disputas do usuário logado; o bot nunca cria uma. */
  buscarDisputas?: () => Promise<ResultadoPedido>;
  /** Spec #311 US01/US02 — histórico completo de pedidos do usuário logado, com status e itens (id/nome) para o fluxo de troca/disputa. */
  listarPedidos?: () => Promise<ResultadoPedido>;
  contatoFallback?: string;
  /** Nome/e-mail do usuário logado, para o bot não pedir de novo num handoff. */
  usuarioContextoExtra?: string;
};

// Núcleo do atendimento, comum ao site e ao WhatsApp: histórico, chamada ao
// modelo e loop de tool-calling. Identidade (sessão Auth vs. contato do
// WhatsApp) e a fonte de dado de `buscar_pedido` (RLS vs. service role) são
// adapters resolvidos por quem chama — cada canal injeta a sua versão.
export async function processarMensagemBot(input: ProcessarMensagemBotInput): Promise<{ textoFinal: string }> {
  const { svc, conversaId, mensagemUsuario, usuarioId, buscarPedido, buscarDisputas, listarPedidos, contatoFallback, usuarioContextoExtra } = input;

  await svc.from("bot_mensagens").insert({ conversa_id: conversaId, remetente: "usuario", conteudo: mensagemUsuario });

  const [{ data: historico }, { data: conversaAtual }] = await Promise.all([
    svc
      .from("bot_mensagens")
      .select("remetente, conteudo")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(30),
    svc.from("bot_conversas").select("persona").eq("id", conversaId).maybeSingle(),
  ]);

  let persona: Persona | null = conversaAtual?.persona ?? null;

  const mensagens: ChatCompletionMessageParam[] = (historico ?? []).map((m) => ({
    role: m.remetente === "usuario" ? "user" : "assistant",
    content: m.conteudo,
  }));

  let resposta = await chatComBot(mensagens, { persona, contextoExtra: usuarioContextoExtra });

  // Loop simples de tool-calling: no máximo uma rodada de ferramentas por
  // turno — é atendimento, não agente autônomo de múltiplos passos.
  if (resposta.tool_calls?.length) {
    const toolResults: ChatCompletionToolMessageParam[] = [];
    for (const call of resposta.tool_calls) {
      if (call.type !== "function") continue;
      const args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
      let resultado: unknown;

      if (call.function.name === "definir_persona") {
        persona = args.persona as Persona;
        await svc.from("bot_conversas").update({ persona }).eq("id", conversaId);
        resultado = { ok: true };
      } else if (call.function.name === "consultar_prd") {
        const trecho = await buscarConhecimentoPRD(args.pergunta);
        resultado = trecho ? { encontrado: true, conteudo: trecho } : { encontrado: false };
      } else if (call.function.name === "buscar_pedido") {
        resultado = usuarioId ? await buscarPedido(args.pedido_id) : { erro: "Usuário não está logado." };
      } else if (call.function.name === "buscar_disputas_pos_venda") {
        resultado =
          usuarioId && buscarDisputas
            ? await buscarDisputas()
            : { erro: "Usuário não está logado." };
      } else if (call.function.name === "listar_pedidos") {
        resultado =
          usuarioId && listarPedidos
            ? await listarPedidos()
            : { erro: "Usuário não está logado." };
      } else if (call.function.name === "registrar_lead") {
        // Upsert por conversa_id: uma conversa tem no máximo 1 lead. Sem
        // isso, 2 chamadas na mesma conversa (ex.: modelo separando
        // e-mail e WhatsApp em 2 tool calls) geram 2 leads incompletos em
        // vez de 1 completo, e uma chamada tardia (handoff) não teria
        // como corrigir a etapa_funil de um lead já criado antes.
        const contatoNovo = resolverContatoLead(args.contato, contatoFallback);
        const { data: leadExistente } = await svc.from("leads").select("id, nome, contato").eq("conversa_id", conversaId).maybeSingle();
        if (leadExistente) {
          const contatoMesclado =
            contatoNovo && contatoNovo !== leadExistente.contato
              ? `${leadExistente.contato} / ${contatoNovo}`
              : leadExistente.contato;
          await svc
            .from("leads")
            .update({
              nome: args.nome ?? leadExistente.nome,
              contato: contatoMesclado,
              interesse: args.interesse ?? null,
              persona,
              etapa_funil: args.etapa_funil,
            })
            .eq("id", leadExistente.id);
        } else {
          await svc.from("leads").insert({
            conversa_id: conversaId,
            nome: args.nome ?? null,
            contato: contatoNovo,
            interesse: args.interesse ?? null,
            persona,
            etapa_funil: args.etapa_funil,
          });
        }
        resultado = { ok: true };

        // Scoring por IA (US08/US22): dispara aqui (não por mensagem) e o
        // próprio pontuarLead throttla por scored_at. Nunca deve derrubar o
        // atendimento — falha de scoring é best-effort.
        {
          const { data: leadAtualizado } = await svc.from("leads").select("id, nome, contato").eq("conversa_id", conversaId).maybeSingle();
          if (leadAtualizado) {
            pontuarLead(svc as unknown as ServiceClient, leadAtualizado.id).catch(() => {});
          }
        }
      } else if (call.function.name === "abrir_chamado") {
        // Spec #311: o registro no admin nasce ANTES da tentativa de Jira e
        // não depende dela ter funcionado — hoje jira_issue_key não aparece
        // em nenhuma UI (achado do brainstorm) e o token do Jira já
        // rotacionou/expirou antes; se depender do Jira, a auditoria some
        // junto com a falha dele.
        const svcIncidentes = svc as unknown as {
          from(table: "incidentes_atendimento"): {
            insert(values: { conversa_id: string; resumo: string }): {
              select(cols: string): { single(): Promise<{ data: { id: string } | null; error: unknown }> };
            };
            update(values: { jira_issue_key: string }): { eq(col: "id", val: string): Promise<{ error: unknown }> };
          };
        };
        const { data: incidente } = await svcIncidentes
          .from("incidentes_atendimento")
          .insert({ conversa_id: conversaId, resumo: args.resumo })
          .select("id")
          .single();

        const issueKey = await abrirChamadoJira({ conversaId, resumo: args.resumo });
        await svc.from("bot_conversas").update({ status: "escalada", jira_issue_key: issueKey }).eq("id", conversaId);
        if (incidente && issueKey) {
          await svcIncidentes.from("incidentes_atendimento").update({ jira_issue_key: issueKey }).eq("id", incidente.id);
        }

        // Best-effort: aviso ao dono da conta nunca derruba o atendimento.
        enviarEmail({
          to: JIRA_OWNER_EMAIL,
          subject: `Novo incidente de atendimento${issueKey ? ` — ${issueKey}` : ""}`,
          text: `${args.resumo}\n\nConversa: ${conversaId}${issueKey ? `\nJira: ${issueKey}` : "\n(Jira não disponível no momento — ver /admin/incidentes)"}`,
        }).catch(() => {});

        resultado = incidente
          ? { ok: true, issue: issueKey }
          : { ok: false, aviso: "Escalonamento não configurado." };
      } else {
        resultado = { erro: "Ferramenta desconhecida." };
      }

      toolResults.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado) });
    }

    resposta = await chatComBot(
      [
        ...mensagens,
        { role: "assistant", tool_calls: resposta.tool_calls, content: resposta.content },
        ...toolResults,
      ],
      { persona, contextoExtra: usuarioContextoExtra },
    );
  }

  const textoFinal = resposta.content ?? "Não consegui gerar uma resposta agora.";
  await svc.from("bot_mensagens").insert({ conversa_id: conversaId, remetente: "bot", conteudo: textoFinal });

  return { textoFinal };
}
