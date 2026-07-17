-- Aceite de termos pelos afiliados (logística e vendas).
-- Registra QUANDO o afiliado aceitou e QUAL versão do texto (atualizado_em da
-- página CMS vigente no momento). Colunas nullable: afiliações históricas ficam
-- sem aceite, sem quebrar o CHECK/RLS existente.

alter table public.afiliacoes
  add column if not exists termos_aceitos_em timestamptz,
  add column if not exists termos_versao     text;

-- Seed idempotente dos dois documentos no CMS (paginas_cms, migration 0008).
-- Editável depois pelo admin em /admin/paginas; a rota pública /termos/[slug]
-- renderiza o conteudo_rich. Reaplica o texto em conflito (fonte única = esta migration).
insert into public.paginas_cms (slug, titulo, conteudo_rich) values
(
  'termos-afiliado-logistica',
  'Termos de Serviço — Afiliado de Logística',
  $TERMOS$TERMOS DE SERVIÇO — AFILIADO DE LOGÍSTICA (CONDUTOR AUTÔNOMO)
Indústria 24h — última atualização: 17/07/2026

1. OBJETO E ACEITE
1.1 Estes Termos regem a prestação de serviços de coleta e entrega de mercadorias ("Serviços") pelo Afiliado de Logística ("Condutor Autônomo") aos vendedores ("Sellers") anunciantes da plataforma Indústria 24h ("Plataforma"), por meio dos painéis e aplicativos disponibilizados.
1.2 O aceite é eletrônico e voluntário. Ao marcar a caixa de aceite e solicitar a afiliação de logística, o Condutor Autônomo declara que leu, compreendeu e concorda com estes Termos, com os Termos gerais de uso da Plataforma e com as condições do provedor de pagamentos (gateway PIX).
1.3 Não há relação de emprego, subordinação, habitualidade ou exclusividade entre o Condutor Autônomo e a Plataforma ou os Sellers. O Condutor Autônomo é profissional autônomo ou pessoa jurídica, atuando por conta própria e assumindo os riscos de sua atividade.

2. AUTONOMIA
2.1 O Condutor Autônomo escolhe livremente os dias, horários e regiões em que se disponibiliza, podendo aceitar ou recusar qualquer corrida ou rota ofertada, sem penalidade.
2.2 O Condutor Autônomo pode interromper o uso da Plataforma e encerrar sua afiliação a qualquer tempo, a seu exclusivo critério.
2.3 O Condutor Autônomo determina a forma mais eficiente e segura de executar a entrega, respeitada a legislação de trânsito, transporte e segurança.

3. REQUISITOS E DOCUMENTAÇÃO
3.1 Para prestar os Serviços, o Condutor Autônomo deve manter: inscrição como PJ ou MEI com CNAE compatível com transporte/entrega de mercadorias; CNH válida; veículo em condições de uso e regularidade; e emitir documento fiscal do serviço quando exigido.
3.2 O Condutor Autônomo é o único responsável pela veracidade dos dados cadastrais e pela manutenção de suas licenças e autorizações.

4. REMUNERAÇÃO E REPASSE
4.1 A remuneração é definida por corrida ou rota e exibida ao Condutor Autônomo ANTES do aceite. Ao aceitar a corrida, concorda com o valor apresentado.
4.2 O repasse é efetuado via PIX, na chave cadastrada pelo Condutor Autônomo, conforme o ciclo de pagamento da Plataforma.
4.3 São de exclusiva responsabilidade do Condutor Autônomo todos os custos da atividade, incluindo combustível, manutenção, seguros, tributos, encargos e demais despesas.

5. INEXISTÊNCIA DE GARANTIA
5.1 O aceite destes Termos não garante volume mínimo de corridas, prioridade ou continuidade de ofertas. A oferta depende de demanda, região e capacidade do veículo.
5.2 A Plataforma pode suspender ou descredenciar o Condutor Autônomo, com ou sem justa causa, sem que isso gere direito a indenização.

6. MERCADORIAS
6.1 A mercadoria pertence ao Seller; a Plataforma não é sua proprietária nem responsável pelo seu conteúdo. O Condutor Autônomo não tem direito de retenção sobre a mercadoria.
6.2 O Condutor Autônomo responde por extravio ou avaria decorrentes de dolo ou culpa na execução do Serviço, conforme a legislação aplicável.
6.3 Ao identificar indício de transporte de itens ilícitos, o Condutor Autônomo pode interromper o Serviço e comunicar a Plataforma.

7. PROTEÇÃO DE DADOS E DISPOSIÇÕES FINAIS
7.1 O tratamento de dados pessoais observa a LGPD (Lei 13.709/2018); os dados destinam-se à operação logística e ao pagamento.
7.2 O Condutor Autônomo mantém sigilo sobre dados de compradores e Sellers a que tiver acesso, usando-os apenas para a execução da entrega.
7.3 Estes Termos podem ser atualizados; a versão vigente é registrada no momento do aceite. Fica eleito o foro do domicílio do Condutor Autônomo para dirimir controvérsias.$TERMOS$
),
(
  'termos-afiliado-vendas',
  'Termos de Serviço — Afiliado de Vendas',
  $TERMOS$TERMOS DE SERVIÇO — AFILIADO DE VENDAS (DIVULGAÇÃO)
Indústria 24h — última atualização: 17/07/2026

1. OBJETO E ACEITE
1.1 Estes Termos regem a atuação do Afiliado de Vendas ("Afiliado"), que divulga produtos de vendedores ("Sellers") da plataforma Indústria 24h ("Plataforma") e recebe comissão pelas vendas concretizadas por sua indicação.
1.2 O aceite é eletrônico e voluntário. Ao marcar a caixa de aceite e solicitar a afiliação, o Afiliado declara que leu e concorda com estes Termos e com os Termos gerais da Plataforma.
1.3 Não há vínculo empregatício, societário ou de exclusividade. O Afiliado atua por conta própria.

2. COMISSÃO
2.1 A comissão corresponde ao percentual definido para o produto ou loja, calculado sobre o valor da venda atribuída ao identificador único do Afiliado.
2.2 A comissão é devida somente quando a venda é concretizada e efetivamente paga, e não é cancelada, estornada ou devolvida.
2.3 Em caso de cancelamento, estorno, devolução ou chargeback, a comissão correspondente não é devida e, se já repassada, será estornada ou compensada em repasses futuros.

3. PAGAMENTO E OBRIGAÇÕES FISCAIS
3.1 O repasse da comissão é efetuado via PIX, conforme o ciclo de pagamento da Plataforma.
3.2 O Afiliado é responsável por seus tributos e, quando PJ ou MEI, pela emissão de documento fiscal correspondente à comissão recebida.

4. CONDUTA E PROIBIÇÕES
4.1 É vedado ao Afiliado: praticar spam ou comunicação não solicitada; adquirir produtos por meio do próprio link com o fim de gerar comissão; usar indevidamente marcas da Plataforma ou dos Sellers, inclusive em anúncios pagos que utilizem tais marcas como palavra-chave; e fazer promessas ou declarações em nome da Plataforma ou dos Sellers.
4.2 A violação destas regras autoriza a suspensão imediata da afiliação e o cancelamento das comissões associadas a condutas irregulares.

5. INEXISTÊNCIA DE GARANTIA
5.1 O aceite não garante volume de vendas nem ganhos mínimos. A Plataforma e os Sellers podem, a seu critério, aprovar, suspender ou encerrar afiliações.

6. PROTEÇÃO DE DADOS E DISPOSIÇÕES FINAIS
6.1 O tratamento de dados pessoais observa a LGPD (Lei 13.709/2018).
6.2 Estes Termos podem ser atualizados; a versão vigente é registrada no momento do aceite. Fica eleito o foro do domicílio do Afiliado para dirimir controvérsias.$TERMOS$
)
on conflict (slug) do update
  set titulo = excluded.titulo,
      conteudo_rich = excluded.conteudo_rich,
      atualizado_em = now();
