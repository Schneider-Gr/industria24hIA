"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function moderarAfiliacao(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  if (!id || !["Aprovada", "Suspensa"].includes(status)) {
    throw new Error();
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("afiliacoes")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error();
  }

  revalidatePath("/seller/afiliados");
}
