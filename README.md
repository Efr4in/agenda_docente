# 📋 Agenda Escolar Digital con WhatsApp Automático
**U.E.P. Boliviano Holandés — Borrador Funcional v1.0**

---

## 🗂️ Estructura del proyecto

```
agenda-docente/
├── api/
│   ├── login.js                ← Autenticación JWT
│   ├── estudiantes.js          ← Buscar estudiante por código
│   ├── registro.js             ← Guardar registro + enviar WhatsApp
│   ├── historial.js            ← Ver/borrar historial del docente
│   ├── notificaciones.js       ← Notificaciones para docentes
│   └── admin/
│       ├── stats.js            ← Estadísticas globales (admin)
│       ├── docentes.js         ← CRUD de docentes (admin)
│       └── notificaciones.js   ← Enviar notificaciones (admin)
├── lib/
│   ├── supabase.js             ← Cliente Supabase
│   └── auth.js                 ← Middleware JWT
├── public/
│   ├── index.html              ← Login (con parallax + partículas)
│   ├── css/
│   │   └── main.css            ← Estilos globales + dark/light mode
│   ├── docente/
│   │   ├── index.html          ← Dashboard: Calendario gigante
│   │   └── historial.html      ← Historial de registros
│   └── admin/
│       └── index.html          ← Panel administrador
├── schema.sql                  ← Schema de base de datos (Supabase)
├── .env.example                ← Variables de entorno a configurar
├── vercel.json                 ← Rutas de Vercel
└── package.json
```

---

## ⚙️ PASO A PASO — Configuración completa

### PASO 1 — Instalar Node.js y Vercel CLI

1. Descarga Node.js desde https://nodejs.org (versión LTS)
2. Verifica: `node -v` y `npm -v`
3. Instala Vercel CLI globalmente:
   ```bash
   npm install -g vercel
   ```
4. Inicia sesión en Vercel:
   ```bash
   vercel login
   ```

---

### PASO 2 — Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta (es gratis)
2. Crea un nuevo proyecto (ponle nombre: `agenda-escolar`)
3. Espera que termine de configurarse (~1-2 min)
4. Ve a **Settings → API** y copia:
   - `URL`: tu SUPABASE_URL (ej: `https://abcdef.supabase.co`)
   - `service_role key` (la larga): tu SUPABASE_SERVICE_KEY
   ⚠️ NUNCA compartas la service_role key públicamente
5. Ve a **SQL Editor** (ícono de base de datos en el sidebar)
6. Pega TODO el contenido del archivo `schema.sql` y ejecuta con **Run**

---

### PASO 3 — Insertar datos reales de prueba en Supabase

Después de ejecutar el schema, necesitas insertar un usuario admin funcional.
En el SQL Editor, ejecuta esto para crear el admin con contraseña `demo123`:

```sql
-- Primero borra los datos de ejemplo del schema que no tienen hash real
DELETE FROM docentes WHERE email LIKE '%demo.com%';

-- Inserta admin (contraseña: admin123)
INSERT INTO docentes (codigo_docente, nombre, apellido, email, password_hash, materia, activo, solicitud_pendiente)
VALUES ('ADMIN01', 'Director', 'General', 'admin@colegio.com', 'admin123', 'Administración', true, false);

-- Inserta docente demo (contraseña: docente123)
INSERT INTO docentes (codigo_docente, nombre, apellido, email, password_hash, materia, grado_asignado, activo, solicitud_pendiente)
VALUES ('DOC001', 'María', 'García', 'mgarcia@colegio.com', 'docente123', 'Matemáticas', '4to A', true, false);

-- Inserta estudiantes de prueba
INSERT INTO estudiantes (codigo, nombre, apellido, grado, paralelo, nombre_encargado, parentesco, telefono_encargado, callmebot_apikey)
VALUES
('0001', 'Juan',  'Pérez',  '4to', 'A', 'Roberto Pérez',  'padre', '+59171234567', NULL),
('0002', 'Ana',   'López',  '4to', 'A', 'Carmen López',   'madre', '+59172345678', NULL),
('0003', 'Luis',  'Mamani', '4to', 'A', 'Rosa Mamani',    'madre', '+59173456789', NULL),
('0004', 'Sofía', 'Quispe', '5to', 'B', 'Mario Quispe',   'padre', '+59174567890', NULL),
('0005', 'Diego', 'Flores', '5to', 'B', 'Lucía Flores',   'madre', '+59175678901', NULL);
```

