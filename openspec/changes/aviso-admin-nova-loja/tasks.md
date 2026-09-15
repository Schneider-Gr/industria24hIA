## 0. Pré-requisitos (dona do produto)

- [x] 0.1 Informar o número de WhatsApp do admin e confirmar o gatilho (criação da loja)
- [x] 0.2 Vercel: marcar `BUBBLEWHATS_API_URL` também em **Production**
- [x] 0.3 Vercel: criar a variável do número do admin em Production e Preview

## 1. Templates

- [x] 1.1 `mensagemNovaSolicitacaoLoja({ nomeLoja, contato, linkAdmin })` em
      `src/lib/bubblewhats.ts`
- [x] 1.2 Teste do template em `src/lib/bubblewhats.test.ts` (texto contém
      "Nova solicitação de cadastro de loja", nome e link; sem rede)
- [x] 1.3 `templateNovaSolicitacaoLoja({ nomeLoja, email, whatsapp, cidade, estado, criadaEm, linkAdmin })`
      em `src/lib/email.ts`, reusando `wrapperEmail`
- [x] 1.4 Teste do template de e-mail (campos opcionais ausentes não geram
      "null"/"undefined" no HTML; link presente)

## 2. Disparo

- [x] 2.1 Função `avisarAdminNovaLoja(lojaId)` que busca os dados da loja e envia
      e-mail e WhatsApp de forma independente (um não bloqueia o outro)
- [x] 2.2 Chamar em `after()` só no ramo de INSERT de `salvarLoja`
- [x] 2.3 Falhas: `enviarEmail` `enviado=false` e `enviarBubblewhats` `ok=false`
      viram `Sentry.captureMessage` com tags `area:admin-aviso-nova-loja` e o
      canal; `nao_configurado` registrado como `warning`
- [x] 2.4 Número do admin normalizado com `normalizeWhatsapp`; variável ausente
      pula o WhatsApp e mantém o e-mail

## 3. Verificação

- [x] 3.1 `tsc --noEmit`, `eslint` nos arquivos alterados e `vitest run` verdes
- [x] 3.2 PR com `Closes #651`
- [x] 3.3 Produção, após deploy: criar loja de QA e confirmar e-mail em
      `industria24hs@gmail.com` com o assunto exato e WhatsApp no número do admin
- [ ] 3.4 Produção: editar a loja de QA e confirmar que nenhum aviso novo sai
- [ ] 3.5 Arquivar a change após o merge
