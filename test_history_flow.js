async function runTest() {
    try {
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'tomybachtiar284@gmail.com', password: 'password' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        const attRes = await fetch('http://localhost:3001/api/attendance?userId=2&month=2026-02', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("History API Status:", attRes.status);
        console.log("History API Data:", await attRes.json());
    } catch (err) {
        console.error("Test Error:", err);
    }
}
runTest();
