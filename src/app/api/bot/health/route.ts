import { NextResponse } from "next/server";
import { isServiceConfigured } from "@/lib/supabase/service";
import { isOpenAiConfigured } from "@/lib/ai/openai";

// Diagnóstico do bot: expõe apenas booleanos de configuração, nunca valores.
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/bot/health:
 *   get:
 *     summary: Diagnóstico de configuração do bot de atendimento
 *     tags: [Bot]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 openai: { type: boolean }
 *                 service: { type: boolean }
 */
export async function GET() {
  return NextResponse.json({ openai: isOpenAiConfigured, service: isServiceConfigured });
}
