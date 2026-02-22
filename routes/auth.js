const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required.' });
    }
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR nid = $1',
            [username]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            // Cek password (bisa plain text / hashed - handle transisi)
            let isMatch = false;
            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                isMatch = (password === user.password);
            }

            if (isMatch) {
                // Generate Token
                const token = jwt.sign(
                    { id: user.id, username: user.username, role: user.role },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES_IN }
                );

                // Hilangkan password dari output
                delete user.password;
                res.json({ success: true, user, token });
            } else {
                res.status(401).json({ success: false, message: 'Password salah.' });
            }
        } else {
            res.status(401).json({ success: false, message: 'User tidak ditemukan.' });
        }
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/auth/register
// Digunakan untuk registrasi kandidat standar via form
router.post('/register', async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insertResult = await pool.query(
            `INSERT INTO users (username, password, role, name, status, source)
             VALUES ($1, $2, 'candidate', $3, 'registered', 'internal')
             RETURNING *`,
            [username, hashedPassword, name]
        );

        const newUser = insertResult.rows[0];

        // Generate Token
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({ success: true, message: 'Registration successful.', user: newUser, token });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/auth/register-candidate
// Digunakan oleh Google Login (simulasi OAuth) untuk kandidat.
// - Jika email sudah ada & role = candidate → return user (login)
// - Jika email sudah ada & role ≠ candidate → return error (internal user)
// - Jika belum ada → INSERT kandidat baru → return user
router.post('/register-candidate', async (req, res) => {
    const { email, name } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Email tidak valid.' });
    }

    try {
        // Cek apakah email sudah terdaftar
        const existing = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            if (user.role === 'candidate') {
                // Returning candidate — login langsung
                return res.json({ success: true, isNew: false, user });
            } else {
                // Email terdaftar sebagai internal user
                return res.status(403).json({
                    success: false,
                    message: `Email ${email} terdaftar sebagai Internal ${user.role}. Gunakan form Internal Login.`
                });
            }
        }

        // Email belum ada → daftarkan sebagai kandidat baru
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Nama wajib diisi untuk mendaftar.' });
        }

        const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
        const insertResult = await pool.query(
            `INSERT INTO users (username, password, role, name, email, avatar, source)
             VALUES ($1, $2, 'candidate', $3, $4, $5, 'google_oauth')
             RETURNING *`,
            [email, 'google_auth_token', name.trim(), email, avatar]
        );

        const newUser = insertResult.rows[0];

        // Generate Token
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(201).json({ success: true, isNew: true, user: newUser, token });

    } catch (err) {
        console.error('Register candidate error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
