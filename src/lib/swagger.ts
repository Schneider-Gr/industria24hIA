import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () =>
  createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Industria24 — API interna",
        version: "1.0.0",
        description:
          "Rotas internas de src/app/api usadas pelo próprio frontend (vitrine, bot, webhooks). " +
          "Não é a API pública para terceiros — para isso ver /desenvolvedores (MCP).",
      },
    },
  });
