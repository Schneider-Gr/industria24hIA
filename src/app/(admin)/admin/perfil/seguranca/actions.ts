"use server";

import { createClient } from "@/lib/supabase/server";

// 2FA opcional (Supabase Auth MFA/TOTP nativo, sem tabela nova — fica em
// auth.mfa_factors do GoTrue). Sem enforcement no layout nesta fase; o admin
// ativa por conta própria. Enroll/verify em duas etapas porque o QR code só
// existe depois do enroll, e o factor só fica "verified" após o primeiro
// código correto.
export async function iniciarEnrollTotp() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw new Error(error.message);
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function confirmarEnrollTotp(factorId: string, codigo: string) {
  const supabase = await createClient();
  const { data: challenge, error: erroChallenge } = await supabase.auth.mfa.challenge({ factorId });
  if (erroChallenge) throw new Error(erroChallenge.message);

  const { error: erroVerify } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: codigo,
  });
  if (erroVerify) throw new Error("Código inválido. Confira o app autenticador e tente de novo.");
}

export async function desativarTotp(factorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}

export async function listarFatoresTotp() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data.totp;
}
