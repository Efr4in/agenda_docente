// api/historial.js
const supabase = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const decoded = verifyToken(req);

    // ── GET: historial del docente ──
    if (req.method === 'GET') {
      const { limit = 50, stats, summary, year, month } = req.query;

      // STATS: totales del docente
      if (stats === '1') {
        const { data: todos } = await supabase
          .from('registros')
          .select('id, whatsapp_enviado, estudiante_id, fecha, created_at')
          .eq('docente_id', decoded.id);

        const hoy = new Date().toISOString().split('T')[0];
        const estudiantesUnicos = new Set(todos?.map(r => r.estudiante_id)).size;

        return res.status(200).json({
          stats: {
            total:              todos?.length || 0,
            hoy:                todos?.filter(r => r.fecha === hoy).length || 0,
            wa_enviados:        todos?.filter(r => r.whatsapp_enviado).length || 0,
            estudiantes_unicos: estudiantesUnicos
          }
        });
      }

      // SUMMARY: resumen por día para el calendario (año/mes)
      if (summary === '1' && year && month) {
        const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
        const lastDay   = new Date(year, month, 0).getDate();
        const endDate   = `${year}-${String(month).padStart(2,'0')}-${lastDay}`;

        const { data: registros } = await supabase
          .from('registros')
          .select('fecha')
          .eq('docente_id', decoded.id)
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        // Agrupar por fecha
        const counts = {};
        (registros || []).forEach(r => {
          counts[r.fecha] = (counts[r.fecha] || 0) + 1;
        });
        const summary_arr = Object.entries(counts).map(([fecha, count]) => ({ fecha, count }));

        return res.status(200).json({ summary: summary_arr });
      }

      // LISTADO: registros paginados del docente
      const { data: registros, error } = await supabase
        .from('registros')
        .select(`
          id, fecha, hora,
          nombre_estudiante, grado_paralelo,
          nombre_docente, materia,
          falto_clases, llego_tarde, no_hizo_tarea,
          indisciplina, bajo_rendimiento, perdio_material,
          observacion_adicional,
          whatsapp_enviado, created_at
        `)
        .eq('docente_id', decoded.id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;
      return res.status(200).json({ registros: registros || [] });
    }

    // ── DELETE: borrar historial completo del docente ──
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('registros')
        .delete()
        .eq('docente_id', decoded.id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Historial borrado correctamente.' });
    }

    return res.status(405).json({ error: 'Método no permitido.' });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
