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
// function handleGoogleLogin() { ... } // Deprecated for Trial

/**
 * Trial Candidate Login
 * Instantly logs in as a trial candidate for testing.
 */
function handleCandidateTrial() {
    const email = "candidate_trial@kompetenza.com";
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

function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;

    const data = getData();
    const user = data.users.find(u => u.username === username && u.password === password && u.role === 'admin');

    if (user) {
        loginSuccess(user);
    } else {
        alert('Invalid Admin Credentials');
    }
}

function loginSuccess(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Redirect based on role
    switch (user.role) {
        case 'admin':
            window.location.href = '../admin/index.html';
            break;
        case 'manager':
        case 'employee':
            window.location.href = '../dashboard/index.html'; // Or learning hub if preferred
            break;
        case 'candidate':
            window.location.href = '../recruitment/index.html';
            break;
        default:
            window.location.href = '../index.html';
    }
}
