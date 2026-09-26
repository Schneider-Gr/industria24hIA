## 1. Cálculo (teste primeiro, `src/lib/logistica-parceiro/simulador-km.ts`)

- [ ] 1.1 Bandas: `classePorPeso`, `validarBandas`, colunas da 0201 ↔ bandas
- [ ] 1.2 `freteRegiao`: max(tarifa mínima, km de estrada × R$/km) + balsa só de ida; km de barco fora do km
- [ ] 1.3 Quantidade viável (≤ 20%) e ideal (≤ 10%) recalculando por quantidade; faixas separadas quando a viabilidade fura na troca de veículo (caso do cimento: "6 un. (carro) ou 20 un.")
- [ ] 1.4 Grade quantidade × R$/km por região
- [ ] 1.5 Remover ajudante do cálculo e da tela

## 2. Rota e travessia

- [ ] 2.1 `calcularTrajeto` devolve trechos `FERRY` (nome e km) além da distância
- [ ] 2.2 Status da travessia por região: `nenhuma`, `detectada`, `sem_rota`, `manual`
- [ ] 2.3 Informar travessia manual (km de estrada + linha da tabela) e "entrega a combinar" (PRD 050)

## 3. Tabela de travessias

- [ ] 3.1 Migration: tabela `travessias` com RLS (select autenticado, escrita admin); checar colisão de número antes de criar e antes do push
- [ ] 3.2 Carga inicial: Ceasa–Careiro (ANTAQ, Chamada Pública 1/2026, R$ 30,67/veículo equivalente; fatores moto 0,5, pickup 1,5, caminhão 3 marcados como estimativa) e Porto de Manaus (operador: carro R$ 60, pickup R$ 72)
- [ ] 3.3 Testar a migration em begin/rollback em prod antes de aplicar; aplicar com OK da dona
- [ ] 3.4 Tela do admin para editar valor, fator, fonte e data

## 4. Tela do avião

- [ ] 4.1 Bandas + quantidade mínima (controlados), Salvar, Desligar, Fechar, ✕
- [ ] 4.2 Resultado por região com custo decomposto, % e quantidade viável/ideal; aviso quando a quantidade atual não fecha em nenhuma região
- [ ] 4.3 Grade quantidade × R$/km com clique que preenche banda e quantidade
- [ ] 4.4 Avisos de travessia (detectada, sem rota) com fonte e data da tabela

## 5. Fechamento

- [ ] 5.1 PRD 054: US05 e decisão 8 com o desenho final (bandas + regiões + travessia só de ida, sem ajudante)
- [ ] 5.2 Ver no navegador com a conta de teste (preview ou local) antes do merge
- [ ] 5.3 Mergear o #793 antes (quantidade mínima × estoque crítico)
- [ ] 5.4 Fechar #803 e #802 como substituídos
