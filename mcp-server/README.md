# industria24h-mcp

Servidor MCP (stdio) para o Supabase do Industria24h. Qualquer host MCP (Claude Desktop, Claude Code, outro agente) pode conectar e ler `produtos`, `lojas`, `pedidos`, `linha_itens`, `entregas`, `vendas_futuras`, `promocoes_progressivas`, `afiliacoes`, `categorias`, `subcategorias`, `centros_distribuicao`.

## Setup

```
npm install
npm run build
cp .env.example .env   # preencher SUPABASE_SERVICE_ROLE_KEY
```

## Rodar

```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node dist/index.js
```

## Registrar em um cliente MCP (ex: Claude Desktop `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "industria24h": {
      "command": "node",
      "args": ["C:/Users/andre/Downloads/claude/Industria24IA/Industria24/web/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://tiwdqgyeyvceaiqqwitc.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

## Tools expostos

- `listar_registros(tabela, limite, offset, filtro_coluna?, filtro_valor?)` — leitura paginada de qualquer tabela suportada.
- `buscar_registro_por_id(tabela, id)`.
- `buscar_produtos(termo, limite)` — busca por nome.

Somente leitura. Escrita não foi implementada — adicionar quando um sistema externo precisar criar/atualizar pedidos ou produtos.
