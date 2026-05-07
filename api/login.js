// api/login.js
const supabase = require('../lib/supabase');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agenda_secret_key_cambia_esto';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // Buscar docente en la base de datos
    const { data: docente, error } = await supabase
      .from('docentes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !docente) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Verificar que está activo
    if (!docente.activo) {
      return res.status(403).json({ error: 'Tu cuenta está inactiva. Contacta al administrador.' });
    }

    // Verificar si tiene solicitud pendiente (aún no aprobado)
    if (docente.solicitud_pendiente) {
      return res.status(403).json({ error: 'Tu solicitud de acceso está pendiente de aprobación.' });
    }

    // Determinar rol real del docente
    const isAdmin = docente.codigo_docente?.startsWith('ADMIN') || docente.materia === 'Administración';
    const actualRole = isAdmin ? 'admin' : 'docente';

    // Verificar que el rol solicitado coincide
    if (role === 'admin' && !isAdmin) {
      return res.status(403).json({ error: 'No tienes permisos de administrador.' });
    }

    // Verificar contraseña
    // NOTA: En producción usar bcrypt.compare. Para el demo usamos comparación directa
    // si aún no hasheaste las contraseñas, o bcrypt si ya las hasheaste.
    let passwordOk = false;
    if (docente.password_hash.startsWith('$2')) {
      // Es un hash bcrypt real
      passwordOk = await bcrypt.compare(password, docente.password_hash);
    } else {
      // Contraseña en texto plano (solo para demo inicial)
      passwordOk = (password === docente.password_hash);
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id:       docente.id,
        email:    docente.email,
        nombre:   docente.nombre,
        apellido: docente.apellido,
        materia:  docente.materia,
        role:     actualRole,
        codigo:   docente.codigo_docente
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      token,
      user: {
        id:       docente.id,
        nombre:   docente.nombre,
        apellido: docente.apellido,
        email:    docente.email,
        materia:  docente.materia,
        role:     actualRole,
        codigo:   docente.codigo_docente
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
