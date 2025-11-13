const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido.' });
    jwt.verify(token, process.env.JWT_SECRET || 'secreto_jwt', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido.' });
        req.user = decoded;
        next();
    });
};
