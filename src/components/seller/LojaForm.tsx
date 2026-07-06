"use client";

import { useActionState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { salvarLoja, type LojaFormState } from "@/app/(seller)/seller/minha-loja/actions";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const TIPOS_PIX = ["CNPJ", "CPF", "EMAIL", "PHONE"];

const inputCls =
  "mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

function Campo({
  name,
  label,
  loja,
  type = "text",
  required = false,
}: {
  name: keyof Tables<"lojas">;
  label: string;
  loja: Tables<"lojas"> | null;
  type?: string;
  required?: boolean;
}) {
  const val = loja?.[name];
  return (
    <label className="block text-sm">
      <span className="text-neutral-600 dark:text-neutral-300">
        {label}
        {required && " *"}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={val == null ? "" : String(val)}
        className={inputCls}
      />
    </label>
  );
}

export function LojaForm({ loja }: { loja: Tables<"lojas"> | null }) {
  const [state, action, pending] = useActionState<LojaFormState, FormData>(
    salvarLoja,
    { ok: false },
  );

  return (
    <form action={action} className="max-w-3xl space-y-8">
      {loja && <input type="hidden" name="id" defaultValue={loja.id} />}

      <fieldset className="space-y-4">
        <legend className="text-lg font-medium">Dados cadastrais</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo name="nome" label="Nome da loja" loja={loja} required />
          <Campo name="cnpj" label="CNPJ" loja={loja} />
          <Campo name="whatsapp" label="WhatsApp" loja={loja} />
          <Campo name="email" label="E-mail" loja={loja} type="email" />
        </div>
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">Descrição</span>
          <textarea
            name="descricao"
            rows={3}
            defaultValue={loja?.descricao ?? ""}
            className={inputCls}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-medium">Pagamento (PIX)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo name="chave_pix" label="Chave PIX" loja={loja} />
          <label className="block text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">Tipo da chave</span>
            <select
              name="tipo_chave_pix"
              defaultValue={loja?.tipo_chave_pix ?? ""}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {TIPOS_PIX.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-medium">Endereço</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo name="cep" label="CEP" loja={loja} />
          <Campo name="cidade" label="Cidade" loja={loja} />
          <label className="block text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">Estado (UF)</span>
            <select
              name="estado"
              defaultValue={loja?.estado ?? ""}
              className={inputCls}
            >
              <option value="">UF</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          <Campo name="bairro" label="Bairro" loja={loja} />
          <Campo name="rua" label="Rua" loja={loja} />
          <Campo name="numero" label="Número" loja={loja} />
          <Campo name="complemento" label="Complemento" loja={loja} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-medium">Branding</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo name="logotipo_url" label="URL do logotipo" loja={loja} />
          <Campo name="banner_url" label="URL do banner (1580x450)" loja={loja} />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="permite_retirada_na_loja"
          defaultChecked={loja?.permite_retirada_na_loja ?? false}
        />
        Permite retirada na loja
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Salvando..." : loja ? "Salvar alterações" : "Criar loja"}
        </button>
        {state.ok && <span className="text-sm text-green-600">Dados salvos.</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
