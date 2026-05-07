// lib/auth.js  — middleware reutilizable para verificar JWT

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'agenda_secret_key_cambia_esto';

/**
 * Verifica el token JWT del header Authorization.
 * Retorna el payload decodificado o lanza un error.
 */
function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Token no proporcionado.');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch(e) {
    const err = new Error('Token inválido o expirado.');
    err.statusCode = 401;
    throw err;
  }
}

/**
 * Verifica token y que el usuario sea admin.
 */
function verifyAdmin(req) {
  const user = verifyToken(req);
  if (user.role !== 'admin') {
    const err = new Error('Acceso denegado. Se requiere rol de administrador.');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

module.exports = { verifyToken, verifyAdmin };
