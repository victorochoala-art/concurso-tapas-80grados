/**
 * Envío de emails del Concurso de Tapas UFV × 80 Grados desde una cuenta de Gmail.
 *
 * Se pega en un proyecto de Google Apps Script (script.google.com) de la cuenta que enviará
 * los correos y se publica como aplicación web:
 *   Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
 *
 * En  Configuración del proyecto → Propiedades de la secuencia de comandos  hay que definir:
 *   CLAVE         clave larga y secreta; la misma que se guarda en Supabase
 *   RESPONDER_A   (opcional) dirección a la que llegan las respuestas, p. ej. la de Investing UFV
 *
 * Límite de Google para cuentas de Gmail: 100 destinatarios al día.
 */

// Ejecutar una vez a mano desde el editor: hace que Google pida el permiso para enviar correos.
function autorizar() {
  Logger.log('Envíos disponibles hoy: ' + MailApp.getRemainingDailyQuota());
}

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var clave = props.getProperty('CLAVE');
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return responder({ ok: false, error: 'PETICION_INVALIDA' }); }

  if (!clave || d.clave !== clave) return responder({ ok: false, error: 'SIN_ACCESO' });
  if (!d.para || !d.asunto || !d.texto) return responder({ ok: false, error: 'PETICION_INVALIDA' });
  if (MailApp.getRemainingDailyQuota() < 1) return responder({ ok: false, error: 'LIMITE_DIARIO' });

  try {
    var mensaje = { to: String(d.para), subject: String(d.asunto), body: String(d.texto), name: 'Concurso de Tapas UFV' };
    if (d.html) mensaje.htmlBody = String(d.html);
    var responderA = props.getProperty('RESPONDER_A');
    if (responderA) mensaje.replyTo = responderA;
    MailApp.sendEmail(mensaje);
    return responder({ ok: true, restantes: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return responder({ ok: false, error: String(err).slice(0, 200) });
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
