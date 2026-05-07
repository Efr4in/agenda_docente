// api/admin/stats.js  — Panel de estadísticas globales para el admin
const supabase = require('../../lib/supabase');
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    verifyAdmin(req);

    const hoy = new Date().toISOString().split('T')[0];

    // Consultas en paralelo para performance
    const [
      { count: totalDocentes },
      { count: totalEstudiantes },
      { count: totalRegistros },
      { count: solicitudesPendientes },
      { count: waEnviados },
      { count: registrosHoy },
      { data: solicitudes },
      { data: docentes },
      { data: registrosRecientes }
    ] = await Promise.all([
      supabase.from('docentes').select('*', { count: 'exact', head: true }).eq('activo', true).eq('solicitud_pendiente', false),
      supabase.from('estudiantes').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('registros').select('*', { count: 'exact', head: true }),
      supabase.from('docentes').select('*', { count: 'exact', head: true }).eq('solicitud_pendiente', true),
      supabase.from('registros').select('*', { count: 'exact', head: true }).eq('whatsapp_enviado', true),
      supabase.from('registros').select('*', { count: 'exact', head: true }).eq('fecha', hoy),
      supabase.from('docentes').select('id, nombre, apellido, email, materia').eq('solicitud_pendiente', true).limit(10),
      supabase.from('docentes').select('id, nombre, apellido, email, materia, grado_asignado, activo').eq('activo', true).eq('solicitud_pendiente', false).limit(20),
      supabase.from('registros').select('id, fecha, hora, nombre_estudiante, nombre_docente, materia, falto_clases, llego_tarde, indisciplina').order('created_at', { ascending: false }).limit(10)
    ]);

    return res.status(200).json({
      stats: {
        docentes:    totalDocentes    || 0,
        estudiantes: totalEstudiantes || 0,
        registros:   totalRegistros   || 0,
        solicitudes: solicitudesPendientes || 0,
        wa:          waEnviados       || 0,
        hoy:         registrosHoy     || 0
      },
      solicitudes:         solicitudes        || [],
      docentes:            docentes           || [],
      registros_recientes: registrosRecientes || []
    });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
