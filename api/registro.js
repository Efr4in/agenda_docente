// api/registro.js
const supabase = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');
const fetch = require('node-fetch');

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
      telefono_encargado, callmebot_apikey,
      falto_clases, llego_tarde, no_hizo_tarea,
      indisciplina, bajo_rendimiento, perdio_material,
      observacion_adicional,
      enviar_whatsapp
    } = req.body;

    if (!estudiante_id) {
      return res.status(400).json({ error: 'Se requiere el estudiante.' });
    }

    // Verificar que al menos una observación está marcada
    const tieneMarcas = falto_clases || llego_tarde || no_hizo_tarea ||
                        indisciplina || bajo_rendimiento || perdio_material ||
                        observacion_adicional?.trim();
    if (!tieneMarcas) {
      return res.status(400).json({ error: 'Selecciona al menos una observación o escribe una nota.' });
    }

    // Guardar registro en la base de datos
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

    // Enviar WhatsApp si está habilitado y hay número
    let whatsappEnviado = false;
    let whatsappError   = null;

    if (enviar_whatsapp && telefono_encargado) {
      const mensaje = buildWhatsAppMessage({
        nombre_estudiante,
        grado_paralelo,
        fecha:      fecha || new Date().toISOString().split('T')[0],
        hora:       hora  || new Date().toTimeString().slice(0,5),
        docente:    `${decoded.nombre} ${decoded.apellido}`,
        materia:    decoded.materia,
        falto_clases, llego_tarde, no_hizo_tarea,
        indisciplina, bajo_rendimiento, perdio_material,
        observacion_adicional
      });

      const waResult = await sendWhatsApp(telefono_encargado, callmebot_apikey, mensaje);
      whatsappEnviado = waResult.success;
      whatsappError   = waResult.error || null;

      // Actualizar estado en BD
      await supabase
        .from('registros')
        .update({
          whatsapp_enviado:    whatsappEnviado,
          whatsapp_enviado_at: whatsappEnviado ? new Date().toISOString() : null,
          whatsapp_error:      whatsappError
        })
        .eq('id', registro.id);
    }

    return res.status(200).json({
      success: true,
      registro_id:      registro.id,
      whatsapp_enviado: whatsappEnviado,
      whatsapp_error:   whatsappError
    });

  } catch (err) {
    console.error('Registro error:', err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};

// ── BUILDER DEL MENSAJE WHATSAPP ──
function buildWhatsAppMessage(data) {
  const fecha = new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const observaciones = [];
  if (data.falto_clases)     observaciones.push('❌ Faltó a clases');
  if (data.llego_tarde)      observaciones.push('⏰ Llegó tarde');
  if (data.no_hizo_tarea)    observaciones.push('📚 No hizo la tarea');
  if (data.indisciplina)     observaciones.push('⚠️ Indisciplina');
  if (data.bajo_rendimiento) observaciones.push('📉 Bajo rendimiento');
  if (data.perdio_material)  observaciones.push('🎒 Perdió material');

  let msg = `📋 *REPORTE ESCOLAR*\n`;
  msg += `U.E.P. Boliviano Holandés\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 *Estudiante:* ${data.nombre_estudiante}\n`;
  msg += `🎓 *Grado:* ${data.grado_paralelo}\n`;
  msg += `📅 *Fecha:* ${fecha}\n`;
  msg += `⏰ *Hora:* ${data.hora}\n`;
  msg += `👩‍🏫 *Docente:* ${data.docente}\n`;
  msg += `📚 *Materia:* ${data.materia}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 *OBSERVACIONES:*\n`;
  if (observaciones.length > 0) {
    observaciones.forEach(obs => { msg += `  ${obs}\n`; });
  }
  if (data.observacion_adicional?.trim()) {
    msg += `\n📝 *Nota del docente:*\n  _${data.observacion_adicional.trim()}_\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Mensaje enviado automáticamente desde el Sistema de Agenda Escolar Digital._`;

  return msg;
}

// ── ENVÍO VÍA CALLMEBOT ──
// El encargado debe registrarse en: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// Le llega una API KEY a su WhatsApp. Con esa key + su número, se pueden enviar mensajes.
async function sendWhatsApp(phone, apikey, message) {
  try {
    // Limpiar número: solo dígitos con código de país (sin +, sin espacios)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    // Si no hay apikey de Callmebot, no se puede enviar (usuario no registrado)
    if (!apikey) {
      return {
        success: false,
        error: 'El encargado no tiene API key de Callmebot registrada. ' +
               'Debe registrarse en callmebot.com para recibir mensajes automáticos.'
      };
    }

    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMsg}&apikey=${apikey}`;

    const response = await fetch(url, { timeout: 8000 });
    const text = await response.text();

    // Callmebot responde con texto que incluye "Message queued" si fue exitoso
    if (response.ok && (text.includes('queued') || text.includes('Message'))) {
      return { success: true };
    } else {
      return { success: false, error: `Callmebot respondió: ${text.slice(0,100)}` };
    }
  } catch (err) {
    return { success: false, error: `Error de red al enviar WhatsApp: ${err.message}` };
  }
}
