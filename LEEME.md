# Concurso de Tapas UFV × 80 Grados

Web estática: no hay nada que compilar.

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `app.js`, `art.js` | Landing y formulario |
| `admin.html`, `admin.css`, `admin.js` | Panel de organización |
| `bases.html`, `privacidad.html`, `legal.css` | Bases del concurso y política de privacidad (borradores: lo resaltado en amarillo está por confirmar) |
| `config.js` | Conexión con la base de datos |
| `supabase/schema.sql` | Tablas, permisos y almacén de archivos |
| `supabase/functions/enviar-email/` | Envío de emails |
| `apps-script/Codigo.gs` | Programa que envía los correos desde una cuenta de Gmail |
| `dev-server.mjs` | Servidor local: `node dev-server.mjs` → http://localhost:4173 |

Mientras `config.js` esté vacío, todo funciona en **modo demostración**: el formulario no guarda nada y el panel enseña datos de ejemplo.

## Activar el guardado real

1. Crea un proyecto en [supabase.com](https://supabase.com), en una región de la UE.
2. **SQL Editor** → pega `supabase/schema.sql` entero → **Run**.
3. **Authentication → Users → Add user**: crea un usuario (email y contraseña) por organizador.
4. **SQL Editor** → ejecuta, con esos mismos emails:
   ```sql
   insert into public.admins (email) values ('organizador@ejemplo.com');
   ```
5. **Project Settings → API**: copia la *Project URL* y la clave *anon* en `config.js`.

Desde ese momento el formulario guarda candidaturas y `admin.html` pide email y contraseña.

## Activar los emails

Sin dominio propio y sin coste, desde una cuenta de Gmail (límite de Google: 100 destinatarios al día):

1. Con la cuenta de Gmail que enviará los correos, crea un proyecto en [script.google.com](https://script.google.com) y pega `apps-script/Codigo.gs`.
2. En **Configuración del proyecto → Propiedades de la secuencia de comandos** define `CLAVE` (una clave larga y secreta) y, si quieres, `RESPONDER_A` (la dirección a la que llegarán las respuestas).
3. Ejecuta una vez la función `autorizar` y acepta el permiso de Google.
4. **Implementar → Nueva implementación → Aplicación web**, ejecutar como *Yo*, acceso *Cualquier usuario*. Copia la dirección que te da.
5. En Supabase, **Edge Functions**: crea la función `enviar-email` con el contenido de `supabase/functions/enviar-email/index.ts` y desactiva **Verify JWT**.
6. En **Edge Functions → Secrets** añade `CORREO_URL` (la dirección del paso 4) y `CORREO_CLAVE` (la misma clave del paso 2).

Con dominio propio se puede usar Resend en su lugar: secretos `RESEND_API_KEY` y `EMAIL_FROM`.

Sin este paso las candidaturas se guardan igual; solo falta el email.

## Antes de lanzar

- Borra las candidaturas de prueba: `delete from public.candidaturas;` y vacía el almacén `candidaturas` en **Storage**.
- Fechas y cupo están en la tabla `ajustes` (`abre`, `cierra`, `max_plazas`, `max_finalistas`).
- El plan gratuito de Supabase limita cada archivo a 50 MB. Para vídeos mayores hay que pasar a un plan de pago y subir `file_size_limit` del almacén y `maxVideoMB` de `config.js`.
- Completa los datos resaltados en amarillo de `bases.html` y `privacidad.html` y quita el aviso de borrador.
