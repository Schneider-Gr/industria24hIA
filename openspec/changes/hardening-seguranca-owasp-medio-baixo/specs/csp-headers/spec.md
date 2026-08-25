## Purpose

Fechar a lacuna deixada deliberadamente em `next.config.ts` (comentário `ponytail:`) onde HSTS,
X-Frame-Options e demais headers de segurança já existem, mas Content-Security-Policy nunca foi
adicionado por falta de inventário de origens.

## ADDED Requirements

### Requirement: App envia Content-Security-Policy restritiva
O sistema SHALL enviar um header `Content-Security-Policy` em todas as rotas, permitindo carregar
script/style/imagem/conexão apenas das origens efetivamente usadas pelo app (self, Supabase,
Sentry, e demais integrações confirmadas no inventário), e bloqueando origens não listadas.

#### Scenario: Página carrega recurso de origem permitida
- **WHEN** o navegador carrega um script ou faz uma chamada `fetch` para uma origem do inventário
  (ex.: o projeto Supabase configurado)
- **THEN** o recurso carrega normalmente, sem violação de CSP

#### Scenario: Página tenta carregar recurso de origem não listada
- **WHEN** um script malicioso injetado tenta carregar um recurso de uma origem fora do inventário
  permitido
- **THEN** o navegador bloqueia o carregamento por violação de CSP
