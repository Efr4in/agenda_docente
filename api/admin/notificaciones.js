// api/admin/notificaciones.js
const supabase = require('../../lib/supabase');
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    verifyAdmin(req);

    if (req.method === 'POST') {
      const { docente_id, titulo, mensaje } = req.body;
      if (!titulo || !mensaje) {
        return res.status(400).json({ error: 'Título y mensaje son requeridos.' });
      }

      if (docente_id) {
        // Notificación individual
        const { error } = await supabase.from('notificaciones_admin')
          .insert({ docente_id, titulo, mensaje });
        if (error) throw error;
      } else {
        // Notificación masiva: obtener todos los docentes activos
        const { data: docentes } = await supabase
          .from('docentes')
          .select('id')
          .eq('activo', true)
          .eq('solicitud_pendiente', false);

        if (docentes?.length) {
          const inserts = docentes.map(d => ({ docente_id: d.id, titulo, mensaje }));
          const { error } = await supabase.from('notificaciones_admin').insert(inserts);
          if (error) throw error;
        }
      }

      return res.status(200).json({ success: true, message: 'Notificación(es) enviada(s).' });
    }

    return res.status(405).json({ error: 'Método no permitido.' });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
