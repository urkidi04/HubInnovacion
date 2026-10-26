# Registro de Ahorro con IA

App web para capturar las tareas que el equipo optimiza con IA: tiempo antes y después, reducción calculada automáticamente, fechas de inicio y fin, tareas compartidas entre varias personas, filtros y exportación a CSV.

- Sitio estático (un solo `index.html`) publicado con GitHub Pages.
- Base compartida en **Supabase** (Postgres) con actualizaciones en vivo.
- Acceso con correo y contraseña; las cuentas las crea el administrador en Supabase (Authentication → Users → Add user → Create new user, con *Auto Confirm User*). Solo se permiten correos `@bafar.com.mx` (validado en el navegador y en las políticas RLS de la base).

## Puesta en marcha

### 1. Crear la base en Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.
3. En **Authentication → URL Configuration**:
   - **Site URL**: la URL de GitHub Pages, p. ej. `https://urkidi04.github.io/HubInnovacion/`
   - **Redirect URLs**: agrega la misma URL.
4. En **Authentication → Providers → Email**, deja activado *Email* (enlace mágico).

> El correo integrado de Supabase tiene un límite bajo de envíos por hora. Para uso de todo el equipo, configura un SMTP propio en **Authentication → Emails → SMTP Settings**.

### 2. Conectar la app
Edita [`config.js`](config.js) con los valores de **Project Settings → API**:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
  ALLOWED_DOMAIN: "bafar.com.mx"
};
```

La *anon key* es pública por diseño; lo que protege los datos son las políticas RLS. **Nunca** pongas aquí la *service_role key*.

### 3. Publicar con GitHub Pages
**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.

Sin `config.js` configurado, la app funciona en *modo local*: cada navegador guarda solo sus propios registros.

## Campos

| Campo | Notas |
|---|---|
| Nombre(s) de la persona | Uno o varios (Enter o coma para agregar) |
| ¿Es compartida? | Sí/No; se marca Sí al haber más de un nombre |
| Nombre de la tarea, Clasificación, Proceso o App (IA) | Obligatorios |
| Tiempo antes / ahora (min) | La reducción se calcula sola |
| Fecha inicio / Fecha fin | Obligatorias; la fin no puede ser anterior |
| Fecha de registro | Automática |
| Comentario / Impacto | Opcional |
