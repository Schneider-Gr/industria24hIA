import { chatComBot } from "./openai";
import { abrirChamadoJira } from "./jira";
import { buscarConhecimentoPRD } from "./confluence";
import type { ServiceClientSemTipos } from "./botDb";
import type { Persona } from "./systemPrompt";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

export type ResultadoPedido = Record<string, unknown> | { erro: string };

export type ProcessarMensagemBotInput = {
  svc: ServiceClientSemTipos;
  conversaId: string;
  mensagemUsuario: string;
  usuarioId: string | null;
  buscarPedido: (pedidoId: string) => Promise<ResultadoPedido>;
  contatoFallback?: string;
  /** Nome/e-mail do usuário logado, para o bot não pedir de novo num handoff. */
  usuarioContextoExtra?: string;
};

// Núcleo do atendimento, comum ao site e ao WhatsApp: histórico, chamada ao
// modelo e loop de tool-calling. Identidade (sessão Auth vs. contato do
// WhatsApp) e a fonte de dado de `buscar_pedido` (RLS vs. service role) são
// adapters resolvidos por quem chama — cada canal injeta a sua versão.
export async function processarMensagemBot(input: ProcessarMensagemBotInput): Promise<{ textoFinal: string }> {
  const { svc, conversaId, mensagemUsuario, usuarioId, buscarPedido, contatoFallback, usuarioContextoExtra } = input;

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
      } else if (call.function.name === "registrar_lead") {
        // Upsert por conversa_id: uma conversa tem no máximo 1 lead. Sem
        // isso, 2 chamadas na mesma conversa (ex.: modelo separando
        // e-mail e WhatsApp em 2 tool calls) geram 2 leads incompletos em
        // vez de 1 completo, e uma chamada tardia (handoff) não teria
        // como corrigir a etapa_funil de um lead já criado antes.
        const contatoNovo = args.contato ?? contatoFallback ?? "";
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
      } else if (call.function.name === "abrir_chamado") {
        const issueKey = await abrirChamadoJira({ conversaId, resumo: args.resumo });
        await svc.from("bot_conversas").update({ status: "escalada", jira_issue_key: issueKey }).eq("id", conversaId);
        resultado = issueKey ? { ok: true, issue: issueKey } : { ok: false, aviso: "Escalonamento não configurado." };
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
