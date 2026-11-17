// Función de Supabase (Edge Function) que envía los emails del concurso.
//
// Dos usos:
//   { tipo: "confirmacion", id }                       → la llama la web al registrar un plato
//   { tipo: "personalizado", ids, asunto, cuerpo }     → la llama el panel; solo organizadores
//
// Envía por una de estas dos vías, según los secretos definidos en Supabase
// (Edge Functions → Secrets):
//
//   A) Cuenta de Gmail, gratis y sin dominio (ver apps-script/Codigo.gs):
//        CORREO_URL     dirección de la aplicación web de Apps Script
//        CORREO_CLAVE   la misma clave guardada en el script como CLAVE
//
//   B) Resend, con dominio propio:
//        RESEND_API_KEY clave de Resend
//        EMAIL_FROM     remitente, p. ej.  Concurso de Tapas UFV <concurso@tudominio.com>
//
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
// Con las claves nuevas de Supabase (sb_publishable_…) hay que desactivar
// "Verify JWT" en esta función: los permisos se comprueban aquí dentro.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Plantilla común: blanca, con el punto coral
const plantilla = (texto: string) => `<!doctype html><html lang="es"><body style="margin:0;background:#f7f5f1;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#10294d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:24px" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px">
<div style="width:18px;height:18px;border-radius:50%;background:#ef544e;margin-bottom:24px"></div>
<div style="font-size:16px;line-height:1.6">${esc(texto).replace(/\n/g, "<br>")}</div>
</td></tr></table>
<p style="font-size:12px;color:#8791a3;margin:20px 0 0">Concurso de Tapas UFV · Investing UFV × 80 Grados</p>
</td></tr></table></body></html>`;

const porGmail = () => !!(Deno.env.get("CORREO_URL") && Deno.env.get("CORREO_CLAVE"));
const porResend = () => !!(Deno.env.get("RESEND_API_KEY") && Deno.env.get("EMAIL_FROM"));

async function enviar(to: string, subject: string, texto: string) {
  if (porGmail()) {
    try {
      const r = await fetch(Deno.env.get("CORREO_URL")!, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ clave: Deno.env.get("CORREO_CLAVE"), para: to, asunto: subject, texto, html: plantilla(texto) }),
      });
      const res = await r.json();
      return res.ok ? { ok: true, detalle: "" } : { ok: false, detalle: String(res.error ?? "error").slice(0, 300) };
    } catch (e) {
      return { ok: false, detalle: String(e).slice(0, 300) };
    }
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: [to], subject, html: plantilla(texto), text: texto }),
  });
  return r.ok ? { ok: true, detalle: "" } : { ok: false, detalle: (await r.text()).slice(0, 300) };
}

const rellenar = (t: string, c: { nombre: string; plato: string }) =>
  t.replace(/\{\{\s*nombre\s*\}\}/g, c.nombre).replace(/\{\{\s*plato\s*\}\}/g, c.plato);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!porGmail() && !porResend()) return json({ error: "EMAIL_SIN_CONFIGURAR" }, 503);

  let body: { tipo?: string; id?: string; ids?: string[]; asunto?: string; cuerpo?: string; etiqueta?: string };
  try { body = await req.json(); } catch { return json({ error: "PETICION_INVALIDA" }, 400); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const registrar = (candidatura_id: string, tipo: string, destinatario: string, asunto: string, r: { ok: boolean; detalle: string }) =>
    db.from("emails").insert({ candidatura_id, tipo, destinatario, asunto, estado: r.ok ? "enviado" : "error", detalle: r.detalle });

  // ---------- Confirmación al registrar un plato ----------
  if (body.tipo === "confirmacion") {
    if (!body.id) return json({ error: "PETICION_INVALIDA" }, 400);
    const { data: c } = await db.from("candidaturas").select("id, numero, estado, nombre, plato, email, creado").eq("id", body.id).maybeSingle();
    if (!c) return json({ error: "NO_ENCONTRADA" }, 404);
    // Solo una vez, y solo justo después del registro
    const { count } = await db.from("emails").select("id", { count: "exact", head: true }).eq("candidatura_id", c.id).eq("tipo", "confirmacion");
    if ((count ?? 0) > 0 || Date.now() - new Date(c.creado).getTime() > 30 * 60 * 1000) return json({ ok: true, repetido: true });

    const enEspera = c.estado === "lista_espera";
    const asunto = enEspera ? "Tu plato está en lista de espera" : `Hemos recibido tu plato (n.º ${c.numero})`;
    const texto = enEspera
      ? `Hola ${c.nombre}:\n\nHemos guardado «${c.plato}», pero las plazas del concurso ya están ocupadas. Estás en lista de espera y te avisaremos si queda una libre.\n\nInvesting UFV × 80 Grados`
      : `Hola ${c.nombre}:\n\nHemos recibido «${c.plato}». Es el plato n.º ${c.numero} del Concurso de Tapas UFV.\n\nEl plazo cierra el 15 de enero. Después, el jurado de 80 Grados elegirá a los 8 finalistas y te escribiremos a este email con el resultado.\n\nSuerte,\nInvesting UFV × 80 Grados`;
    const r = await enviar(c.email, asunto, texto);
    await registrar(c.id, "confirmacion", c.email, asunto, r);
    return json({ ok: r.ok });
  }

  // ---------- Email del panel: solo organizadores ----------
  if (body.tipo === "personalizado") {
    const auth = req.headers.get("Authorization") ?? "";
    const comoUsuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: esAdmin } = await comoUsuario.rpc("es_admin");
    if (esAdmin !== true) return json({ error: "SIN_ACCESO" }, 403);

    const ids = (body.ids ?? []).slice(0, 200);
    const asunto = (body.asunto ?? "").trim();
    const cuerpo = (body.cuerpo ?? "").trim();
    if (!ids.length || !asunto || !cuerpo) return json({ error: "PETICION_INVALIDA" }, 400);

    const { data: lista } = await db.from("candidaturas").select("id, nombre, plato, email").in("id", ids);
    let enviados = 0, errores = 0;
    for (const c of lista ?? []) {
      const a = rellenar(asunto, c);
      const r = await enviar(c.email, a, rellenar(cuerpo, c));
      await registrar(c.id, body.etiqueta === "finalista" ? "finalista" : "personalizado", c.email, a, r);
      r.ok ? enviados++ : errores++;
      if (r.detalle === "LIMITE_DIARIO") { errores += (lista?.length ?? 0) - enviados - errores; break; } // Gmail: 100 al día
      await new Promise((ok) => setTimeout(ok, 600)); // los servicios limitan los envíos por segundo
    }
    return json({ enviados, errores });
  }

  return json({ error: "PETICION_INVALIDA" }, 400);
});
