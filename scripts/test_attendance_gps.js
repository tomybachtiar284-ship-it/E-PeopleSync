const pool = require('../db');

const API = 'http://localhost:3001/api/attendance';

async function runTests() {
    console.log('--- STARTING GPS ATTENDANCE TESTS ---\n');

    try {
        // 1. Set office coordinates statically for testing
        const officeLat = -6.1753924; // Monas
        const officeLon = 106.8271528;
        const maxRadius = 100;

        await pool.query(
            `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) 
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            ['attendanceConfig', JSON.stringify({ officeLat, officeLon, maxRadius })]
        );
        console.log(`✅ Test Config Set: Office [${officeLat}, ${officeLon}], Radius: ${maxRadius}m`);

        // Fetch an existing user for testing to avoid constraint errors
        const userRes = await pool.query('SELECT id, role FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.error('❌ No users found in database to test with.');
            process.exit(1);
        }
        const userId = userRes.rows[0].id;
        console.log(`✅ Fetched existing user: ID ${userId}`);

        // Generate Auth Token
        const jwt = require('jsonwebtoken');
        require('dotenv').config({ path: '../.env' });
        const token = jwt.sign({ id: userId, role: userRes.rows[0].role }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '1h' });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // A small valid base64 image (1x1 pixel red)
        const dummyBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        const today = new Date().toISOString().split('T')[0];

        // --- TEST 1: Clock In WITHIN Radius ---
        console.log('\n▶ TEST 1: Clock In WITHIN Radius (Distance < 100m)');
        const validLat = -6.1754000; // Very close to Monas
        const validLon = 106.8272000;

        let res1 = await fetch(API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                user_id: userId,
                date: today,
                clock_in: '08:00',
                shift_code: 'DT',
                status: 'Hadir',
                lat: validLat,
                lon: validLon,
                photoBase64: dummyBase64
            })
        });
        let data1 = await res1.json();
        if (data1.location_status === 'Valid') {
            console.log(`✅ PASS: Status is '${data1.location_status}'. Distance info: ${data1.location}`);
            console.log(`   Expected 'Valid' because coordinate is near office.`);
        } else {
            console.error(`❌ FAIL: Expected 'Valid', got '${data1.location_status}'. Distance info: ${data1.location}`);
            console.log('Response payload 1:', JSON.stringify(data1, null, 2));
            require('fs').writeFileSync('debug.json', JSON.stringify(data1, null, 2));
        }

        // --- TEST 2: Clock Out OUTSIDE Radius ---
        console.log('\n▶ TEST 2: Clock Out OUTSIDE Radius (Distance > 100m)');
        const invalidLat = -6.2000000; // Far from Monas (Sudirman area)
        const invalidLon = 106.8000000;

        let res2 = await fetch(API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                user_id: userId,
                date: today,
                clock_out: '17:00',
                shift_code: 'DT',
                status: 'Hadir',
                lat: invalidLat,
                lon: invalidLon,
                photoBase64: dummyBase64
            })
        });
        let data2 = await res2.json();

        if (data2.location_status === 'Luar Jarak') {
            console.log(`✅ PASS: Status is '${data2.location_status}'. Distance info: ${data2.location}`);
            console.log(`   Expected 'Luar Jarak' because coordinate is far from office.`);
        } else {
            console.error(`❌ FAIL: Expected 'Luar Jarak', got '${data2.location_status}'. Distance info: ${data2.location}`);
        }

        // Clean up test data
        await pool.query('DELETE FROM attendance WHERE user_id = $1 AND date = $2', [userId, today]);
        console.log('\n🧹 Test data cleaned up.');

    } catch (err) {
        console.error('❌ Test execution failed:', err);
    } finally {
        process.exit(0);
    }
}

runTests();
