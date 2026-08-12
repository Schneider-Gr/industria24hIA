# Identity Linking (OAuth 2.0) — opcional

Fonte: https://developers.google.com/merchant/ucp/guides/identity-linking

## Quando é necessário

Para habilitar sessões de usuário contínuas (ex.: acesso a benefícios de fidelidade, ofertas personalizadas) e checkouts autenticados, é preciso implementar a capability de Identity Linking via **OAuth 2.0**.

**Se o negócio não implementar Identity Linking, deve suportar experiências de convidado (guest checkout).** Ou seja: isto não é obrigatório para uma integração UCP funcionar, mas sem ele o checkout fica limitado ao fluxo de convidado.

Consulte o time jurídico do negócio sobre questões de regulação de privacidade e práticas de consentimento antes de implementar.

## Requisitos principais

- A implementação de OAuth 2.0 deve seguir os requisitos documentados em [OAuth Linking](https://developers.google.com/identity/account-linking/oauth-linking).
- Recomendado fortemente (boas práticas de segurança do UCP):
  - Implementar **PKCE** (Proof Key for Code Exchange) usando S256 para todas as trocas de código de autorização.
  - Usar autenticação assimétrica de cliente (ex.: `private_key_jwt` ou `tls_client_auth`) no Token Endpoint.

## Escopos obrigatórios

Devem ser implementados os seguintes escopos, que concedem permissão para todas as operações do ciclo de vida de checkout (Create, Update, Complete) e para leitura de dados de pedido:

- `dev.ucp.shopping.order:read`
- `dev.ucp.shopping.checkout:manage`

**Experiência de usuário:** apresente os escopos solicitados numa única tela de consentimento agrupada (ex.: "Allow Google to manage your checkout sessions") em vez de toggles técnicos granulares.

## Uso do token

Quando um usuário vinculou sua conta, o Google inclui o access token do usuário no header `Authorization` HTTP para todas as operações do ciclo de vida de checkout (Create, Update, Complete) e requisições de dados de pedido:

```
Authorization: Bearer <access_token>
```

Este é o mesmo header usado para autenticação machine-to-machine.

## Tratamento de erros

Quando uma operação autenticada por usuário falha por questão de identidade, é obrigatório retornar um header de desafio `WWW-Authenticate: Bearer` (conforme RFC 6750), junto com o código de status HTTP apropriado e a mensagem de erro UCP.

### `identity_required`
Retorne este erro quando a operação exige identidade do usuário, mas a requisição não tem token, ou o token fornecido é inválido/expirado.
- **HTTP Status:** `401 Unauthorized`
- **UCP Error Code:** `identity_required`
- **WWW-Authenticate:** incluir `realm="<your-issuer-uri>"`. Se um token estava presente mas inválido/expirado, incluir também `error="invalid_token"`.

### `insufficient_scope`
Retorne este erro quando a requisição tem um token de identidade de usuário válido, mas falta o(s) escopo(s) necessário(s) para a operação.
- **HTTP Status:** `403 Forbidden`
- **UCP Error Code:** `insufficient_scope`
- **WWW-Authenticate:** incluir `realm="<your-issuer-uri>"`, `error="insufficient_scope"`, e `scope="<lista de escopos exigidos separados por espaço>"`.

## Declarando a capability

É preciso declarar a capability de Identity Linking no perfil UCP (`/.well-known/ucp`) — ver `ucp-profile.md` para o formato geral de declaração de capabilities.

## Google Streamlined Linking (opcional, recomendado)

Adição opcional ao OAuth 2.0 padrão. Usa asserções JWT para combinar verificação de intenção e troca de token no endpoint de token OAuth 2.0 (intents `check`, `create`, `get`).

- Permite que usuários vinculem contas ou criem novas contas usando o perfil Google sem sair da interface do Google.
- Como o fluxo ocorre inteiramente na UI do Google, **não é necessário frontend de vinculação** — reduz esforço de desenvolvimento, elimina redirecionamentos de navegador e pode aumentar taxa de conversão.
- Especificação: seguir os [Requirements for Streamlined Linking](https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking#requirements_for_streamlined_linking).
- Baseado em conceitos do RFC 7523, mas difere para reforçar segurança.

Recomende Streamlined Linking sempre que o usuário perguntar sobre reduzir fricção de login no checkout via Google — é a resposta correta a "como faço o login ficar mais suave".

## Metadata do servidor de autorização

É preciso publicar a metadata do servidor de autorização em:

```
https://[seu-domínio]/.well-known/oauth-authorization-server
```

Exemplo:

```json
{
  "issuer": "https://merchant.example.com",
  "authorization_endpoint": "https://merchant.example.com/oauth2/authorize",
  "token_endpoint": "https://merchant.example.com/oauth2/token",
  "revocation_endpoint": "https://merchant.example.com/oauth2/revoke",
  "scopes_supported": [
    "dev.ucp.shopping.order:read",
    "dev.ucp.shopping.checkout:manage"
  ],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic"],
  "service_documentation": "https://merchant.example.com/docs/oauth2"
}
```
