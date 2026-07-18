# industria24-mcp-server

Servidor **MCP (Model Context Protocol) HTTP** para integração de terceiros com o
marketplace **industria24.com.br**. Qualquer host MCP (Claude Desktop, Claude Code,
n8n, agentes próprios) conecta com um token e:

- **Lê** o catálogo, lojas, pedidos, entregas, categorias etc. (escopo `read`).
- **Edita** catálogo da própria loja e status de pedidos/entregas (escopo `write`,
  emitido só após aprovação do admin) — **habilitado gradualmente**.

O `service_role` do Supabase fica **só no servidor**. O parceiro nunca recebe chave
do banco: ele só tem o token `i24_` dele, validado contra a tabela `api_keys`.

## Arquitetura

```
parceiro (host MCP) ──Bearer i24_xxx──▶ mcp.industria24.com.br /mcp
                                             │ valida token (api_validar_token)
                                             │ service_role ▼
                                        Supabase (tiwdqgyeyvceaiqqwitc)
```

- Transporte: **Streamable HTTP stateless** (JSON). Cada request carrega o Bearer.
- Auth: `Authorization: Bearer i24_...` → SHA-256 → RPC `api_validar_token`.
- Escopos: `read` (leitura) e `write` (edição, inclui leitura). Escrita só se o token
  é `write` **e** o módulo está ligado em `MCP_WRITE_ENABLED`.
- Ownership: toda escrita é restrita ao `loja_id` do token. Campos financeiros
  (repasse, comissão, chave PIX, valor do pedido) ficam fora e são bloqueados pelos
  guards das migrations 0012/0031/0035.
- Auditoria: toda escrita grava em `api_audit_log`.

## Setup

```bash
npm install
npm run build
cp .env.example .env   # preencher SUPABASE_SERVICE_ROLE_KEY
npm start              # sobe em http://0.0.0.0:3333/mcp
```

Requer a migration `0059_api_keys_mcp.sql` aplicada.

### Variáveis (servidor)

| Var | Papel |
|-----|-------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | acesso ao banco (nunca sai para o parceiro) |
| `PORT` / `HOST` | bind do HTTP (default `3333` / `0.0.0.0`) |
| `MCP_WRITE_ENABLED` | módulos de escrita ligados: `catalogo`, `pedidos` (vazio = tudo read-only) |
| `ALLOWED_HOSTS` | allowlist de Origin (anti DNS-rebinding) |

## Emitir uma chave para um parceiro (admin)

```bash
# 1. cadastrar o parceiro (SQL): insert into api_partners (nome, contato) values (...);
# 2. gerar a chave read:
node scripts/emitir-token.mjs read <loja_id> --partner <partner_id>
# 3. gerar a chave write (só após aprovar o parceiro):
node scripts/emitir-token.mjs write <loja_id> --partner <partner_id>
```

O script imprime o token (entregar ao parceiro **uma** vez) e o SQL de `insert`.
O banco guarda só o hash — token perdido = revogar e reemitir.

Revogar: `update api_keys set revogada_em = now() where id = '<key_id>';`

## Tools

**Leitura (escopo `read`)**
- `industria24_listar_registros(tabela, limite, offset, filtro_coluna?, filtro_valor?)`
- `industria24_buscar_registro(tabela, id)`
- `industria24_buscar_produtos(termo, limite)`

**Escrita (escopo `write`, restrita à loja do token)**
- `industria24_atualizar_produto(id, nome?, descricao?, valor?, sku?)` — módulo `catalogo`
- `industria24_atualizar_estoque(id, estoque_atual)` — módulo `catalogo`
- `industria24_atualizar_status_pedido(id, status_pedido)` — módulo `pedidos`
- `industria24_atualizar_entrega(linha_item_id, status?, rastreio?)` — módulo `pedidos`

## Registrar no cliente MCP

Claude Desktop (`claude_desktop_config.json`) ou Claude Code — servidor HTTP remoto:

```json
{
  "mcpServers": {
    "industria24": {
      "type": "http",
      "url": "https://mcp.industria24.com.br/mcp",
      "headers": { "Authorization": "Bearer i24_read_SEU_TOKEN" }
    }
  }
}
```

## Testar localmente

```bash
node ./node_modules/@modelcontextprotocol/inspector/cli.js
# conectar em http://localhost:3333/mcp com header Authorization: Bearer i24_...
```

## Segurança

- Nunca commitar tokens nem `SUPABASE_SERVICE_ROLE_KEY`.
- Token vazado → revogar (`revogada_em`) e reemitir.
- Escrita nasce desligada; ligue módulo a módulo após QA.
