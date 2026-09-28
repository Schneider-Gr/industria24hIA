## Context

Motivação e os quatro fatos da revisão em proposal.md. O estado a seguir foi verificado no master `e14ab1aa` em 28/09/2026:

- O chat comprador↔vendedor só abre com pedido pago (`podeFalarComVendedor` → RPC `comprador_tem_pedido_pago`, 0114).
- Molde de cotação gravada no servidor: `cotacoes_frete_externo` (0139). Sem policy, só RPC e service role tocam nela; `checkout_criar_pedido` lê o valor por `entrega->>'cotacao_externa_id'`, confere a loja e `expira_em` (0140) e nunca usa número do navegador.
- Regiões do produto: `produto_faixas_cep` (0169). `cepCobertoPorAlguma` trata lista vazia como "sem restrição" (fail-open); para a entrega a combinar, lista vazia vale só para a UF de origem (decisão 3 do PRD 050).
- Opções de frete: `decidirOpcoesFrete` devolve interna (percentual ou tabela) ou, sem ela, Uber Direct; sem nenhuma, lista vazia e erro de CEP sem cobertura.
- Avisos: `enviarEmail`/`wrapperEmail`/`botaoCta` (`src/lib/email.ts`); WhatsApp de saída pela BubbleWhats (`enviarBubblewhats`, só envia); a Meta Cloud API recebe no webhook e aceita botões (`enviarWhatsappComOpcoes`), mas sem template aprovado para mensagem fria.
- Crons da Vercel: todos diários. GitHub Actions já roda workflows agendados (`openwiki-update.yml`). As rotas de tick autenticam com `Authorization: Bearer $CRON_SECRET`.
- `buscarEndereco(cep)` (`src/lib/cep.ts`) resolve cidade, UF e bairro pelo ViaCEP.
- O frete não entra no repasse (0158).

## Goals / Non-Goals

**Goals:** o comprador de um produto com frete a combinar pede a cotação, o seller responde, e o comprador paga produto e frete cotado num pagamento só, com o valor gravado no servidor; a cotação nunca vale para outro comprador, CEP, conjunto de itens ou quantidade, nem depois da validade.

**Non-Goals:** resposta pelo WhatsApp com o Jev (US05), frete no repasse (PRD 052), chat antes da compra, negociação do preço do produto, cobrança de frete depois da compra.

## Passo a passo do processo

```
0. Seller marca "Frete a combinar" no produto (loja com a flag) ──▶ frete grátis e avião travados;
   tabela, percentual, Uber Direct e km do afiliado deixam de valer para o produto
              ▼
1. PDP ── produto com frete a combinar? ─não─▶ frete como hoje (sem mudança)
              │sim
              ▼
2. CEP conhecido? ─não─▶ pede o CEP
              │sim
              ▼
3. CEP nas regiões do produto (ou na UF de origem)? ─não─▶ "Não entregamos na sua região" + retirada
              │sim
              ▼
4. "Combine a entrega com o vendedor · Manaus, AM · [Pedir cotação de frete]" (nenhum outro frete na tela)
   └ cotação dele já existe para o CEP? mostra o estado (aguardando / respondida R$ X até dd/mm hh:mm / recusada / expirada)
              ▼
5. Comprador (logado) envia CEP, quantidade, observação ──▶ solicitar_cotacao_frete
   └ valida observação, limite 10/h, não é da própria loja, substitui a aberta igual
              ▼
6. Seller avisado: e-mail + WhatsApp (BubbleWhats, link) + contador no painel
              ▼
7. Seller responde no painel ──▶ responder_cotacao_frete
   ├ valor + prazo (+ valor do carrinho inteiro, se houver itens de tabela) ──▶ "respondida", vale 48 h
   ├ "não entrego nesse CEP" ──▶ "recusada"
   ├ 12 h sem resposta ──▶ lembrete (tick de hora em hora)
   └ 24 h sem resposta ──▶ "expirada" na leitura; tick avisa o comprador
              ▼
8. Comprador avisado (e-mail + WhatsApp) com valor, prazo, validade e link para o produto/carrinho
              ▼
9. Checkout: itens com frete a combinar viram envio próprio (por origem) ──▶ procura cotação respondida e válida com o mesmo comprador, loja, CEP e itens × quantidades
   ├ achou ──▶ "Frete combinado com o vendedor R$ X, de A a B dias úteis" (+ "Tudo com o vendedor R$ Y" se houver)
   └ não achou ──▶ "Pedir cotação" só dos itens sem frete (volta ao passo 5 a partir do checkout)
              ▼
10. checkout_criar_pedido revalida a cotação, grava o frete, marca a cotação "usada" com o pedido
              ▼
11. Pagamento único; chat livre liberado como hoje. Pagamento não concluído: cotação continua "usada"
    pelo pedido pendente; se o pedido for cancelado, volta a "respondida" enquanto valida.
```

