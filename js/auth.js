/**
 * Authentication Logic
 * Handles Google Login and Admin Login.
 */

document.addEventListener('DOMContentLoaded', () => {
    const adminForm = document.getElementById('adminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
});

/**
 * Mock Google Login
 * Prompts user for email to simulate OAuth logic
 */
/**
 * Mock Google Login
 * Prompts user for email/name to simulate OAuth logic and auto-registers employees.
 */
/**
 * Candidate Login (Google Simulation)
 * Strictly for Candidates. 
 */
function handleGoogleLogin() {
    // 1. Simulate Google OAuth Popup
    const email = prompt("Google Accounts\n\nLogin/Register as Candidate with Email:");

    if (!email || !email.includes('@')) {
        if (email) alert("Please enter a valid email address.");
        return;
    }

    const data = getData();
    let user = data.users.find(u => u.username === email);

    if (user) {
        // User exists
        if (user.role === 'candidate') {
            alert(`Welcome back, candidate ${user.name}!`);
            loginSuccess(user);
        } else {
            // If user is Admin/Employee trying to use Google Login on the Candidate button
            alert(`Email ${email} is registered as an Internal ${user.role}.\nPlease use the Internal Login form below.`);
        }
    } else {
        // New User -> Register as CANDIDATE
        const name = prompt("Setup your Candidate Profile\n\nEnter your Full Name:");
        if (!name) return;

        const newUser = {
            id: Date.now(),
            username: email,
            password: 'google_auth_token',
            role: 'candidate',
            name: name,
            email: email,
            avatar: `https://i.pravatar.cc/150?u=${email}`,
            source: 'google_oauth'
        };

        data.users.push(newUser);
        saveData(data);

        alert(`Candidate Account created!\nWelcome, ${name}. You can now browse jobs.`);
        loginSuccess(newUser);
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
                loginSuccess(user);
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

function loginSuccess(user) {
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
