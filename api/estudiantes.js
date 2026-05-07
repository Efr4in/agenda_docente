// api/estudiantes.js
const supabase = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const decoded = verifyToken(req);

    if (req.method === 'GET') {
      const { codigo } = req.query;

      if (!codigo) {
        return res.status(400).json({ error: 'Se requiere el código del estudiante.' });
      }

      // Buscar estudiante por código de 4 dígitos
      const { data: estudiante, error } = await supabase
        .from('estudiantes')
        .select('id, codigo, nombre, apellido, grado, paralelo, nombre_encargado, parentesco, telefono_encargado, callmebot_apikey, activo')
        .eq('codigo', codigo.padStart(4, '0'))
        .eq('activo', true)
        .single();

      if (error || !estudiante) {
        return res.status(404).json({ error: `Estudiante con código "${codigo}" no encontrado.` });
      }

      return res.status(200).json({ estudiante });
    }

    return res.status(405).json({ error: 'Método no permitido.' });

  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
