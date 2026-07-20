-- Aceite dos Termos do Mercado Futuro (venda futura), registrado POR PEDIDO.
-- Colunas confirmadas pelo dono nesta sessão (17/07): o gate B2B da venda
-- futura (0036) já exige perfil CNPJ/IE no checkout; aqui adiciona-se a prova
-- de aceite dos termos contratuais dessa modalidade (compra firme/irretratável
-- entre PJs, afastando o art. 49 do CDC). Nullable: pedidos que não são de
-- Mercado Futuro ficam sem aceite. A RPC checkout_criar_pedido NÃO é tocada —
-- o carimbo é gravado pela server action via service role após o pedido criado.

alter table public.pedidos
  add column if not exists termos_aceitos_em timestamptz,
  add column if not exists termos_versao     text;

-- Seed idempotente do documento no CMS (paginas_cms, 0008). Acessível em
-- /termos/termos-mercado-futuro (rota pública criada na 0060).
insert into public.paginas_cms (slug, titulo, conteudo_rich) values
(
  'termos-mercado-futuro',
  'Termos de Compra — Mercado Futuro',
  $TERMOS$TERMOS E CONDIÇÕES DE COMPRA NO MERCADO FUTURO
Indústria 24h — última atualização: 18/07/2026

1. OBJETO E NATUREZA EMPRESARIAL (B2B)
1.1 Estes Termos regem a compra de produtos para entrega futura ("Mercado Futuro") ofertados por vendedores ("Sellers") na plataforma Indústria 24h ("Plataforma").
1.2 O Mercado Futuro é destinado exclusivamente a pessoas jurídicas (CNPJ) e a produtores rurais com Inscrição Estadual. Ao concluir a compra, o comprador declara que adquire os produtos no exercício de sua atividade empresarial ou produtiva, como insumo ou para revenda, e não como destinatário final.
1.3 Por não se tratar de relação de consumo (art. 2º do Código de Defesa do Consumidor), não se aplica o direito de arrependimento do art. 49 do CDC. A compra é firme e irretratável a partir da confirmação, ressalvadas as hipóteses previstas nestes Termos.

2. CADASTRO OBRIGATÓRIO
2.1 A finalização da compra exige CNPJ válido ou Inscrição Estadual de produtor rural, informados no checkout. O comprador responde pela veracidade dos dados.

3. PREÇO, LOTES E PAGAMENTO
3.1 O preço é definido no ato da compra, podendo variar por faixa de volume ou lote (desconto progressivo), conforme exibido antes da confirmação.
3.2 O pagamento observa as formas e prazos exibidos no checkout; havendo sinal ou parcela antecipada, o valor é informado antes do aceite.
3.3 O repasse ao Seller segue as regras de pagamento da Plataforma.

4. RESERVA E ENTREGA FUTURA
4.1 A confirmação reserva o estoque do lote/safra e vincula comprador e Seller.
4.2 A entrega ocorre na janela ou prazo informados no anúncio; a responsabilidade pela produção e disponibilização do produto é do Seller.

5. INADIMPLÊNCIA E CANCELAMENTO
5.1 O não pagamento nos prazos autoriza o cancelamento do pedido e a liberação da reserva, sem prejuízo da cobrança do que for devido.
5.2 O distrato depende de acordo entre as partes; não há devolução por simples arrependimento.

6. FRUSTRAÇÃO DE SAFRA E FORÇA MAIOR
6.1 Em caso de força maior ou frustração de safra que impeça a entrega (art. 393 do Código Civil), o Seller comunicará o comprador e as partes poderão reagendar a entrega ou desfazer o negócio com devolução dos valores pagos, sem outras penalidades.

7. PAPEL DA PLATAFORMA
7.1 A Indústria 24h atua como intermediadora; a compra e venda ocorre entre comprador e Seller. A Plataforma não é parte no contrato de compra e venda nem responde pela produção ou entrega.

8. PROTEÇÃO DE DADOS E FORO
8.1 O tratamento de dados pessoais observa a LGPD (Lei 13.709/2018).
8.2 Estes Termos podem ser atualizados; a versão vigente é registrada no momento do aceite. Elege-se o foro do domicílio do comprador (pessoa jurídica) para dirimir controvérsias.$TERMOS$
)
on conflict (slug) do update
  set titulo = excluded.titulo,
      conteudo_rich = excluded.conteudo_rich,
      atualizado_em = now();
