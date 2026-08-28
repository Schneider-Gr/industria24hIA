## ADDED Requirements

### Requirement: Rate limiting compartilhado entre instâncias serverless
`checarLimite(chave, max, janelaMs)` DEVE aplicar o limite de forma consistente entre instâncias
concorrentes da Vercel quando `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estiverem
configuradas, usando `@upstash/ratelimit` com janela deslizante. Quando essas variáveis NÃO
estiverem configuradas, a função DEVE cair no contador em memória do processo, sem lançar erro,
para que ambientes local e de preview continuem funcionando. A assinatura passa a ser assíncrona
e todos os call sites DEVEM usar `await`.

#### Scenario: Produção com Upstash configurado
- **WHEN** duas instâncias serverless diferentes recebem requests da mesma chave dentro da janela
  e as env vars do Upstash estão setadas
- **THEN** o total de hits é contado no Redis compartilhado e o limite `max` vale para a soma das
  instâncias, não por instância

#### Scenario: Ambiente sem env vars do Upstash
- **WHEN** `checarLimite` é chamada sem `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
- **THEN** usa o contador em memória e nunca lança por falta de configuração

#### Scenario: Limite estourado
- **WHEN** a mesma chave excede `max` requests dentro de `janelaMs`
- **THEN** `checarLimite` resolve `false` e o call site rejeita a request (comportamento atual
  preservado)
