const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_123!';

module.exports = function authMiddleware(req, res, next) {
  let token = null;

  // Try to get token from cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email
    };
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
