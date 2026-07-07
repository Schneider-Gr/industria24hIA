# Privacy Rules — Industria24h

> **Fonte parcialmente real:** a classificação Público/Privado de cada Data
> Type (quais têm Privacy Rules aplicadas) foi confirmada diretamente no
> editor Bubble — ver lista completa em `database.md`. O **conteúdo
> exato** de cada Privacy Rule (a condição específica de quem vê o quê)
> ainda não foi extraído — isso é configuração dentro de cada tipo,
> não visível na navegação feita até agora. As tabelas abaixo continuam
> sendo **inferência**, agora com a vantagem de partir da lista real de
> tipos em vez de nomes aproximados.

## O que já é fato confirmado

- Tipos **Públicos** (sem Privacy Rule restritiva): ver lista completa em `database.md` — inclui `marketplace`, `FaixaDeCEP`, `venda.futura`, mas também tipos potencialmente sensíveis como `credenciaisAPIs` (⚠️ revisar).
- Tipos **Privados** (com Privacy Rule aplicada): inclui `User`, `Produto_ecommerce`, `Loja_ecommerce`, `LinhaItem`, `Cards`, e todo o módulo Consignado.
- Todos os 70+ tipos estão expostos na Data API (ver `api.md`) — a Privacy Rule é o único controle de acesso hoje.

## O que ainda é inferência (precisa validação)

Convenção: **Quem vê / Quem edita / Quem exclui / Quem acessa via API**.

### User (Privado — confirmado)

| Ação | Regra proposta |
|---|---|
| Quem vê | O próprio usuário vê seus campos completos. `superadm` vê todos |
| Quem edita | O próprio usuário; papéis/flags só editáveis por `superadm` |
| Quem exclui | `superadm` ou o próprio usuário |
| Quem acessa via API | Próprio usuário autenticado + `superadm` |

### Produto_ecommerce (Privado — confirmado)

| Ação | Regra proposta |
|---|---|
| Quem vê | Público se aprovado; lojista dono + admin veem mesmo não aprovado |
| Quem edita | Lojista dono + admin |
| Quem exclui | Lojista dono (soft) + admin |

### Loja_ecommerce (Privado — confirmado)

| Ação | Regra proposta |
|---|---|
| Quem vê | Dados básicos públicos; dados sensíveis (CNPJ, chave PIX) só dono + admin |
| Quem edita | Lojista dono + admin |
| Quem exclui | Admin |

### LinhaItem (Privado — confirmado)

| Ação | Regra proposta |
|---|---|
| Quem vê | Cliente do pedido, lojista da loja, admin, afiliado (se aplicável) |
| Quem edita | Sistema (workflows) + admin; lojista edita status de envio |
| Quem exclui | Admin |

### Cards / CardTime (Privado — confirmado, **alta prioridade**)

| Ação | Regra proposta |
|---|---|
| Quem vê | Só o próprio usuário dono do cartão + admin (se for referência/token) |
| Quem edita | Só o próprio usuário |
| Quem exclui | Só o próprio usuário |
| ⚠️ Ação obrigatória | Confirmar se armazena dados brutos de cartão (PAN/CVV) — se sim, é violação de PCI-DSS e deve ser corrigido **antes** de qualquer migração, substituindo por tokenização via gateway (Asaas/PagBank) |

### credenciaisAPIs (Público — confirmado, **contraditório e a revisar**)

| Ação | Regra proposta |
|---|---|
| Quem vê | Deveria ser **restrito a `superadm`**, nunca público |
| ⚠️ Ação obrigatória | Confirmar no editor Bubble se este tipo realmente não tem Privacy Rule — se estiver mesmo público, isso é uma exposição de credenciais e deve ser corrigido imediatamente no Bubble atual, independente da migração |

### Módulo Consignado (majoritariamente Privado — confirmado)

| Ação | Regra proposta |
|---|---|
| Quem vê | `Consig.Promotor` vê só seu próprio PDV/estoque; `superadm` vê tudo |
| Quem edita | Promotor edita dados do seu PDV; admin edita tudo |
| Quem exclui | Admin |
| Pendência | Ver `consignado-module.md` — módulo inteiro carece de regras específicas |

## Papéis (roles) identificados

| Papel | Origem | Escopo típico |
|---|---|---|
| `superadm` | `User` | Acesso total |
| `promotoradm` | `User` | Gestão de módulo Consignado/PDV |
| `lojista` | `User` | Gestão de `Loja_ecommerce` própria |
| `afiliado` | `User` | Visualização de comissões próprias |
| Cliente | `User` (sem flag) | Compra, pedidos e perfil próprios |

## Como validar e completar este documento

1. No editor Bubble, abrir **Settings → Privacy**
2. Para cada tipo Privado listado em `database.md`, abrir a condição real configurada e substituir a "regra proposta" pela regra real
3. Verificar com prioridade máxima: `Cards`, `CardTime`, `credenciaisAPIs`
4. Depois de validado, este documento alimenta a geração das RLS Policies no Supabase (`16-rls-policies.md` / Prioridade 3 em `migration.md`)
