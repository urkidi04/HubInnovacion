// Configuración de la base compartida (Supabase).
// Copia estos valores de tu proyecto: Supabase → Project Settings → API.
// La "anon public key" está pensada para ir en el navegador; la seguridad la dan
// las políticas RLS de supabase/schema.sql (solo correos del dominio permitido).
window.APP_CONFIG = {
  SUPABASE_URL: "https://cuwulmaxhlwzbutmhssf.supabase.co",
  SUPABASE_ANON_KEY: "",   // ej. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  ALLOWED_DOMAIN: "bafar.com.mx"
};
