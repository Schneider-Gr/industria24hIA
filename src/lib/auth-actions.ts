"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Encerra a sessão e volta pro login. Usado pelo botão "Sair" do header
// dos painéis (seller/admin) — não existia nenhum ponto de logout antes.
export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
