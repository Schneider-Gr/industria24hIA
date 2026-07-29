# PRD — Programa de Confiança Inicial para Vendedor Novo (inspirado no Programa Decola do Mercado Livre)

> Rascunho gerado por engenharia reversa da conta real de vendedora no Mercado
> Livre (login autenticado, 2026-07-17) — ver `docs/auditoria-ml-seller-panel-2026-07-17.md`,
> item 1.3, para a descrição completa do que foi observado. Cruzado com
> `docs/compliance.md` (seção 2, split/repasse via Asaas) e `docs/seller-module.md`/
> `seller/reputacao/page.tsx` (reputação já parcialmente implementada). Status:
> **DRAFT**. Envolve dinheiro de terceiro em garantia — trechos marcados
> **[PENDENTE DECISÃO DO DONO]** não devem virar código sem confirmação
> explícita (`CLAUDE.md`, regra "nunca invente schema" + regra de cautela
> financeira já aplicada em `compliance.md`).

## 1. Problema

Todo marketplace novo sofre do mesmo cold-start: comprador não confia em
vendedor sem histórico, vendedor sem venda não constrói histórico. Hoje o
Industria24h já mede reputação (`seller/reputacao/page.tsx`, com os mesmos 3
indicadores e limites do Mercado Livre — reclamação 2%, cancelamento 1,5%,
envio incorreto 10%), mas **não tem nenhum mecanismo para vendedor novo
"pular a fila" de confiança** — ele só constrói reputação organicamente,
vendendo pouco porque não tem reputação, num ciclo que trava o crescimento de
oferta na plataforma.

O Mercado Livre resolve isso com o **Programa Decola**: o vendedor deposita
R$250 como garantia e recebe imediatamente reputação "verde" (a mais alta),
mais benefícios de visibilidade, por até 1 ano — o depósito funciona como
"skin in the game" que substitui o histórico que ele ainda não tem.

## 2. Fora de escopo (explícito)

- Réplica exata do valor (R$250) ou dos benefícios específicos do ML (Envios
  Flex, Clips/vídeo, promoções de 1 milhão de compradores) — o Industria24h
  não tem essas features hoje; o programa aqui proposto usa só o que a
  plataforma já tem (reputação + visibilidade na vitrine).
- Seguro ou garantia para o comprador em caso de disputa — este programa é
  sobre **reputação/visibilidade do vendedor**, não é um mecanismo de proteção
  ao comprador (isso já existe/deveria existir separadamente).
- Reembolso automático via gateway sem revisão humana no piloto — dado que
  `compliance.md` já registra ausência de fila de exceção com humano no loop
  para falhas de transferência, este programa não deve piorar esse risco.
- Qualquer decisão sobre o **valor do depósito, se ele fica com a
  Industria24h ou com um custodiante separado, e o enquadramento regulatório
  disso** — ver seção 7.

## 3. Jornada do usuário

1. Vendedor novo (sem cor de reputação ainda, por não ter atingido o volume
   mínimo — ver recomendação 2 da auditoria, que propõe adicionar esse gate)
   vê, no painel seller (`/seller/reputacao` ou `/seller` home), uma oferta:
   "Ative visibilidade agora depositando uma garantia reembolsável".
2. Vendedor deposita um valor (**[PENDENTE DECISÃO DO DONO]** quanto, e via
   qual meio — hoje o Industria24h usa Asaas para PIX/boleto/cartão, ver
   `docs/compliance.md`).
3. Ao confirmar o depósito, a loja recebe imediatamente:
   - Selo de reputação alta na vitrine (ex.: "Vendedor verificado" — nome a
     definir, evitando confundir com a cor calculada organicamente).
   - Prioridade de exibição na busca/listagem da vitrine (mesmo mecanismo que
     hoje ordena por relevância — **[PENDENTE DECISÃO DO DONO]**: existe
     ranking de busca hoje que dê pra plugar prioridade nele?).
4. Durante o período do programa (proposta: espelhar 1 ano do ML, ajustável),
   o sistema acompanha as mesmas 3 métricas negativas já existentes em
   `reputacao/page.tsx`. Se o número de "vendas afetadas" (reclamação,
   cancelamento por ele, envio incorreto) ultrapassar um limite (**[PENDENTE
   DECISÃO DO DONO]**: replicar "5 vendas afetadas" do ML ou usar um número
   relativo ao volume da loja?), o programa é suspenso — selo removido,
   depósito não devolvido integralmente.
