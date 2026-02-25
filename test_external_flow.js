const { Pool } = require('pg');

async function testExternalApproval() {
    const API_BASE = 'http://localhost:3001';
    let token = '';

    // 1. LOGIN ADMIN to get token (for internal actions if needed)
    const loginRes = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    const loginData = await loginRes.json();
    const authToken = loginData.token;

    console.log('--- PHASE 1: EMPLOYEE SUBMITS LEAVE ---');
    const leavePayload = {
        user_id: 2, // TOBA (NID should be in users table)
        type: 'Cuti Sakit',
        start_date: '2026-04-01',
        end_date: '2026-04-02',
        reason: 'Demam tinggi',
        supervisor_id: '0',
        supervisor_name: 'BUDI WIDJAJA',
        supervisor_email: 'tomybachtiar284@gmail.com',
        manager_id: '1',
        manager_name: 'Wisnu Wijaya',
        manager_email: 'admin@lapakrakyat.local'
    };

    const submitRes = await fetch(`${API_BASE}/api/leave`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(leavePayload)
    });
    const leave = await submitRes.json();
    if (submitRes.ok) {
        console.log('✅ Leave Submitted. ID:', leave.id);
        console.log('Check terminal logs above for Simulated Email content.');
    } else {
        console.error('❌ Failed submit:', leave);
        return;
    }

    // 2. GET TOKEN FROM DB
    const pool = new Pool({
        user: 'postgres', host: 'localhost', database: 'epeoplesync',
        password: 'Bachtiar@94', port: 5432,
    });
    const dbRes = await pool.query('SELECT supervisor_token FROM leave_requests WHERE id = $1', [leave.id]);
    const supervisorToken = dbRes.rows[0].supervisor_token;
    console.log('\n--- PHASE 2: VERIFY token exists ---');
    console.log('Supervisor Token:', supervisorToken);

    // 3. TEST SECURITY: Wrong NID
    console.log('\n--- PHASE 3: TEST SECURITY (Wrong NID) ---');
    const wrongNidRes = await fetch(`${API_BASE}/api/leave/external/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: supervisorToken,
            nid: 'WRONG_NID',
            action: 'approve'
        })
    });
    const wrongNidData = await wrongNidRes.json();
    if (wrongNidRes.status === 403) {
        console.log('✅ Security Check Passed: Wrong NID blocked.');
    } else {
        console.error('❌ Security Check Failed:', wrongNidData);
    }

    // 4. TEST SUCCESS: Correct NID (Assuming user 2 nid from db)
    const userRes = await pool.query('SELECT nid FROM users WHERE id = 2');
    const correctNid = userRes.rows[0].nid;

    console.log('\n--- PHASE 4: TEST SUCCESS (Correct NID) ---');
    const successRes = await fetch(`${API_BASE}/api/leave/external/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: supervisorToken,
            nid: correctNid,
            action: 'approve',
            note: 'Approved via External Link'
        })
    });
    const successData = await successRes.json();
    if (successRes.ok) {
        console.log('✅ External Approval Success!');
        const finalCheck = await pool.query('SELECT status, approved_by FROM leave_requests WHERE id = $1', [leave.id]);
        console.table(finalCheck.rows);
    } else {
        console.error('❌ External Approval Failed:', successData);
    }

    await pool.end();
}

testExternalApproval();
