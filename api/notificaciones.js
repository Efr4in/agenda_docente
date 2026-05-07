// api/notificaciones.js — para que los docentes lean sus notificaciones
const supabase = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const decoded = verifyToken(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('notificaciones_admin')
        .select('*')
        .eq('docente_id', decoded.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return res.status(200).json({ notificaciones: data || [] });
    }

    // Marcar como leída
    if (req.method === 'PATCH') {
      const { id } = req.body;
      const { error } = await supabase
        .from('notificaciones_admin')
        .update({ leida: true })
        .eq('id', id)
        .eq('docente_id', decoded.id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido.' });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
