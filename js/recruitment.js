/**
 * Recruitment Module Logic
 * Handles Candidate Registration, Job Listing, and Application Submission.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const path = window.location.pathname;

    if (path.includes('register.html')) {
        handleRegistration();
    } else if (path.includes('recruitment/index.html')) {
        checkAuth(['candidate', 'admin', 'manager']);
        updateSidebarForRole();
        loadJobs();
    } else if (path.includes('recruitment/apply.html')) {
        const user = checkAuth(['candidate']);
        initApplicationForm(user);
    }
});

/**
 * Handle Candidate Registration
 */
function handleRegistration() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;

            const data = getData();

            // Check if user exists
            if (data.users.find(u => u.username === username)) {
                alert('Username already exists!');
                return;
            }

            const newUser = {
                id: Date.now(),
                username: username,
                password: password,
                role: 'candidate',
                name: fullName,
                status: 'registered'
            };

            data.users.push(newUser);
            saveData(data);

            alert('Registration successful! Please login.');
            window.location.href = '../login/index.html';
        });
    }
}

/**
 * Load Job Listings for Candidate
 */
function loadJobs() {
    const jobList = document.getElementById('jobList');
    const data = getData();
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (jobList) {
        if (data.jobs.length === 0) {
            jobList.innerHTML = '<p class="text-center">No jobs available at the moment.</p>';
            return;
        }

        jobList.innerHTML = '';
        data.jobs.forEach(job => {
            // Check if already applied
            const applied = data.applications.find(a => a.jobId === job.id && a.candidateId === currentUser.id);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${job.title}</h3>
                <p><strong>Department:</strong> ${job.department}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Type:</strong> ${job.type}</p>
                <div class="mt-3">
                    ${applied
                    ? `<button class="btn btn-secondary" disabled>Applied (${applied.status})</button>`
                    : `<a href="apply.html?jobId=${job.id}" class="btn btn-primary">Apply Now</a>`
                }
                </div>
            `;
            jobList.appendChild(card);
        });
    }
}

/**
 * Initialize Application Form
 */
function initApplicationForm(user) {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');
    const form = document.getElementById('applicationForm');
    const jobTitle = document.getElementById('jobTitleDisplay');

    const data = getData();
    const job = data.jobs.find(j => j.id == jobId);

    if (!job) {
        alert('Job not found!');
        window.location.href = 'index.html';
        return;
    }

    jobTitle.textContent = `Applying for: ${job.title}`;

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // In a real app, we would handle file uploads here.
            // For now, we simulate success.


            const application = {
                id: Date.now(),
                jobId: parseInt(jobId),
                candidateId: user.id,
                status: 'Applied', // Applied -> Testing -> Interview -> Hired/Rejected
                date: new Date().toISOString(),
                testScore: null
            };

            data.applications.push(application);
            saveData(data);

            if (confirm('Application submitted! Do you want to take the online test now?')) {
                window.location.href = `test.html?appId=${application.id}`;
            } else {
                window.location.href = 'index.html';
            }
        });
    }
}

/**
 * Online Test System
 */
if (window.location.pathname.includes('recruitment/test.html')) {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('appId');
    const data = getData();
    const app = data.applications.find(a => a.id == appId);

    if (!app) {
        alert('Application not found');
        window.location.href = 'index.html';
    }

    // Dummy Questions
    const questions = [
        { id: 1, text: "Which HTML tag is used to define an internal style sheet?", options: ["<script>", "<css>", "<style>"], answer: 2 },
        { id: 2, text: "Which property is used to change the background color?", options: ["color", "bgcolor", "background-color"], answer: 2 },
        { id: 3, text: "How do you create a function in JavaScript?", options: ["function myFunction()", "function:myFunction()", "function = myFunction()"], answer: 0 }
    ];

    let currentQuestion = 0;
    let score = 0;

    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const nextBtn = document.getElementById('nextBtn');
    const timerDisplay = document.getElementById('timer');

    // Timer Logic
    let timeLeft = 60; // 60 seconds for demo
    const timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitTest();
        }
    }, 1000);

    function loadQuestion() {
        if (currentQuestion >= questions.length) {
            submitTest();
            return;
        }

        const q = questions[currentQuestion];
        questionText.textContent = `${currentQuestion + 1}. ${q.text}`;
        optionsContainer.innerHTML = '';

        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-block btn-secondary mb-2';
            btn.textContent = opt;
            btn.onclick = () => {
                if (index === q.answer) score++;
                currentQuestion++;
                loadQuestion();
            };
            optionsContainer.appendChild(btn);
        });
    }

    function submitTest() {
        clearInterval(timer);
        app.testScore = Math.round((score / questions.length) * 100);
        app.status = 'Tested';

        // Auto-Ranking Logic (Simple example)
        if (app.testScore >= 70) {
            app.status = 'Interview'; // Promote to Interview if score >= 70
        } else {
            app.status = 'Rejected';
        }

        saveData(data);
        alert(`Test Completed! Your Score: ${app.testScore}. Status: ${app.status}`);
        window.location.href = 'index.html';
    }

    loadQuestion();
}

/**
 * Job Management (Admin)
 */
function openJobModal() {
    document.getElementById('createJobModal').style.display = 'block';
}

function closeJobModal() {
    document.getElementById('createJobModal').style.display = 'none';
}

// Handle Create Job Form
const createJobForm = document.getElementById('createJobForm');
if (createJobForm) {
    createJobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('jobTitle').value;
        const dept = document.getElementById('jobDept').value;
        const loc = document.getElementById('jobLoc').value;
        const type = document.getElementById('jobType').value;

        const data = getData();
        const newJob = {
            id: Date.now(),
            title: title,
            department: dept,
            location: loc,
            type: type
        };

        data.jobs.push(newJob);
        saveData(data);

        alert('Job Posted Successfully!');
        closeJobModal();
        location.reload(); // Refresh to update counts
    });
}

/**
 * Delete Job (Admin)
 */
function deleteJob(id) {
    if (confirm('Are you sure you want to delete this job?')) {
        const data = getData();
        data.jobs = data.jobs.filter(j => j.id !== id);
        saveData(data);
        location.reload();
    }
}
