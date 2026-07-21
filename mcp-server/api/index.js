// Entry da Vercel: o mesmo app Express, servido como function.
// ponytail: reexport do build; sem adapter, o Node runtime aceita o app direto.
export { default } from "../dist/app.js";
