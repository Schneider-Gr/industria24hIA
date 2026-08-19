---
prd_number: "018"
status: em-progresso
priority: crítica
created: 2026-08-19
issue: ""
depends_on: []
references: []
---

# PRD 018: Proteção do ambiente de produção Asaas

## 1. Contexto

- **Produto/área**: Integração de pagamentos Asaas (`src/lib/asaas.ts`) e operação da conta Asaas em produção.
- **Estado atual**: A conta Asaas de **produção** usada pelo industria24hIA (Next.js) é a **mesma conta** usada pelo projeto legado em Bubble, **industria24h.com.br**, que está no ar hoje processando cobranças e repasses reais. Não existem duas contas Asaas separadas por projeto.
- **Problema**: Não existe hoje nenhum mecanismo técnico ou documental explícito que impeça um agente de teste/QA (humano ou de IA) de, ao investigar ou testar a integração Asaas do industria24hIA, tocar o painel de produção ou disparar chamadas mutáveis reais — e qualquer alteração feita ali (remoção de API key, edição de webhook, cancelamento de cobrança real) afeta também o Bubble, que não tem relação com o código deste repositório e cujo time não seria avisado da causa.

### Levantamento técnico (2026-08-19)

- **Não existe no código** nenhuma chamada para criar, editar ou remover API keys ou webhooks via API do Asaas (`/myAccount/apiKey`, `/webhooks`). O cadastro do webhook é feito manualmente no painel pelo dono do projeto. Ou seja: o risco de "remover API" no sentido literal (a integração/chave cadastrada na conta) só existe por ação manual de alguém na UI do painel Asaas — não é algo que o código automatize ou que um teste automatizado possa disparar sozinho.
- **Existe** uma função mutável real e potencialmente destrutiva sobre dados de produção: `cancelPayment` em `src/lib/asaas.ts`, que faz `DELETE /payments/{id}` — cancela uma cobrança real se executada com chave de produção. As demais funções mutáveis (`createPayment`, `createPixTransfer`, `ensureCustomer`) também escrevem dados reais em produção (cobrança, transferência PIX, cliente).
- Separação sandbox/produção hoje é feita só por duas env vars sem validação cruzada: `ASASS_API_KEY` (nome com typo, decisão deliberada de não corrigir) e `ASAAS_ENV=production` (qualquer outro valor, incluindo ausência, resolve para sandbox — comportamento fail-safe, mas sem alerta se houver descompasso entre o valor da chave e o valor de `ASAAS_ENV`).
- Não há testes automatizados (CI ou local) que chamem a API real do Asaas, sandbox ou produção. Os testes contra Asaas documentados nos PRDs 012 e 013 foram manuais, ao vivo, feitos por um engenheiro com conta de teste — nunca por um agente autônomo.

## 2. Solução Proposta

### Visão

Fechar o gap comportamental hoje: nenhum agente (incluindo agentes de IA em modo QA/teste) deve poder tocar o painel de produção do Asaas nem disparar chamadas mutáveis de `src/lib/asaas.ts` contra `api.asaas.com` fora de um fluxo real de usuário — e isso precisa estar documentado onde um agente vai ler antes de agir, não apenas na cabeça do dono do projeto.

### Decisões

1. A proteção é primariamente **documental/comportamental**, não técnica — porque o risco real hoje está na ação manual de um agente no painel Asaas (que nenhum código pode impedir), não em uma rotina automatizada existente que precise ser desligada.
2. A skill `.claude/skills/asaas-pagamentos/SKILL.md` ganha uma seção de proteção de produção no topo do arquivo, para ser lida antes de qualquer implementação/teste que toque Asaas.
3. Um gap técnico foi identificado mas **não é implementado por este PRD**: falta um guard/assert em `src/lib/asaas.ts` que valide o prefixo da chave (`$aact_prod_` vs `$aact_hmlg_`) contra o valor de `ASAAS_ENV`, para falhar alto e cedo em caso de descompasso. Fica registrado como item de risco (§7) para decisão futura do dono — não é bug ativo hoje, é lacuna de defesa em profundidade.

