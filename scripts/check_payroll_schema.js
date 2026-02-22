require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("SELECT column_name FROM information_schema.columns WHERE table_name='payroll_records' ORDER BY ordinal_position")
    .then(r => {
        if (r.rows.length === 0) console.log('TABLE NOT FOUND');
        else console.log('Columns:', r.rows.map(x => x.column_name).join(', '));
        p.end();
    })
    .catch(e => { console.error(e.message); p.end(); });
