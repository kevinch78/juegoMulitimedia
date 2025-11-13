const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validar que se proporcionen todos los campos
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Usuario ya registrado' });
        }
        
        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Crear usuario
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Usuario ya registrado' });
        }
        res.status(500).json({ message: 'Error en el registro', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validar que se proporcionen los campos
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son requeridos' });
        }
        
        // Buscar usuario
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Contraseña o usuario incorrectos' });
        }
        
        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }
        
        // Generar token
        const token = jwt.sign(
            { userId: user._id, email: user.email, accessLevel: user.accessLevel },
            process.env.JWT_SECRET || 'secreto_jwt',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email 
            } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el login', error: error.message });
    }
};

exports.verify = async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.json({ valid: false });
        }
        
        jwt.verify(token, process.env.JWT_SECRET || 'secreto_jwt', (err, decoded) => {
            if (err) {
                return res.json({ valid: false });
            }
            res.json({ valid: true, user: decoded });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en verificación', error: error.message });
    }
};