## Decisions

**D1. Tabela `cotacoes_frete_vendedor`.** `id`, `loja_id`, `comprador_id`, `produto_id` (produto de onde partiu, nulo quando partiu do checkout), `cep_destino char(8)`, `bairro_destino`, `cidade_destino`, `uf_destino`, `cep_origem char(8)`, `itens jsonb` (`[{produto_id, quantidade}]`, os itens a combinar, ordenados por `produto_id`), `itens_chave text` (md5 dos itens ordenados), `itens_carrinho jsonb` (itens de tabela da mesma loja no momento do pedido, para a opção do carrinho inteiro; nulo na PDP), `observacao varchar(500)`, `status` (`aguardando`, `respondida`, `recusada`, `expirada`, `substituida`, `cancelada`, `usada`), `responder_ate` (criação + 24 h), `lembrete_em`, `aviso_expiracao_em`, `valor_centavos int check (>= 0)`, `valor_carrinho_centavos int`, `prazo_min`, `prazo_max smallint`, `respondida_em`, `respondida_por`, `canal_resposta` (`painel`; `whatsapp` fica para a US05), `valida_ate` (resposta + 48 h), `pedido_id`, `criado_em`. RLS: o comprador lê as dele; o dono da loja lê as da loja, sem `comprador_id` exposto (view `cotacoes_frete_seller` só com bairro, cidade, UF, CEP, itens e observação); ninguém escreve direto. Motivo: mesmo molde de `cotacoes_frete_externo`, e o seller não vê quem é o comprador (premissa aceita no PRD).

**D2. Status efetivo calculado, agendador só avisa.** `aguardando` com `responder_ate < now()` é expirada; `respondida` com `valida_ate < now()` é vencida. As RPCs e o checkout comparam as datas; a função `cotacao_status_efetivo(row)` devolve o status que a tela mostra. O tick grava `expirada` e manda os avisos, mas nenhuma regra depende de o tick ter rodado. Motivo: crons da Vercel são diários (fato 1), e um agendador atrasado não pode deixar uma cotação vencida valer.

**D3. Agendador de hora em hora pelo GitHub Actions.** `.github/workflows/cotacoes-frete-tick.yml` (`cron: "7 * * * *"`) chama `GET /api/cotacoes-frete/tick` com `CRON_SECRET` no segredo do repositório. O tick, idempotente por `lembrete_em`/`aviso_expiracao_em`: lembrete ao seller das `aguardando` com mais de 12 h; aviso ao comprador das expiradas. O lembrete pode sair até 1 h depois das 12 h. Descartados: `pg_cron` + `pg_net` (o projeto não usa nenhum dos dois e exigiria guardar o segredo no banco) e plano pago da Vercel. *(premissa: a dona aceita GitHub Actions como agendador)*