5. Ao fim do período (ou a pedido do vendedor), o depósito é devolvido
   proporcionalmente ao desempenho (100% se zero vendas afetadas, reduzindo
   conforme a régua definida na decisão pendente acima).

## 4. Dados

**Já existentes, reaproveitar:**
- `reputacao` (implícito em `reputacao/page.tsx`, hoje calculado on-the-fly a
  partir de `pedidos`, `reclamacoes`, `entregas` — não é uma tabela própria
  ainda). As 3 métricas de "venda afetada" já são calculáveis com o schema
  atual.

**Novos, propostos nesta sessão — nenhum confirmado em `docs/database.md`;
tratar como hipótese até o dono validar:**
- `programa_confianca_inicial`: `id`, `loja_id`, `valor_deposito`,
  `status` (`ativo` | `suspenso` | `encerrado`), `data_ativacao`,
  `data_fim_prevista`, `vendas_afetadas_contador`, `valor_devolvido` (nullable
  até o encerramento).
- Vínculo com o pagamento do depósito: **[PENDENTE DECISÃO DO DONO]** — é uma
  cobrança Asaas normal (como o checkout) ou precisa de um fluxo de custódia
  separado? Isso muda o modelo de dados e o risco regulatório (ver seção 7).

## 5. Edge cases

- Vendedor ativa o programa, atinge o limite de vendas afetadas antes do fim
  do período → programa suspenso, selo removido imediatamente (não esperar o
  fim do período) — replica a regra do ML ("se chegar a 5 vendas afetadas, o
  Programa ficará inativo").
- Vendedor cancela a loja/conta com o programa ativo e depósito ainda não
  devolvido → definir prioridade desse valor frente a outras obrigações da
  loja (**[PENDENTE DECISÃO DO DONO]**, mesma cautela de `compliance.md` seção
  2 sobre custódia de dinheiro de terceiro).
- Duas lojas do mesmo CNPJ tentando usar o programa duas vezes para dobrar
  benefício → decidir se o programa é por CNPJ ou por loja (**[PENDENTE
  DECISÃO DO DONO]**).
- Reputação "orgânica" (10+ vendas, sem depósito) supera a reputação do
  programa — como exibir os dois tipos de selo sem confundir o comprador?

## 6. Critério de aceite

- Vendedor consegue ativar o programa e ver o selo/prioridade refletido na
  vitrine imediatamente após confirmação do pagamento.
- As 3 métricas negativas já existentes em `reputacao/page.tsx` alimentam o
  contador de "vendas afetadas" do programa sem duplicar lógica de cálculo.
- Programa suspende automaticamente ao ultrapassar o limite definido, sem
  intervenção manual.
- Devolução do depósito é calculada corretamente pela régua definida (mesmo
  que o pagamento em si, no piloto, seja processado manualmente — replicando
  a cautela já aplicada ao repasse em `compliance.md`).

## 7. Riscos / dependências

- **Risco regulatório real, não só técnico:** reter depósito de terceiro
  (mesmo chamado de "garantia") aproxima a plataforma do mesmo território já
  identificado em `docs/compliance.md` seção 2 (split/repasse — risco de
  enquadramento como instituição de pagamento/subcredenciadora perante o
  Bacen). Este programa **soma** a esse risco, não é independente dele —
  qualquer decisão de avançar deveria revisar as duas PRDs (esta e o
  split/repasse) com a mesma opinião jurídica, não separadamente.
- **Depende de `docs/prd/percursos-entrega-lote-mercado-envios-extra.md`?**
  Não diretamente, mas ambos competem por prioridade de engenharia na mesma
  janela pós-cutover — decisão de sequenciamento é do dono.
- **Depende de existir algum mecanismo de ranking/priorização na vitrine** —
  se a vitrine hoje só lista por data/categoria sem relevância, "prioridade de
  exibição" não tem onde plugar sem antes construir isso.
- **Valor do depósito é decisão de produto, não técnica** — R$250 do ML é
  calibrado para o ticket médio deles; o Industria24h (B2B industrial, tickets
  mais altos, ver `docs/prd/afiliado-logistica.md`) provavelmente precisa de
  um valor bem diferente.

---

**Próximo passo sugerido:** decidir se este programa é prioridade agora
(depende de opinião jurídica combinada com a de `compliance.md` seção 2) antes
de qualquer código — nenhuma parte financeira desta PRD deveria ser
implementada sem essa revisão.
