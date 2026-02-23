const pool = require('./db');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, username, password, role FROM users');
        console.log('--- Users ---');
        res.rows.forEach(u => {
            const isHashed = u.password.startsWith('$2a$') || u.password.startsWith('$2b$');
            console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, PasswordHashed: ${isHashed}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUsers();