**D4. Opção do seller, exclusiva (decisão da dona, 28/09).** A entrega a combinar existe só para produto com `frete_a_combinar = true`, que o seller marca no cadastro e só aparece para loja com `entrega_a_combinar`. Para esse produto, o sistema desativa todo outro frete: `cotar_envios_tabela` (#808), `cotar_frete_tabela`, `cotar_frete_interno`, a cotação da Uber Direct e a entrega por km do afiliado (avião, 0193/0201) ignoram o item; o frete grátis não pode estar ligado junto (`check (not (frete_a_combinar and frete_gratis))`). A retirada na loja continua *(premissa: retirada não é frete)*. A PDP mostra a opção quando o CEP do comprador está em `produto_faixas_cep` do produto ou, sem faixa declarada, na mesma UF do CEP de origem (UF pelo `buscarEndereco`, gravada na cotação). Substitui a decisão 3 do PRD 050 (aparecer automaticamente sem frete calculável). Descartado: mostrar a cotação ao lado de outras opções, porque o seller escolheu combinar o frete daquele produto.

**D5. Origem = CEP do produto.** `cep_origem_produto(produto_id)` da change `frete-tabela-checkout` (D2 dela); enquanto ela não existir, CEP da loja. A PDP e o aviso mostram a cidade e a UF desse CEP. O seller não escolhe CD (substitui o campo "CD de origem" da US04). Carrinho com itens de origens diferentes gera uma cotação por origem.

**D6. Chave da cotação.** Uma cotação serve a um checkout só se `comprador_id = auth.uid()`, `loja_id`, `cep_destino` e `itens_chave` batem exatamente com os itens a combinar do envio (mesmos produtos e mesmas quantidades). Mudar CEP ou quantidade invalida a cotação para aquele carrinho, sem apagá-la: se o comprador voltar ao conjunto original, ela volta a valer. Um novo pedido com a mesma chave marca o anterior `aguardando`/`respondida` como `substituida`.

**D7. Pedido de cotação (`solicitar_cotacao_frete`).** `security definer`, exige usuário logado; recusa se o comprador é dono da loja; recusa se algum item não está aprovado, não tem `frete_a_combinar` ou a loja não tem a flag (lido do banco, não do navegador); recusa a observação que casar com telefone (8 ou mais dígitos, com ou sem separadores), e-mail, chave Pix aleatória (UUID) ou link (`http`, `www.`, domínio `.com`/`.br`); limite de 10 pedidos por comprador na última hora. A mesma validação da observação existe em TypeScript (`src/lib/cotacao-frete/observacao.ts`) só para a mensagem no formulário.

**D8. Resposta (`responder_cotacao_frete`).** Só o dono da loja; só `aguardando` com `responder_ate >= now()` (senão "cotação expirada"). Ou `p_recusar = true`, ou valor (≥ 0) e `prazo_min <= prazo_max`, ambos entre 1 e 60 dias úteis; `p_valor_carrinho` opcional, só quando a cotação tem `itens_carrinho`. Valor acima de 50% do valor dos produtos exige `p_confirmado = true` (a tela pergunta antes). Estoque insuficiente não bloqueia a resposta; o checkout já barra a compra por estoque.

**D9. Checkout.** Os itens com `frete_a_combinar` saem do cálculo de frete da loja e formam um envio próprio por CEP de origem, com `envio_ref` do mesmo jeito da #808; os demais itens seguem o frete de hoje (tabela com a flag da #808, senão percentual e Uber Direct). `cotar-frete` devolve, para o envio a combinar, `{ tipo: "a_combinar", cotacao }` com a cotação válida que casa (D6), ou `{ tipo: "a_combinar", cotacao: null }` para mostrar "Pedir cotação", e nunca outra opção para ele. Carrinho só com itens a combinar não precisa da #808. Opção "Tudo com o vendedor": aparece quando a cotação tem `valor_carrinho_centavos` e `itens_carrinho` bate com os itens de tabela atuais da loja; escolhida, substitui os envios de tabela da loja.

**D10. Pedido.** `entrega.envios[]` ganha `cotacao_vendedor_id` (e, para loja sem a flag de tabela, `entrega.cotacao_vendedor_id`), e `entrega.tudo_com_vendedor boolean`. `checkout_criar_pedido` trava a cotação (`for update`), confere D6, `status = 'respondida'` e `valida_ate >= now()`; senão levanta `'A cotação do frete mudou ou venceu. Revise a entrega.'`. Grava o valor rateado nas linhas do envio pelo valor do item (resto na última), `linha_itens.cotacao_vendedor_id`, `frete_prazo_min`/`max` (#808) e `transportadora_id` nulo; marca a cotação `usada` com `pedido_id`. Se o pedido for cancelado antes do pagamento, a cotação volta a `respondida` (ainda sujeita a `valida_ate`). O frete consolidado (70%) não se aplica a linha com `cotacao_vendedor_id`.

**D11. Flags.** `lojas.entrega_a_combinar boolean not null default false`, guardada em `guard_campos_restritos` como a flag de tabela (D9 da #808); só o admin liga, com aviso de que o frete ainda não chega ao seller até o PRD 052. `produtos.frete_a_combinar boolean not null default false`, editável pelo seller no formulário do produto (`ProdutoForm`, junto de "Frete grátis") só quando a loja tem a flag. Marcado: o formulário desmarca e trava "Frete grátis", e a linha do produto em `/seller/produtos` mostra o avião desativado com "Frete a combinar". Desmarcado: tudo volta como estava (bandas e valor por km não são apagados). Com a flag da loja desligada pelo admin, produto marcado fica só com retirada até o admin religar ou o seller desmarcar *(premissa)*.

**D12. Avisos.** Seller: e-mail + BubbleWhats (texto com produto, quantidade, CEP, bairro, cidade, observação e link `/seller/cotacoes-frete/<id>`) + contador no menu, sem nome nem contato do comprador. Comprador: e-mail + BubbleWhats (se houver telefone no perfil) na resposta, na recusa e na expiração, com link para o produto (cotação da PDP) ou para o carrinho (cotação do checkout). Envio de aviso é best-effort e nunca desfaz a gravação. Sem BubbleWhats configurada ou sem WhatsApp do seller: só e-mail e painel.

**D13. Regras puras em TypeScript** (`src/lib/cotacao-frete/`): status efetivo, chave dos itens, casamento cotação × envio, texto do prazo e do valor ("Frete grátis combinado com o vendedor"), validação da observação e decisão de exibir na PDP. Testadas com Vitest; o SQL repete as regras que protegem o dinheiro (D6, D7, D10) e é a fonte de verdade.

## Risks / Trade-offs

- [Seller não responde] → lembrete em 12 h, contador no painel, métrica de tempo de resposta.
- [Observação usada para contato por fora] → bloqueio no banco; o chat continua só após o pagamento. O filtro não pega número escrito por extenso; aceito.
- [Agendador do GitHub Actions atrasa ou falha] → só o aviso atrasa; a validade é conferida no uso (D2).
- [Frete cotado não chega ao seller] → flag só do admin até o PRD 052.
- [Seller marca frete a combinar e não responde] → lembrete, contador no painel; o produto continua vendável com retirada.
- [Corpo novo de `checkout_criar_pedido`] → teste em `begin … rollback` contra produção com loja sem as flags (percentual, Uber Direct, cupom, consolidado, venda futura) antes de aplicar.

## Migration Plan

1. Número pelo `scripts/proximo-migration.sh`; `--checar` de novo antes do push. Se a #808 ainda não tiver sido aplicada, esta migration cria só o que não depende dela e o ramo por envio entra na migration seguinte.
2. Teste em `begin … rollback` contra produção: pedido com observação com telefone recusado; 11º pedido na hora recusado; comprador dono da loja recusado; resposta depois de 24 h recusada; cotação de R$ 35,00 vira pedido com R$ 35,00; quantidade diferente recusa; outro comprador recusa; cotação vencida recusa; R$ 0,00 aceito; regressão sem as flags.
3. Aplicar com a confirmação da dona antes do merge (preview e produção usam o mesmo banco).
4. Rollback: colunas e tabela aditivas; recriar `checkout_criar_pedido` pela definição vigente antes desta migration.
