# PRD — Parceiro Logístico

## Problema
A plataforma precisa de executores físicos de entrega (motorista/transportadora avulsa), cadastrados e vinculados a um afiliado logístico, para atender as corridas geradas no checkout.

## Escopo
Rotas `/parceiro` (dashboard) e `/parceiro/cadastro` (onboarding).

Cadastro (`/parceiro/cadastro`):
- Dados pessoais/empresa, CPF/CNPJ, CNH (se aplicável), placa/veículo, tipo de veículo (moto/carro/utilitário — define capacidade de carga).
- Dados PIX para repasse.
- Região de atuação (CEP/raio ou lista de bairros).
- Vínculo opcional a um `afiliado_logistica_id` (via código de convite do afiliado).
- Status: `pendente_aprovacao` → `aprovado` → `ativo`/`inativo`.

Dashboard (`/parceiro`):
- Toggle de disponibilidade (online/offline).
- Lista de corridas disponíveis para aceite (na sua região, respeitando o vínculo com afiliado quando existir).
- Histórico de corridas e extrato de repasse.

## Regras de negócio
1. Parceiro só recebe corridas roteadas ao seu afiliado ou ao pool geral se estiver `ativo` e `online`.
2. Recusa de corrida não penaliza (v1) — sem SLA de aceite ainda definido, mas o sistema precisa registrar tempo de resposta para futura pontuação/score.
3. Repasse liberado só após status `entregue` confirmado (ver PRD Corridas).

## Fora de escopo (v1)
- Roteirização multi-parada (uma corrida = uma entrega ponto a ponto).
- Score/gamificação de parceiro.

## Dependências
- PRD Afiliado Logística (vínculo e comissão).
- PRD Corridas/Despacho (matching e status).
