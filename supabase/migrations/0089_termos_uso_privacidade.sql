-- Termos de Uso gerais da Plataforma e Política de Privacidade (LGPD).
-- Seed idempotente em paginas_cms (migration 0008), mesmo padrão de
-- 0060/0061/0063: fonte única é esta migration, editável depois pelo admin
-- em /admin/paginas. Rota pública: /termos/[slug].
-- Cobrem o comprador e o site em geral (0060/0061/0063 já cobrem afiliados,
-- venda futura e parceiro logístico, que continuam com seus documentos
-- próprios além destes termos gerais).

insert into public.paginas_cms (slug, titulo, conteudo_rich) values
(
  'termos-de-uso',
  'Termos de Uso — Indústria 24h',
  $TERMOS$TERMOS DE USO — INDÚSTRIA 24h
Indústria 24h — última atualização: 28/07/2026

1. OBJETO
1.1 A Indústria 24h ("Plataforma") é um marketplace que conecta compradores a lojas vendedoras independentes ("Sellers") para a compra e venda de produtos industriais. A Plataforma atua como intermediária tecnológica e de pagamentos, não sendo fabricante, proprietária ou vendedora dos produtos anunciados, exceto quando expressamente indicado.
1.2 Ao acessar ou usar a Plataforma, o usuário ("Usuário") declara que leu, compreendeu e concorda com estes Termos e com a Política de Privacidade.

2. CADASTRO E CONTA
2.1 O cadastro exige informações verdadeiras, completas e atualizadas. O Usuário é responsável pela guarda de sua senha e por toda atividade realizada em sua conta.
2.2 A Plataforma pode suspender ou encerrar contas que violem estes Termos, a lei ou apresentem indício de fraude, sem prejuízo de outras medidas cabíveis.
2.3 Menores de idade só podem usar a Plataforma sob supervisão e responsabilidade de seus representantes legais.

3. COMPRA E VENDA ENTRE USUÁRIO E SELLER
3.1 O contrato de compra e venda é celebrado diretamente entre o comprador e o Seller. A Plataforma disponibiliza o ambiente, o processamento de pagamento e o suporte, mas não responde por vícios do produto, atraso de fabricação ou descumprimento contratual atribuível ao Seller, sem prejuízo da responsabilidade solidária prevista no Código de Defesa do Consumidor quando aplicável.
3.2 Preços, prazos de entrega, condições de frete e políticas de troca/devolução são definidos por cada Seller e exibidos no anúncio ou no checkout antes da confirmação da compra.
3.3 Direito de arrependimento: nas compras realizadas fora do estabelecimento físico do Seller, o consumidor pode exercer o direito de arrependimento em até 7 (sete) dias corridos a contar do recebimento, conforme art. 49 do CDC.
3.4 Cancelamentos, estornos e reembolsos seguem o fluxo de pagamento processado pelo gateway (Asaas); prazos de estorno dependem do meio de pagamento utilizado.

4. PAGAMENTOS
4.1 Os pagamentos são processados por gateway de pagamento parceiro (Asaas). A Plataforma não armazena dados completos de cartão de crédito.
4.2 O repasse ao Seller ocorre conforme o ciclo de pagamento da Plataforma, descontadas eventuais comissões e taxas aplicáveis, informadas previamente ao Seller.

5. CONDUTA DO USUÁRIO
5.1 É vedado: usar a Plataforma para fins ilícitos; publicar conteúdo falso, ofensivo ou que viole direitos de terceiros; tentar burlar mecanismos de segurança, pagamento ou taxas; e praticar qualquer forma de fraude, inclusive contra outros Usuários ou Sellers.
5.2 A violação destas regras autoriza a suspensão ou exclusão da conta, sem prejuízo de responsabilização civil e criminal cabível.

6. PROPRIEDADE INTELECTUAL
6.1 Marca, layout, software e demais elementos da Plataforma pertencem à Indústria 24h ou a seus licenciadores, sendo vedada a reprodução sem autorização.
6.2 Fotos, descrições e marcas dos produtos pertencem aos respectivos Sellers ou fabricantes, que respondem por sua veracidade e regularidade.

7. LIMITAÇÃO DE RESPONSABILIDADE
7.1 A Plataforma envida esforços para manter o serviço disponível e seguro, mas não garante disponibilidade ininterrupta e não responde por danos indiretos decorrentes de indisponibilidade, falha de terceiros (gateway, transportadoras) ou uso indevido por outros Usuários.
7.2 Nada nestes Termos exclui responsabilidades que não podem ser limitadas por lei, incluindo as previstas no Código de Defesa do Consumidor.

8. ALTERAÇÕES E DISPOSIÇÕES FINAIS
8.1 Estes Termos podem ser atualizados a qualquer tempo; a versão vigente é a publicada nesta página. O uso continuado da Plataforma após alteração implica concordância com o novo texto.
8.2 Dúvidas sobre estes Termos podem ser enviadas para contato@industria24.com.br. Fica eleito o foro do domicílio do consumidor para dirimir controvérsias, conforme o CDC.$TERMOS$
),
(
  'politica-de-privacidade',
  'Política de Privacidade — Indústria 24h',
  $TERMOS$POLÍTICA DE PRIVACIDADE — INDÚSTRIA 24h
Indústria 24h — última atualização: 28/07/2026

Esta Política descreve como a Indústria 24h ("Plataforma", "nós"), na qualidade de controladora de dados, trata dados pessoais de compradores, Sellers, afiliados e demais usuários, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).

