async function testPost() {
    try {
        const login = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: "toby", password: "password" })
        });
        const loginData = await login.json();
        const token = loginData.token;

        const payload = {
            user_id: 2,
            name: "M. Tomy Bachtiar",
            date: "2026-02-22",
            status: "DT",
            is_late: false,
            clock_in: "23:45",
            clock_out: "",
            location_in: "Mobile App",
            location_out: ""
        };

        const res = await fetch('http://localhost:3001/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });

        console.log("Status Code:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
testPost();
