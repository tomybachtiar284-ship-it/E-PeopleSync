const db = require('./db');
db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'attendance'").then(r => {
    console.table(r.rows);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
