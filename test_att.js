const db = require('./db'); db.query('SELECT * FROM attendance ORDER BY id DESC LIMIT 5').then(r=>console.dir(r.rows)).catch(console.error).finally(()=>process.exit());
