---
name: mercado-envios-regras
description: Regras oficiais do Mercado Envios (Mercado Livre) sobre entregadores, repasse e termos de serviço — modelo Envios Extra (Condutor Autônomo), Flex e Pontos Flex, mais a estrutura fiscal/contábil de repasse marketplace × seller × afiliado. Use ao modelar repasse a entregadores/afiliados, redigir termos de serviço de logística num marketplace, ou responder como o ML paga quem entrega. Fonte primária confirmada nas páginas logadas do ML (fetch de bot é bloqueado 403 — abrir via browser-harness na aba andreiaschneider@gmail.com).
---

# Regras Mercado Envios — entregadores, repasse e fiscal

Apurado 17/07/2026 direto das páginas oficiais do ML (WebFetch dá 403 por bloqueio de bot — ler via browser-harness na aba logada). Valores de mercado são categoria (b), não parecer fiscal. Não substitui contador/advogado.

## Três modalidades distintas de "entregador" (não confundir)

1. **Envios Flex** — quem entrega é o **próprio vendedor** (ou alguém que ele contrata). O ML paga um **subsídio/bônus ao vendedor** por entrega same-day na região Flex; o repasse a quem faz a entrega física é acordo privado do vendedor, o ML não entra.
2. **Envios Extra** — **motorista parceiro autônomo (Condutor Autônomo PJ/MEI)** faz **rotas/percursos**. É aqui que o ML paga o entregador. Ver detalhe abaixo.
3. **Pontos Flex** — comerciante vira ponto de coleta/retirada; recebe **~R$0,75–1,50 por pacote** processado.

## Envios Extra — modelo de repasse (o relevante para copiar)

- **Tarifa por percurso, não por pacote nem comissão %.** Cada rota agrupa vários pacotes; o motorista **vê valor + duração antes de aceitar** e pode recusar.
- Teto de marketing: **até ~R$240/dia** (varia cidade/rota/veículo). Estimativas de mercado: percurso curto 3-4h R$160-220; longo 6-8h R$240-380; bônus domingo/feriado R$30-60.
- **Pagamento semanal no Mercado Pago** (obrigatório): serviços seg→dom caem juntos **entre quarta e sexta da semana seguinte**. Dispensa conta bancária tradicional.
- **Sem garantia de volume** (cláusula 3.2): aceite não garante mínimo de entregas nem prioridade.
- **Todos os custos são do motorista** (2.4): combustível, encargos, impostos, DPVAT, multas. ML paga só a tarifa bruta.

## Termos de Serviço — Envios Extra

Doc oficial: **"Termos e Condições do Envios Extra"** — EBAZAR.COM.BR LTDA, CNPJ 03.007.331/0001-41, atualização 18/07/2025. URL: https://envios.mercadolivre.com.br/envios-extra/ajuda/18626

Cláusulas que afastam vínculo empregatício (esqueleto a copiar):
1. Adesão voluntária, aceite eletrônico; obriga aceitar T&C de ML, Mercado Pago e Envios.
2. **Autonomia total**: escolhe dias/horários, pode recusar qualquer oferta (1.4), sai a qualquer momento (1.5), decide a forma de entregar (2.2).
3. **Sem garantia**: ML pode rejeitar/suspender/cancelar acesso com ou sem justa causa, sem indenização (3.1).
4. **Mercadoria é do vendedor, não do ML**: ML isento de dano/conteúdo; condutor sem direito de retenção (4.x).

**Requisitos cadastro** (dois níveis):
- App Envios Extra: veículo ≤15 anos, CNH vigente, **CNPJ + MEI com CNAE de entregas** (4930-2/01, 4930-2/02, 5320-2/01, 5320-2/02, 5229-0/99), moto exige baú ≥80L, Android 5.0+.
- Motorista parceiro (transportadora): **TAC autônomo/PJ, RNTRC ativo, CNH com EAR, NF com CNPJ/MEI**.

Cidades: BH, Campinas, Curitiba, Floripa, Limeira, Salvador, São José dos Campos, SP, entre outras.

> O texto legal **não publica fórmula/percentual** de repasse — tarifa é dinâmica, calculada pelo ML, exibida por percurso no app. Não sai por documento nem por API.

## Estrutura fiscal/contábil — marketplace × seller × afiliado

Regra de ouro: **receita de cada parte = só a fatia que fica com ela.** Dinheiro que passa e é repassado NÃO é receita de quem intermedia (senão infla faturamento e estoura Simples).

Venda de R$100, comissão marketplace 10%, afiliado 5%:

| Ator | Emite | Sobre | Natureza |
|---|---|---|---|
| Seller | NF-e venda mercadoria ao comprador | R$100 (cheio) | Receita venda seller |
| Marketplace | NFS-e intermediação/comissão vs seller | R$10 | Receita serviço marketplace |
| Afiliado | NFS-e serviço (indicação/logística) | R$5 | Receita serviço afiliado |

- Seller fatura o valor cheio; ICMS e cliente são dele. Marketplace NÃO emite NF de mercadoria.
- Os R$90 repassados ao seller = **passivo "a repassar"**, transitam mas não são receita do marketplace.
- Comissão do afiliado: **Modelo A** (marketplace paga → NFS-e do afiliado vs marketplace → despesa comercial; mais comum) ou **Modelo B** (sai da comissão do seller → NFS-e vs seller).
- **PIX de repasse ≠ dispensa de NF.** Todo PIX precisa de documento fiscal de lastro: seller→NF-e própria; afiliado→NFS-e contra o pagador; comissão retida→NFS-e do marketplace vs seller.
- **Retenções**: PJ prestadora pode ter ISS retido + IRRF/PIS/COFINS/CSLL conforme porte. Afiliado/entregador **PF gera INSS/IRRF + risco de vínculo** → forçar **PJ/MEI**, como o ML faz no Condutor Autônomo.
- **Simples**: tributar só a comissão (Anexo III/V). GMV inteiro na receita bruta estoura o teto com dinheiro que não é seu.

## Ligações
Projeto Indústria 24h usa `/afiliado/logistica` (afiliado = operador logístico) + repasse PIX já implementado (PR #43). Ver memórias `industria24h-repasse-pix-decisao`, `industria24h-logistica-despacho-automatico-2026-07-13`, `project-mcp-mercado-envios`.