⚠️ IMPORTANTE: Las contraseñas arriba son en texto plano (solo para el borrador demo).
En producción, generarás hashes bcrypt reales con: `bcrypt.hash('contraseña', 10)`

---

### PASO 4 — Configurar variables de entorno

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Abre `.env` y llena con tus datos reales:
   ```
   SUPABASE_URL=https://tuproyecto.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...
   JWT_SECRET=cualquier_string_largo_y_aleatorio_aqui
   ```
3. Para generar un JWT_SECRET aleatorio, usa: https://generate-secret.vercel.app/32

---

### PASO 5 — Instalar dependencias

```bash
cd agenda-docente
npm install
```

---

### PASO 6 — Probar en local

```bash
vercel dev
```

Abre el navegador en: http://localhost:3000

Prueba con:
- **Admin**: `admin@colegio.com` / `admin123` → rol Administrador
- **Docente**: `mgarcia@colegio.com` / `docente123` → rol Docente

---

### PASO 7 — Subir a GitHub

```bash
git init
git add .
git commit -m "feat: borrador agenda escolar digital v1.0"
git branch -M main
git remote add origin https://github.com/Efr4in/agenda-docente.git
git push -u origin main
```

---

### PASO 8 — Deploy en Vercel

```bash
vercel --prod
```

Vercel te va a preguntar:
- **Set up and deploy**: Y
- **Which scope**: tu cuenta
- **Link to existing project**: N
- **Project name**: agenda-docente (o lo que quieras)
- **Directory**: `.` (enter)
- **Override settings**: N

Después del deploy, ve a **vercel.com → tu proyecto → Settings → Environment Variables**
y agrega las 3 variables de `.env` ahí también:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`

Luego haz redeploy:
```bash
vercel --prod
```

¡Listo! Tu borrador estará en línea.

---

## 📱 Sobre el WhatsApp automático (Callmebot)

### Cómo funciona para el borrador:

Callmebot es una API gratuita que permite enviar mensajes de WhatsApp a un número **específico** que primero se tiene que registrar.

**Para que un encargado reciba mensajes automáticos:**
1. El encargado debe agregar a contactos: `+34 644 25 68 10` (número de Callmebot)
2. Enviarle este mensaje por WhatsApp: `I allow callmebot to send me messages`
3. En 1-2 minutos recibe su API KEY personal (ej: `123456`)
4. Esa API KEY se guarda en el campo `callmebot_apikey` del estudiante en Supabase

**Limitación del borrador:**
- Callmebot es para demos y pruebas. El número del encargado debe haber dado permiso explícito.
- En producción con 1500+ familias, usar **WhatsApp Business API** (Meta) vía Twilio o 360dialog.

---

## 🔐 Usuarios del sistema

| Rol | Acceso |
|-----|--------|
| **Docente** | Ve su calendario, registra observaciones, ve su historial |
| **Admin** | Ve todo, aprueba docentes, envía notificaciones globales |

---

## 🚀 Funcionalidades implementadas

- ✅ Login con JWT (docente / admin)
- ✅ Parallax + partículas animadas en login
- ✅ Calendario gigante interactivo con días clickeables
- ✅ Autodetección de estudiante por código de 4 dígitos
- ✅ Checkboxes de observación con UI personalizada
- ✅ Envío automático de WhatsApp al encargado
- ✅ Historial completo con filtros y paginación
- ✅ Botón "Borrar historial" protegido con confirmación
- ✅ Panel admin con estadísticas globales
- ✅ Aprobación/rechazo de solicitudes de docentes
- ✅ Envío de notificaciones individuales o masivas a docentes
- ✅ Modo Claro / Oscuro con persistencia
- ✅ Responsive (sidebar colapsable en móvil)
- ✅ Toast notifications animados

---

## 📌 Próximos pasos para producción

- [ ] Reemplazar contraseñas en texto plano por bcrypt real
- [ ] Agregar página de registro de docentes (solicitud)
- [ ] Implementar WhatsApp Business API para envío masivo
- [ ] CRUD completo de estudiantes desde el admin
- [ ] Exportar registros a PDF / Excel
- [ ] Sistema de Kardex estudiantil (segundo módulo)
