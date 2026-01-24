import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continuar sin usuario
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        req.user = decoded;
        next();
    } catch (err) {
        // Si el token es inválido, simplemente lo ignoramos y seguimos como anónimo
        // o podríamos devolver error si preferimos. Por ahora, anónimo.
        console.warn('Token inválido en optionalAuth, procediendo como anónimo');
        next();
    }
}
