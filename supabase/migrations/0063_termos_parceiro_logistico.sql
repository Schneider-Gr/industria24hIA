-- Aceite de termos pelo parceiro logístico (motorista / transportadora).
--
-- Fecha uma inconsistência de compliance do próprio projeto: afiliados de
-- logística e de vendas ganharam termos + carimbo de aceite na 0060, e o
-- mercado futuro na 0061/0062, mas `parceiros_logisticos` (0039) — o perfil que
-- dirige, transporta mercadoria de terceiro e recebe repasse PIX, ou seja, o de
-- maior exposição a risco trabalhista e a extravio de carga — seguia sem
-- nenhum documento aceito.
--
-- Mesmo padrão da 0060: colunas nullable (cadastros históricos ficam sem aceite,
-- sem quebrar CHECK/RLS existentes) e seed idempotente do texto no CMS, editável
-- depois em /admin/paginas e renderizado pela rota pública /termos/[slug].

alter table public.parceiros_logisticos
  add column if not exists termos_aceitos_em timestamptz,
  add column if not exists termos_versao     text;

insert into public.paginas_cms (slug, titulo, conteudo_rich) values
(
  'termos-parceiro-logistico',
  'Termos de Serviço — Parceiro Logístico',
  $TERMOS$TERMOS DE SERVIÇO — PARCEIRO LOGÍSTICO (MOTORISTA E TRANSPORTADORA)
Indústria 24h — última atualização: 20/07/2026

1. OBJETO E ACEITE
1.1 Estes Termos regem o credenciamento e a atuação do Parceiro Logístico ("Parceiro") — motorista autônomo com frota própria ou agregada, ou transportadora — que executa coleta, transporte e entrega de mercadorias ("Serviços") dos vendedores ("Sellers") anunciantes da plataforma Indústria 24h ("Plataforma").
1.2 O aceite é eletrônico e voluntário. Ao marcar a caixa de aceite e enviar o cadastro, o Parceiro declara que leu, compreendeu e concorda com estes Termos, com os Termos gerais de uso da Plataforma e com as condições do provedor de pagamentos.
1.3 A versão do documento vigente no momento do aceite é registrada junto ao cadastro do Parceiro.

2. PARTES INDEPENDENTES
2.1 Não há relação de emprego, subordinação, habitualidade, exclusividade, sociedade, agência ou joint venture entre o Parceiro e a Plataforma ou os Sellers. O Parceiro é profissional autônomo ou pessoa jurídica, atua por conta própria e assume os riscos de sua atividade.
2.2 O Parceiro escolhe livremente os dias, horários e regiões em que se disponibiliza, podendo aceitar ou recusar qualquer corrida ou rota ofertada, sem penalidade, e determina a forma mais eficiente e segura de executar a entrega, respeitada a legislação de trânsito, transporte e segurança.
2.3 O Parceiro pode encerrar seu credenciamento a qualquer tempo, a seu exclusivo critério.

3. CREDENCIAMENTO, REQUISITOS E DOCUMENTAÇÃO
3.1 O cadastro do Parceiro passa por aprovação da Plataforma. A aprovação é discricionária e não é automática pelo simples preenchimento dos requisitos.
3.2 O Parceiro deve manter, durante todo o credenciamento: inscrição como PJ ou MEI com CNAE compatível com transporte/entrega de mercadorias; CNH válida e compatível com o veículo; documento do veículo (CRLV) regular; veículo em condições de uso; e emitir documento fiscal do serviço quando exigido.
3.3 O Parceiro é o único responsável pela veracidade dos dados cadastrais, incluindo capacidade declarada, área de atuação e chave PIX, e pela manutenção de suas licenças e autorizações.
3.4 A Plataforma pode auditar a qualquer tempo a documentação e os indicadores de desempenho do Parceiro, e solicitar informações e acessos necessários a essa verificação.

4. REMUNERAÇÃO E REPASSE
4.1 A remuneração é definida por corrida ou rota e exibida ao Parceiro ANTES do aceite. Ao aceitar, o Parceiro concorda com o valor apresentado.
4.2 O repasse é efetuado via PIX, na chave cadastrada pelo Parceiro, conforme o ciclo de pagamento da Plataforma. A troca da chave PIX reinicia a carência de confirmação.
4.3 São de exclusiva responsabilidade do Parceiro todos os custos da atividade, incluindo combustível, manutenção, seguros, tributos, encargos trabalhistas e previdenciários de seus próprios colaboradores e demais despesas.

5. OBRIGAÇÕES E PROIBIÇÕES
5.1 O Parceiro compromete-se a: executar os Serviços conforme as políticas da Plataforma e a legislação aplicável; manter atualizado o status das entregas nos painéis da Plataforma; registrar comprovação de entrega quando solicitada; e responder às pesquisas de satisfação nos prazos estabelecidos.
5.2 É vedado ao Parceiro: utilizar as marcas, logotipos ou nome comercial da Plataforma ou dos Sellers sem autorização prévia e por escrito; fazer promessas ou declarações em nome da Plataforma ou dos Sellers; abordar comercialmente os compradores por fora da Plataforma; subcontratar a execução da entrega sem comunicação prévia; e utilizar os dados obtidos em razão dos Serviços para qualquer finalidade alheia à entrega.
5.3 A violação desta cláusula autoriza a suspensão imediata do credenciamento, sem prejuízo das medidas legais cabíveis.

6. DESEMPENHO, SUSPENSÃO E DESCREDENCIAMENTO
6.1 A Plataforma pode avaliar periodicamente o Parceiro por indicadores de desempenho, incluindo, entre outros, nota média recebida, cumprimento de prazos, taxa de ocorrências e conformidade documental.
6.2 O não cumprimento dos critérios pode resultar em redução de ofertas, suspensão ou descredenciamento, com ou sem justa causa, sem que isso gere direito adquirido, expectativa de continuidade ou indenização.
6.3 O aceite destes Termos não garante volume mínimo de corridas, prioridade na distribuição ou continuidade de ofertas. A oferta depende de demanda, região e capacidade do veículo.

7. MERCADORIAS E RESPONSABILIDADE
7.1 A mercadoria pertence ao Seller; a Plataforma não é sua proprietária nem responsável pelo seu conteúdo. O Parceiro não tem direito de retenção sobre a mercadoria.
7.2 O Parceiro responde por extravio ou avaria decorrentes de dolo ou culpa na execução do Serviço, conforme a legislação aplicável.
7.3 Ao identificar indício de transporte de itens ilícitos, o Parceiro pode interromper o Serviço e deve comunicar a Plataforma.
7.4 O Parceiro isenta a Plataforma de qualquer ação administrativa ou judicial resultante da execução dos Serviços por ele prestados, inclusive reclamações de seus próprios colaboradores ou subcontratados.

8. CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
8.1 O Parceiro mantém sigilo sobre dados de compradores, Sellers e da operação a que tiver acesso, usando-os estritamente para a execução da entrega. A obrigação de sigilo subsiste após o término do credenciamento.
8.2 O tratamento de dados pessoais observa a LGPD (Lei 13.709/2018). A Plataforma atua como controladora dos dados tratados no âmbito do credenciamento e o Parceiro atua como operador, tratando os dados conforme as instruções da Plataforma.
8.3 O Parceiro adotará medidas técnicas e organizacionais adequadas para proteger tais dados contra perda, acesso ou tratamento não autorizados, e comunicará a Plataforma sobre qualquer incidente.
8.4 É vedado ao Parceiro comunicar, transferir ou ceder dados pessoais a terceiros sem consentimento prévio, expresso e por escrito.

9. DISPOSIÇÕES FINAIS
9.1 Estes Termos podem ser atualizados; alterações entram em vigor 10 (dez) dias após a divulgação nos canais oficiais da Plataforma. A continuidade da atuação após a divulgação implica aceitação das novas condições; em caso de discordância, o Parceiro pode solicitar o encerramento do credenciamento, cumpridas as obrigações pendentes.
9.2 A versão vigente é registrada no momento do aceite.
9.3 Fica eleito o foro do domicílio do Parceiro para dirimir controvérsias.$TERMOS$
)
on conflict (slug) do update
  set titulo = excluded.titulo,
      conteudo_rich = excluded.conteudo_rich,
      atualizado_em = now();
