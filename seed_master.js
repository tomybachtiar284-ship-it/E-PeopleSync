const pool = require('./db');
async function seed() {
    try {
        console.log('Seeding master data...');
        const defaultApprovers = [
            { name: 'Admin HR', position: 'HR Manager', email: 'admin@peoplesync.com' },
            { name: 'Tomy Bachtiar', position: 'Director', email: 'tomy@peoplesync.com' }
        ];
        const defaultLocs = ['Jakarta HQ', 'Bandung Office', 'Surabaya Plant'];
        const defaultGroups = ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D'];

        await pool.query("INSERT INTO settings (key, value) VALUES ('companyApprovers', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify(defaultApprovers)]);
        await pool.query("INSERT INTO settings (key, value) VALUES ('locations', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify(defaultLocs)]);
        await pool.query("INSERT INTO settings (key, value) VALUES ('employee_groups', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify(defaultGroups)]);

        console.log('Seeding finished successfully');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
}
seed();