### Fora do escopo

- Qualquer mudança em `src/lib/asaas.ts` ou em qualquer outro código de produção.
- Qualquer alteração em credenciais, API keys ou webhooks na conta Asaas.
- Revisão da lógica de repasse PIX, Split ou fluxo de checkout — coberta por outros PRDs/skill existente.

## 3. Regras

### R01: Nenhum agente acessa o painel de produção do Asaas para alterar integrações

Como responsável técnico, quero que nenhum agente de teste/QA acesse `asaas.com` (produção, não `sandbox.asaas.com`) para criar, editar ou remover API keys, webhooks ou contas de acesso, para não colocar em risco o projeto Bubble industria24h.com.br que compartilha a mesma conta e está em produção.

**Regras:**
- Proibido para qualquer agente (humano ou IA) alterar integrações/API keys/webhooks no painel Asaas em modo produção como parte de tarefa de teste, QA ou investigação de bug.
- Cadastro/alteração de webhook continua sendo ação manual exclusiva do dono do projeto no painel.
- Se uma tarefa exigir de fato uma ação em produção no Asaas (ex.: suporte a lojista, investigação de cobrança real), é ação que exige confirmação explícita do usuário antes de executar — nunca autônoma.

### R02: Nenhum teste/QA chama funções mutáveis de `asaas.ts` contra produção

Como responsável técnico, quero que testes e QA usem exclusivamente a API sandbox do Asaas, para nunca criar, cancelar ou transferir valores reais durante uma tarefa de teste.

**Regras:**
- `cancelPayment`, `createPayment`, `createPixTransfer`, `ensureCustomer` só podem rodar contra `api.asaas.com` (produção) dentro do fluxo real de um usuário/pedido real da aplicação — nunca disparadas por um agente para fins de teste/verificação.
- Antes de rodar qualquer teste que toque Asaas, o agente confirma no código/ambiente (nunca supõe) o valor resolvido de `ASAAS_ENV`.
- `cancelPayment` (`DELETE /payments/{id}`) é destrutivo sobre uma cobrança real — nunca deve ser chamada fora do fluxo real de cancelamento pelo comprador/admin.

## 4. Critérios de Aceite

| Critério | Razão | Como verificar |
|----------|-------|-----------------|
| Seção de proteção de produção presente no topo de `.claude/skills/asaas-pagamentos/SKILL.md` | É o ponto que um agente lê antes de tocar Asaas | Leitura do arquivo |
| Este PRD referenciado a partir da skill | Rastreabilidade da decisão | Leitura do arquivo |
| Nenhuma mudança de código feita neste PRD | Escopo é documental, gap técnico fica para decisão futura | `git diff` do PR restrito a `.claude/skills/` e `docs/prds/` |

## 5. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Falta de guard técnico ligando prefixo da chave (`$aact_prod_`/`$aact_hmlg_`) a `ASAAS_ENV` | Médio — um agente pode configurar chave de produção num ambiente marcado como sandbox (ou vice-versa) sem alerta explícito no código | Não implementado aqui — registrado como pendência técnica para decisão do dono | Pendente |
| Regra é só documental — nada impede tecnicamente um agente de ignorá-la | Alto se a regra não for lida antes de agir | Skill fica no topo do arquivo, é referenciada pelo CLAUDE.md do projeto e reforçada em memória de sessão | Mitigado (documental) |
| Conta Asaas de produção compartilhada com o Bubble não tem, hoje, nenhum log de auditoria conhecido do lado do industria24hIA que avise se uma ação afetou o outro projeto | Alto — dificulta detectar/reverter um incidente | Fora do escopo deste PRD; considerar item futuro | Não tratado |

## 6. Registro de Decisões

- **2026-08-19:** Escopo definido como documental (skill + PRD), sem guard técnico em código. Motivo: o risco concreto identificado é ação manual de agente no painel, que código não pode prevenir; a lacuna técnica real (validação chave×env) é defesa em profundidade, não correção de um bug ativo, e não deve ser implementada sem decisão explícita do dono sobre o comportamento de falha (bloquear a chamada? só logar warning?).
