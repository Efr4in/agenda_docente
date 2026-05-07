// api/registro.js — WhatsApp Click-to-Chat
const supabase = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const decoded = verifyToken(req);
    const {
      fecha, hora,
      estudiante_id, nombre_estudiante, grado_paralelo,
      telefono_encargado,
      falto_clases, llego_tarde, no_hizo_tarea,
      indisciplina, bajo_rendimiento, perdio_material,
      observacion_adicional,
      enviar_whatsapp
    } = req.body;

    if (!estudiante_id) {
      return res.status(400).json({ error: 'Se requiere el estudiante.' });
    }

    const tieneMarcas = falto_clases || llego_tarde || no_hizo_tarea ||
                        indisciplina || bajo_rendimiento || perdio_material ||
                        observacion_adicional?.trim();
    if (!tieneMarcas) {
      return res.status(400).json({ error: 'Selecciona al menos una observacion o escribe una nota.' });
    }

    // Guardar en Supabase
    const { data: registro, error: insertError } = await supabase
      .from('registros')
      .insert({
        docente_id:            decoded.id,
        estudiante_id,
        fecha:                 fecha || new Date().toISOString().split('T')[0],
        hora:                  hora  || new Date().toTimeString().slice(0,8),
        nombre_docente:        `${decoded.nombre} ${decoded.apellido}`,
        materia:               decoded.materia,
        nombre_estudiante,
        grado_paralelo,
        falto_clases:          !!falto_clases,
        llego_tarde:           !!llego_tarde,
        no_hizo_tarea:         !!no_hizo_tarea,
        indisciplina:          !!indisciplina,
        bajo_rendimiento:      !!bajo_rendimiento,
        perdio_material:       !!perdio_material,
        observacion_adicional: observacion_adicional?.trim() || null,
        whatsapp_enviado:      false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Error al guardar el registro.' });
    }

    // Construir URL WhatsApp Click-to-Chat
    let whatsapp_url = null;
    if (enviar_whatsapp && telefono_encargado) {
      const mensaje = buildMensaje({
        nombre_estudiante, grado_paralelo,
        fecha:   fecha || new Date().toISOString().split('T')[0],
        hora:    hora  || new Date().toTimeString().slice(0,5),
        docente: `${decoded.nombre} ${decoded.apellido}`,
        materia: decoded.materia,
        falto_clases, llego_tarde, no_hizo_tarea,
        indisciplina, bajo_rendimiento, perdio_material,
        observacion_adicional
      });
      const cleanPhone = telefono_encargado.replace(/[^\d]/g, '');
      whatsapp_url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
    }

    return res.status(200).json({
      success:     true,
      registro_id: registro.id,
      whatsapp_url
    });

  } catch (err) {
    console.error('Registro error:', err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};

function buildMensaje(d) {
  const fecha = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const obs = [];
  if (d.falto_clases)     obs.push('❌ Falto a clases');
  if (d.llego_tarde)      obs.push('⏰ Llego tarde');
  if (d.no_hizo_tarea)    obs.push('📚 No hizo la tarea');
  if (d.indisciplina)     obs.push('⚠️ Indisciplina');
  if (d.bajo_rendimiento) obs.push('📉 Bajo rendimiento');
  if (d.perdio_material)  obs.push('🎒 Perdio material');

  let msg = `📋 *REPORTE ESCOLAR*\n`;
  msg += `_U.E.P. Boliviano Holandes_\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 *Estudiante:* ${d.nombre_estudiante}\n`;
  msg += `🎓 *Grado:* ${d.grado_paralelo}\n`;
  msg += `📅 *Fecha:* ${fecha}\n`;
  msg += `⏰ *Hora:* ${d.hora}\n`;
  msg += `👩‍🏫 *Docente:* ${d.docente}\n`;
  msg += `📚 *Materia:* ${d.materia}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 *OBSERVACIONES:*\n`;
  obs.forEach(o => { msg += `  ${o}\n`; });
  if (d.observacion_adicional?.trim()) {
    msg += `\n📝 *Nota:* _${d.observacion_adicional.trim()}_\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Enviado desde el Sistema de Agenda Escolar Digital._`;
  return msg;
}