1. DADOS QUE COLETAMOS
1.1 Dados de cadastro: nome, e-mail, telefone, CPF/CNPJ, endereço.
1.2 Dados de transação: histórico de pedidos, valores, produtos, dados de entrega.
1.3 Dados de pagamento: processados diretamente pelo gateway de pagamento (Asaas); a Plataforma não armazena número completo de cartão de crédito.
1.4 Dados de navegação: endereço IP, identificadores de dispositivo, páginas visitadas e cookies, para fins de segurança, funcionamento do carrinho e melhoria da experiência.
1.5 Dados de localização: CEP e endereço informados para cálculo de frete e disponibilidade regional, e coordenadas de percurso quando o Usuário atua como afiliado logístico.

2. FINALIDADE DO TRATAMENTO
2.1 Viabilizar cadastro, compra, venda, pagamento, entrega e atendimento.
2.2 Prevenir fraude e garantir a segurança da Plataforma e dos Usuários.
2.3 Cumprir obrigações legais e regulatórias, inclusive fiscais.
2.4 Enviar comunicações transacionais (confirmação de pedido, status de entrega) e, mediante consentimento, comunicações de marketing.
2.5 Calcular comissões de afiliados e repasses a Sellers.

3. BASES LEGAIS
3.1 Execução de contrato (compra, venda, afiliação); cumprimento de obrigação legal (fiscal, CDC); legítimo interesse (prevenção a fraude, segurança); e consentimento (marketing, quando aplicável).

4. COMPARTILHAMENTO DE DADOS
4.1 Dados são compartilhados com: o Seller da compra (dados necessários para processar e entregar o pedido); gateway de pagamento (Asaas), para processar cobranças e repasses; transportadoras e afiliados logísticos, para viabilizar a entrega; e autoridades públicas, quando exigido por lei ou ordem judicial.
4.2 A Plataforma não vende dados pessoais a terceiros.

5. RETENÇÃO E DESCARTE
5.1 Dados são mantidos pelo tempo necessário às finalidades descritas, aos prazos legais (fiscal, cível) e à defesa em processos judiciais ou administrativos, sendo descartados ou anonimizados após esses prazos.

6. DIREITOS DO TITULAR
6.1 Nos termos da LGPD, o titular pode solicitar: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento.
6.2 Solicitações podem ser enviadas para contato@industria24.com.br. A Plataforma responderá em prazo razoável, observados os limites legais para preservação de dados exigidos por obrigação fiscal ou regulatória.

7. COOKIES
7.1 Usamos cookies essenciais ao funcionamento do site (sessão, carrinho, segurança) e, quando habilitados, cookies de análise para entender o uso da Plataforma. O Usuário pode gerenciar cookies nas configurações do navegador.

8. SEGURANÇA
8.1 Adotamos medidas técnicas e administrativas razoáveis para proteger os dados pessoais contra acesso não autorizado, perda, alteração ou destruição. Nenhum sistema é totalmente livre de risco; incidentes de segurança relevantes serão comunicados conforme exigido pela LGPD.

9. ALTERAÇÕES
9.1 Esta Política pode ser atualizada; a versão vigente é a publicada nesta página. Alterações relevantes serão comunicadas por aviso na Plataforma ou por e-mail.

10. CONTATO
10.1 Dúvidas, solicitações ou reclamações sobre privacidade podem ser enviadas para contato@industria24.com.br.$TERMOS$
)
on conflict (slug) do update
  set titulo = excluded.titulo,
      conteudo_rich = excluded.conteudo_rich,
      atualizado_em = now();
