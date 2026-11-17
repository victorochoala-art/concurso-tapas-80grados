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

1. Crea una cuenta en [resend.com](https://resend.com) y verifica el dominio desde el que se enviará.
2. En Supabase, **Edge Functions**: crea la función `enviar-email` con el contenido de `supabase/functions/enviar-email/index.ts`.
3. En **Edge Functions → Secrets** añade `RESEND_API_KEY` y `EMAIL_FROM` (p. ej. `Concurso de Tapas UFV <concurso@tudominio.com>`).

Sin este paso las candidaturas se guardan igual; solo falta el email.

## Antes de lanzar

- Borra las candidaturas de prueba: `delete from public.candidaturas;` y vacía el almacén `candidaturas` en **Storage**.
- Fechas y cupo están en la tabla `ajustes` (`abre`, `cierra`, `max_plazas`, `max_finalistas`).
- El plan gratuito de Supabase limita cada archivo a 50 MB. Para vídeos mayores hay que pasar a un plan de pago y subir `file_size_limit` del almacén y `maxVideoMB` de `config.js`.
- Completa los datos resaltados en amarillo de `bases.html` y `privacidad.html` y quita el aviso de borrador.
