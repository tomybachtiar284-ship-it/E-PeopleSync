async function testWorkflow() {
    const API_BASE = 'http://localhost:3001';
    let token = '';

    console.log('--- PHASE 1: LOGIN ---');
    try {
        const loginRes = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
            token = loginData.token;
            console.log('✅ Login Success');
        } else {
            console.error('❌ Login Failed:', loginData.message);
            return;
        }
    } catch (e) {
        console.error('Login error:', e.message);
        return;
    }

    console.log('\n--- PHASE 2: VERIFY SETTINGS API ---');
    try {
        const settingsRes = await fetch(`${API_BASE}/api/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const settingsData = await settingsRes.json();
        if (settingsRes.ok) {
            console.log('✅ Settings Data:', JSON.stringify(settingsData.companyApprovers, null, 2));
        } else {
            console.error('❌ Settings Failed');
        }
    } catch (e) { console.error('Settings error:', e.message); }

    console.log('\n--- PHASE 3: TEST LEAVE SUBMISSION ---');
    const payload = {
        user_id: 2,
        type: 'Cuti Tahunan',
        start_date: '2026-03-01', end_date: '2026-03-05',
        reason: 'Sync Approver Test',
        status: 'waiting_supervisor',
        supervisor_id: '0', supervisor_name: 'BUDI WIDJAJA', supervisor_email: 'tomybachtiar284@gmail.com',
        manager_id: '1', manager_name: 'Wisnu Wijaya', manager_email: 'admin@lapakrakyat.local'
    };
    try {
        const leaveRes = await fetch(`${API_BASE}/api/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const leaveData = await leaveRes.json();
        if (leaveRes.ok) {
            console.log('✅ Leave Created:', leaveData.id);

            const { Pool } = require('pg');
            const pool = new Pool({
                user: 'postgres', host: 'localhost', database: 'epeoplesync',
                password: 'Bachtiar@94', port: 5432,
            });
            const dbRes = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [leaveData.id]);
            console.log('--- DB VERIFICATION ---');
            console.table(dbRes.rows);
            await pool.end();
        } else {
            console.error('❌ Leave Submission Failed:', leaveData);
        }
    } catch (e) { console.error('Leave test error:', e.message); }
}

testWorkflow();
