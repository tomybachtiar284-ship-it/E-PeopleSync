async function test() {
    try {
        console.log('--- 1. Testing Login ---');
        const loginRes = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) {
            console.error('Login failed:', loginData.message);
            return;
        }
        const token = loginData.token;
        console.log('Login successful, token obtained.');

        console.log('\n--- 2. Testing PUT /api/learning/quiz-attempts/1 ---');
        const updateRes = await fetch('http://localhost:3001/api/learning/quiz-attempts/1', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                score: 80,
                passed: true,
                answers: [],
                status: 'graded'
            })
        });

        console.log('Response Status:', updateRes.status);
        console.log('Content-Type:', updateRes.headers.get('content-type'));

        const text = await updateRes.text();
        console.log('\nResponse Body (first 200 chars):');
        console.log(text.substring(0, 200));

        try {
            const json = JSON.parse(text);
            console.log('\nResponse is valid JSON.');
        } catch (e) {
            console.error('\nResponse is NOT valid JSON.');
        }

    } catch (err) {
        console.error('Test failed with error:', err.message);
    }
}

test();
