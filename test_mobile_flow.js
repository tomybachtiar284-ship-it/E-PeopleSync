async function runTest() {
    try {
        // 1. Login to get token for Tomy
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'tomybachtiar284@gmail.com', password: 'password' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) return console.error("Login failed:", loginData);

        // 2. Perform processClock('In') logic
        const payload = {
            user_id: 2,
            name: 'M. Tomy Bachtiar',
            date: '2026-02-22',
            status: 'DT', // Wait, mobile is sending `shiftCode` as `status`. Is it expecting `DT`? Yes, status in db is DT sometimes or Hadir. Let's see what routes/attendance.js does.
            is_late: false,
            clock_in: '23:55',
            clock_out: '',
            location_in: 'Mobile App',
            location_out: ''
        };

        const attRes = await fetch('http://localhost:3001/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        console.log("Attendance API Status:", attRes.status);
        console.log("Attendance API Result:", await attRes.text());
    } catch (err) {
        console.error("Test Error:", err);
    }
}
runTest();
