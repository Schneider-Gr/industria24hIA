## Purpose

Estender a instrumentação Langfuse já existente nos crews de IA (SEO, SDR, antifraude) para cobrir custo por chamada e taxa de alucinação/retry, hoje não medidos.

## ADDED Requirements

### Requirement: Registro de custo por chamada de agente
O sistema SHALL registrar o custo estimado (tokens de entrada/saída, custo em moeda) de cada chamada de LLM feita pelos crews de IA.

#### Scenario: Chamada de crew completa
- **WHEN** um crew (SEO, SDR ou antifraude) completa uma chamada de LLM
- **THEN** o sistema registra o custo associado à chamada, vinculado ao trace já existente no Langfuse

### Requirement: Registro de taxa de retry por falha de validação
O sistema SHALL registrar quando uma chamada de agente precisa de retry por falha de validação de saída (ex.: formato inesperado, resposta incompleta).

#### Scenario: Retry por saída inválida
- **WHEN** a saída de um agente falha na validação esperada e o sistema tenta novamente
- **THEN** o sistema registra o evento de retry, incluindo o motivo da falha de validação original

### Requirement: Sinalização de possível alucinação
O sistema SHALL registrar um sinal quando a saída de um agente divergir de forma verificável do dado de entrada esperado (ex.: SDR citando informação não presente no lead, antifraude classificando com confiança fora do intervalo esperado).

#### Scenario: Saída divergente do dado de entrada
- **WHEN** um agente produz uma saída que referencia informação ausente do contexto fornecido
- **THEN** o sistema registra o evento como possível alucinação, sem bloquear a execução do fluxo

### Requirement: Métricas agregadas consultáveis por crew
O sistema SHALL permitir consultar, por crew, o custo acumulado e a taxa de retry/alucinação num período.

#### Scenario: Consulta de métricas de um crew
- **WHEN** um operador consulta as métricas agregadas de um crew num intervalo de tempo
- **THEN** o sistema retorna custo total e taxa de retry/alucinação do período consultado
