## Why

Hoje a criação do pedido e a geração da cobrança PIX são duas ações desacopladas em duas telas diferentes (`/checkout` e `/pedido/{id}`), cada uma pedindo nome/CPF/WhatsApp de novo, sem nenhum estado de progresso entre elas. Isso já é fricção por si só (formulário duplicado), e fica pior quando a geração automática de cobrança falha: o comprador cai numa tela de recuperação que hoje é o caminho "normal" do fluxo, não uma exceção. O benchmark ao vivo do Mercado Livre (PRD 012, referência) mostra o oposto — uma sessão única atravessando revisão → pagamento → progresso → confirmação, sem repetir dados nem trocar de tela sem aviso. Este change implementa a unificação de UX descrita no PRD 014.

**Pré-condição:** este change assume que o bug de travamento na geração de cobrança (PRD 013 — `criarCobrancaPedido` em `src/lib/asaas.ts` sem timeout, Server Action síncrona pendurando) já foi corrigido antes da implementação começar. Refinar a experiência em torno de uma ação que pode travar sem responder não resolve o problema de fundo.

## What Changes

- Formulário de identificação do comprador (nome, CPF/CNPJ, WhatsApp) passa a ser preenchido uma única vez, no checkout — a página do pedido não pede os mesmos dados de novo quando eles já foram informados.
- Novo estado de UI "gerando cobrança..." exibido entre a confirmação do pedido e a exibição do QR code PIX, como parte do fluxo normal (não só quando a geração automática falha).
- A tela de "gerar cobrança manualmente" deixa de ser o caminho padrão do fluxo e passa a existir apenas como tela de recuperação após falha tratada, com botão "Tentar novamente" que reaproveita os dados já coletados (sem novo formulário).
- **BREAKING (comportamento, não API pública):** a página `/pedido/{id}` deixa de sempre exibir um formulário de nome/CPF quando `asaas_cobranca_id` é nulo — agora só exibe esse formulário/tela quando há uma falha registrada na tentativa de geração, não como estado padrão de "ainda não gerou".

## Capabilities

### New Capabilities
- `checkout-pix-cobranca-unificada`: comportamento da sessão única de checkout PIX — coleta de dados do comprador uma única vez, estado de progresso durante a geração da cobrança, e tela de recuperação pós-falha sem repetição de dados.

### Modified Capabilities
(nenhuma — não existe spec formal prévia para o fluxo de checkout nesta capability; ver Impact para o código existente que será alterado)

## Impact

- `src/app/checkout/actions.ts`: `finalizarCompra` (linhas 19-236) e `gerarCobranca` (linhas 299-334) deixam de ser dois pontos de entrada independentes na percepção do usuário — a chamada a `criarCobrancaPedido` (linhas 238-294) passa a fazer parte do fluxo síncrono percebido logo após a confirmação do pedido.
- `src/app/pedido/[id]/page.tsx`: lógica de exibição condicional (formulário vs. QR) muda de "asaas_cobranca_id nulo → mostra formulário" para "há falha registrada → mostra tela de recuperação; senão, mostra progresso ou QR".
- Depende da correção do PRD 013 estar concluída (timeout tratado em `src/lib/asaas.ts`) — sem isso, o novo estado de progresso não tem como saber quando transicionar para erro tratado.
- Não altera o gateway de pagamento (permanece Asaas) nem a proteção do trigger `guard_campos_restritos` sobre `asaas_cobranca_id`/`link_cobranca` (migration `0012_hardening_seguranca.sql`).
