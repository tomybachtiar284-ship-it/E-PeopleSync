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
function handleGoogleLogin() {
    // 1. Simulate Google OAuth Popup
    const email = prompt("Simulating Google Login...\n\nPlease enter your Email Address:");

    if (!email || !email.includes('@')) {
        if (email) alert("Please enter a valid email address.");
        return;
    }

    const data = getData();
    let user = data.users.find(u => u.username === email);

    if (user) {
        // User exists - Login
        alert(`Welcome back, ${user.name}!`);
        loginSuccess(user);
    } else {
        // New User - Auto Registration
        const name = prompt("Email not found. Registering new Employee...\n\nEnter your Full Name:");

        if (!name) return;

        const newUser = {
            id: Date.now(),
            username: email,
            password: 'google_auth_token', // Dummy password for OAuth users
            role: 'employee', // Default role
            name: name,
            email: email,
            avatar: `https://i.pravatar.cc/150?u=${email}`, // Simulated Google Photo
            source: 'google_oauth'
        };

        data.users.push(newUser);
        saveData(data);

        alert(`Account created successfully!\nWelcome, ${name}.`);
        loginSuccess(newUser);
    }
}

/**
 * Trial Candidate Login
 * Instantly logs in as a trial candidate for testing.
 */
function handleCandidateTrial() {
    const email = "candidate_trial@epeoplesync.com";
    const data = getData();
    let user = data.users.find(u => u.username === email);

    if (!user) {
        // Create new Trial Account with FIXED ID to ensure persistence
        user = {
            id: 99999, // Fixed ID
            username: email,
            password: '',
            role: 'candidate',
            name: 'Trial Candidate',
            status: 'registered',
            source: 'trial'
        };
        data.users.push(user);
        saveData(data);
    } else {
        // MIGRATION: Update legacy trial users to fixed ID
        if (user.id !== 99999) {
            const oldId = user.id;
            console.warn(`Migrating trial user from ID ${oldId} to 99999...`);

            // Update user ID
            user.id = 99999;

            // Migrate all related data
            if (data.quizAttempts) {
                data.quizAttempts.forEach(attempt => {
                    if (attempt.userId === oldId) attempt.userId = 99999;
                });
            }

            if (data.enrollments) {
                data.enrollments.forEach(enrollment => {
                    if (enrollment.userId === oldId) enrollment.userId = 99999;
                });
            }

            if (data.applications) {
                data.applications.forEach(app => {
                    if (app.candidateId === oldId) app.candidateId = 99999;
                });
            }

            if (data.certificates) {
                data.certificates.forEach(cert => {
                    if (cert.userId === oldId) cert.userId = 99999;
                });
            }

            saveData(data);
            console.log('Migration complete!');
        }
    }

    loginSuccess(user);
}

/**
 * handleTrialLogin
 * Logs in as a specific role for trial purposes
 */
function handleTrialLogin(role) {
    const data = getData();
    let user;

    if (role === 'employee') {
        user = data.users.find(u => u.username === 'tomy' || u.name.toUpperCase().includes('TOMY'));
    } else if (role === 'manager') {
        user = data.users.find(u => u.username === 'manager');
    } else if (role === 'admin') {
        user = data.users.find(u => u.username === 'admin');
    }

    if (user) {
        alert(`Trial Login: Entering as ${user.name} (${role})`);
        loginSuccess(user);
    } else {
        alert(`Error: ${role} data not found in system.`);
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;

    const data = getData();
    // Allow admin, manager, and employee to login via this form
    const user = data.users.find(u => u.username === username && u.password === password && ['admin', 'manager', 'employee'].includes(u.role));

    if (user) {
        loginSuccess(user);
    } else {
        alert('Invalid Admin Credentials');
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
