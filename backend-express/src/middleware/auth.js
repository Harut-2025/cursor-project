const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.userId = payload.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Неверный или истёкший токен' });
  }
}

module.exports = authMiddleware;

