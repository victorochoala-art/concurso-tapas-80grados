/* Conexión con Supabase.
   Mientras estos dos valores estén vacíos, la web funciona en modo demostración:
   el formulario no guarda nada y el panel enseña datos de ejemplo.

   Los dos valores están en Supabase → Project Settings → API.
   La clave "anon" es pública por diseño; NUNCA pongas aquí la clave "service_role". */
window.CONCURSO_CONFIG = {
  supabaseUrl: 'https://fvivstjropokztbrnsnc.supabase.co',
  supabaseAnonKey: 'sb_publishable_ZOGVNVs9ZTjZgKs8UDvY9A_Fq_Oo3Qs',  // clave publicable: pensada para ir en la web
  bucket: 'candidaturas',
  maxVideoMB: 50,       // límite por archivo del plan gratuito de Supabase
};
