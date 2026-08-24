## Purpose

Garantir que o gate de secret scanning do CI (`gitleaks-action`) tenha cobertura explícita para
os formatos de credencial que o stack do projeto realmente usa, não só o ruleset genérico.

## ADDED Requirements

### Requirement: Regras dedicadas para os segredos do stack
O `.gitleaks.toml` SHALL declarar uma regra própria para cada uma das credenciais usadas pelas
integrações do projeto: Asaas (`ASAAS_API_KEY`), LangSmith (`LANGSMITH_API_KEY`), WhatsApp/Meta
(`WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`), Resend (`RESEND_API_KEY`) e Supabase service role
(`SUPABASE_SERVICE_ROLE_KEY`), além de manter o ruleset default herdado.

#### Scenario: Valor de uma dessas credenciais aparece hardcoded em um commit
- **WHEN** um valor no formato de uma dessas 5 credenciais aparece em texto puro em um arquivo do
  diff de um PR
- **THEN** o job `secret-scan` falha e bloqueia o merge
