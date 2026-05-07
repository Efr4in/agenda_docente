-- ============================================
-- AGENDA ESCOLAR DIGITAL - Schema Supabase
-- ============================================

-- Tabla: docentes
CREATE TABLE docentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_docente VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  materia VARCHAR(100) NOT NULL,
  grado_asignado VARCHAR(20),          -- ej: "4to A"
  activo BOOLEAN DEFAULT true,
  solicitud_pendiente BOOLEAN DEFAULT false,  -- para aprobación admin
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: estudiantes
CREATE TABLE estudiantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(4) UNIQUE NOT NULL,   -- código de 4 dígitos
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  grado VARCHAR(20) NOT NULL,          -- ej: "4to"
  paralelo VARCHAR(5) NOT NULL,        -- ej: "A"
  nombre_encargado VARCHAR(150) NOT NULL,
  parentesco VARCHAR(50),              -- "padre", "madre", "tutor"
  telefono_encargado VARCHAR(20) NOT NULL,  -- con código de país, ej: +59171234567
  callmebot_apikey VARCHAR(50),        -- API key de Callmebot del encargado
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: registros (observaciones/agenda)
CREATE TABLE registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docente_id UUID REFERENCES docentes(id) ON DELETE SET NULL,
  estudiante_id UUID REFERENCES estudiantes(id) ON DELETE CASCADE,
  -- Datos capturados automáticamente
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  nombre_docente VARCHAR(200),         -- snapshot en momento del registro
  materia VARCHAR(100),                -- snapshot
  nombre_estudiante VARCHAR(200),      -- snapshot
  grado_paralelo VARCHAR(30),          -- snapshot
  -- Checkboxes de observación
  falto_clases BOOLEAN DEFAULT false,
  llego_tarde BOOLEAN DEFAULT false,
  no_hizo_tarea BOOLEAN DEFAULT false,
  indisciplina BOOLEAN DEFAULT false,
  bajo_rendimiento BOOLEAN DEFAULT false,
  perdio_material BOOLEAN DEFAULT false,
  -- Observación libre
  observacion_adicional TEXT,
  -- Estado del WhatsApp
  whatsapp_enviado BOOLEAN DEFAULT false,
  whatsapp_enviado_at TIMESTAMPTZ,
  whatsapp_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: notificaciones_admin (mensajes del admin hacia docentes)
CREATE TABLE notificaciones_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  docente_id UUID REFERENCES docentes(id) ON DELETE CASCADE,  -- NULL = todos
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance con 1500+ estudiantes
CREATE INDEX idx_estudiantes_codigo ON estudiantes(codigo);
CREATE INDEX idx_registros_docente ON registros(docente_id);
CREATE INDEX idx_registros_estudiante ON registros(estudiante_id);
CREATE INDEX idx_registros_fecha ON registros(fecha);

-- Row Level Security (recomendado en Supabase)
ALTER TABLE docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DATOS DE PRUEBA para el borrador
-- ============================================

-- Docentes demo (password: "demo123" hasheada con bcrypt)
INSERT INTO docentes (codigo_docente, nombre, apellido, email, password_hash, materia, grado_asignado, activo) VALUES
('DOC001', 'María', 'García', 'mgarcia@demo.com', '$2a$10$example_hash_here', 'Matemáticas', '4to A', true),
('DOC002', 'Carlos', 'Mendoza', 'cmendoza@demo.com', '$2a$10$example_hash_here', 'Lenguaje', '5to B', true),
('ADMIN01', 'Director', 'General', 'admin@demo.com', '$2a$10$example_hash_here', 'Administración', NULL, true);

-- Estudiantes demo
INSERT INTO estudiantes (codigo, nombre, apellido, grado, paralelo, nombre_encargado, parentesco, telefono_encargado) VALUES
('0001', 'Juan', 'Pérez', '4to', 'A', 'Roberto Pérez', 'padre', '+59171234567'),
('0002', 'Ana', 'López', '4to', 'A', 'Carmen López', 'madre', '+59172345678'),
('0003', 'Luis', 'Mamani', '4to', 'A', 'Rosa Mamani', 'madre', '+59173456789'),
('0004', 'Sofia', 'Quispe', '5to', 'B', 'Mario Quispe', 'padre', '+59174567890'),
('0005', 'Diego', 'Flores', '5to', 'B', 'Lucía Flores', 'madre', '+59175678901');
