// lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // service key para backend

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
