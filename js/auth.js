/**
 * Authentication Logic
 * Handles Google Login (Candidate) and Internal Login (Admin/Manager/Employee).
 */

document.addEventListener('DOMContentLoaded', () => {
    const adminForm = document.getElementById('adminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
});

/**
 * Candidate Login (Google Simulation)
 * Strictly for Candidates. Menggunakan backend API (PostgreSQL).
 */
async function handleGoogleLogin() {
    // 1. Simulasi Google OAuth Popup — minta email
    const email = prompt("Google Accounts\n\nLogin/Register as Candidate with Email:");

    if (!email || !email.includes('@')) {
        if (email) alert("Please enter a valid email address.");
        return;
    }

    try {
        // 2. Cek & daftarkan ke backend (akan cek dulu apakah sudah ada)
        const result = await fetch('http://localhost:3001/api/auth/register-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: null })
        });
        const data = await result.json();

        // 3. Jika email milik user internal → tolak
        if (result.status === 403) {
            alert(data.message);
            return;
        }

        // 4. Jika kandidat lama → login langsung
        if (data.success && !data.isNew) {
            alert(`Welcome back, ${data.user.name}!`);
            loginSuccess(data.user, data.token);
            return;
        }

        // 5. Jika kandidat baru → minta nama dulu, lalu daftarkan
        const name = prompt("Setup your Candidate Profile\n\nEnter your Full Name:");
        if (!name || name.trim() === '') return;

        const registerResult = await fetch('http://localhost:3001/api/auth/register-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: name.trim() })
        });
        const registerData = await registerResult.json();

        if (registerData.success) {
            alert(`Candidate Account created!\nWelcome, ${registerData.user.name}. You can now browse jobs.`);
            loginSuccess(registerData.user, registerData.token);
        } else {
            alert(registerData.message || 'Registration failed. Please try again.');
        }

    } catch (error) {
        console.error('Google Login Error:', error);
        alert('Server connection failed. Is the backend running?');
    }
}

/**
 * Internal Login (Form)
 * Strictly for Admin, Manager, Employee
 */
async function handleStandardLogin(e) {
    e.preventDefault();
    const username = document.getElementById('intUser').value;
    const password = document.getElementById('intPass').value;

    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            if (['admin', 'manager', 'employee'].includes(user.role)) {
                loginSuccess(user, data.token);
            } else if (user.role === 'candidate') {
                alert("Candidates should use the 'Continue with Google' button above.");
            } else {
                alert("Unknown role.");
            }
        } else {
            alert(data.message || 'Invalid Credentials');
        }
    } catch (error) {
        console.error('Login Error:', error);
        alert('Server connection failed. Is the backend running?');
    }
}

function loginSuccess(user, token) {
    if (token) localStorage.setItem('jwtToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));

    const isMobile = window.innerWidth < 768;

    // Redirect based on role
    switch (user.role) {
        case 'admin':
            window.location.href = '../admin/index.html';
            break;
        case 'manager':
        case 'employee':
            if (isMobile) {
                window.location.href = '../mobile/index.html';
            } else {
                window.location.href = '../dashboard/index.html';
            }
            break;
        case 'candidate':
            window.location.href = '../recruitment/index.html';
            break;
        default:
            window.location.href = '../index.html';
    }
}
