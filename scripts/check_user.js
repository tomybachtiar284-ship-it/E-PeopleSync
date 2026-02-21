require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'epeoplesync',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function checkUser() {
    try {
        const res = await pool.query("SELECT id, username, nid, name FROM users WHERE username = 'tomy'");
        console.log('--- USER DATA CHECK ---');
        console.table(res.rows);
        if (res.rows.length === 0) {
            console.log('User "tomy" NOT FOUND.');
        } else {
            console.log(`NID stored in DB: "${res.rows[0].nid}"`);
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkUser();
