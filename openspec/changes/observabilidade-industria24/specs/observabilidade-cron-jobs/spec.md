## Purpose

Garantir que toda execução de cron do Industria24h registre seu resultado (sucesso ou falha, com motivo), para que uma falha operacional nunca dependa da ausência notada de um efeito colateral esperado.

## ADDED Requirements

### Requirement: Registro de execução de cron
O sistema SHALL registrar, para toda execução de uma rota de cron, o timestamp, o resultado (sucesso ou falha) e, em caso de falha, o motivo.

#### Scenario: Execução bem-sucedida
- **WHEN** uma rota de cron completa sua ação de negócio sem erro
- **THEN** o sistema registra um evento de sucesso com timestamp da execução

#### Scenario: Falha de dependência externa
- **WHEN** uma rota de cron depende de um serviço externo (ex.: Prometheus remote_write, provedor de e-mail) e a chamada retorna erro
- **THEN** o sistema registra um evento de falha com o motivo específico da dependência, mesmo que a biblioteca cliente não lance exceção na falha

#### Scenario: Falha de lógica de negócio
- **WHEN** uma rota de cron é disparada mas a ação de negócio não completa por erro interno
- **THEN** o sistema registra um evento de falha distinto de uma falha de dependência externa

### Requirement: Checagem explícita de status em chamadas que não lançam exceção
O sistema SHALL checar explicitamente o status de retorno de qualquer chamada externa feita dentro de uma rota de cron cuja biblioteca não lança exceção em resposta de erro HTTP.

#### Scenario: Biblioteca retorna status de erro sem lançar exceção
- **WHEN** uma chamada a uma biblioteca como `prometheus-remote-write` retorna um objeto com `status` diferente de sucesso (ex.: 401, 500)
- **THEN** o código da rota trata esse retorno como falha e o registra, em vez de assumir sucesso pela ausência de exceção

### Requirement: Histórico de execução consultável
O sistema SHALL expor um histórico recente de execuções de cada cron, consultável sem acesso a log bruto da plataforma de deploy.

#### Scenario: Consulta do histórico de um cron
- **WHEN** um operador consulta o histórico de execução de um cron específico
- **THEN** o sistema retorna a lista de execuções recentes com timestamp e resultado de cada uma

#### Scenario: Cron sem execuções registradas
- **WHEN** um cron recém-criado ainda não teve nenhuma execução registrada
- **THEN** o histórico retorna estado vazio explícito, distinguível de erro de consulta

### Requirement: Distinção entre cron não disparado e cron que falhou
O sistema SHALL permitir distinguir a ausência de disparo de um cron no horário esperado de um cron que disparou e falhou durante a execução.

#### Scenario: Cron não disparado no horário esperado
- **WHEN** não existe registro de execução para um cron no dia em que ele deveria ter rodado
- **THEN** essa ausência é interpretável como possível falha de agendamento, não como sucesso silencioso
