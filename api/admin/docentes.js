// api/admin/docentes.js
const supabase = require('../../lib/supabase');
const bcrypt   = require('bcryptjs');
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    verifyAdmin(req);
    const { id } = req.query; // para /api/admin/docentes?id=xxx

    // ── GET: listar todos ──
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('docentes')
        .select('id, codigo_docente, nombre, apellido, email, materia, grado_asignado, activo, solicitud_pendiente, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ docentes: data });
    }

    // ── POST: crear docente o aprobar solicitud ──
    if (req.method === 'POST') {
      // Si viene con ?action=aprobar, activar docente pendiente
      if (req.query.action === 'aprobar' && id) {
        const { error } = await supabase
          .from('docentes')
          .update({ solicitud_pendiente: false, activo: true })
          .eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Docente aprobado.' });
      }

      // Crear docente nuevo desde el admin
      const { nombre, apellido, email, password, materia, grado_asignado, codigo_docente } = req.body;
      if (!nombre || !apellido || !email || !password || !materia) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const codigo = codigo_docente || 'DOC' + Date.now().toString().slice(-5);

      const { data, error } = await supabase
        .from('docentes')
        .insert({ nombre, apellido, email: email.toLowerCase(), password_hash: hash, materia, grado_asignado, codigo_docente: codigo, activo: true, solicitud_pendiente: false })
        .select().single();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'El email ya está registrado.' });
        throw error;
      }
      return res.status(201).json({ docente: data });
    }

    // ── PUT: editar docente ──
    if (req.method === 'PUT' && id) {
      const { nombre, apellido, materia, grado_asignado, activo, password } = req.body;
      const updates = {};
      if (nombre          !== undefined) updates.nombre          = nombre;
      if (apellido        !== undefined) updates.apellido        = apellido;
      if (materia         !== undefined) updates.materia         = materia;
      if (grado_asignado  !== undefined) updates.grado_asignado  = grado_asignado;
      if (activo          !== undefined) updates.activo          = activo;
      if (password) updates.password_hash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('docentes').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json({ docente: data });
    }

    // ── DELETE: eliminar docente ──
    if (req.method === 'DELETE' && id) {
      const { error } = await supabase.from('docentes').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido.' });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
