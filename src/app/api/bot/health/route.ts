import { NextResponse } from "next/server";
import { isServiceConfigured } from "@/lib/supabase/service";
import { isOpenAiConfigured } from "@/lib/ai/openai";

// Diagnóstico do bot: expõe apenas booleanos de configuração, nunca valores.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ openai: isOpenAiConfigured, service: isServiceConfigured });
}
