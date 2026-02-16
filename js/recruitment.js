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
        checkAuth(['candidate', 'admin', 'manager', 'employee']);
        updateSidebarForRole();
        initUserProfile();
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

            // Time Calculation
            let deadlineHtml = '';
            let isClosed = false;

            if (job.closingDate) {
                const today = new Date();
                const close = new Date(job.closingDate);
                const diffTime = close - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    isClosed = true;
                    deadlineHtml = `<span class="badge badge-danger">Closed</span>`;
                } else if (diffDays <= 3) {
                    deadlineHtml = `<span class="text-danger"><i class="far fa-clock"></i> Ends in ${diffDays} days</span>`;
                } else {
                    deadlineHtml = `<span class="text-muted"><i class="far fa-calendar-alt"></i> Open until ${new Date(job.closingDate).toLocaleDateString()}</span>`;
                }
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <h3>${job.title}</h3>
                    ${deadlineHtml}
                </div>
                <p><strong>Department:</strong> ${job.department}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Type:</strong> ${job.type}</p>
                <div class="mt-3">
                    ${isClosed
                    ? `<button class="btn btn-secondary" disabled>Position Closed</button>`
                    : (applied
                        ? `<button class="btn btn-secondary" disabled>Applied (${applied.status})</button>`
                        : `<a href="apply.html?jobId=${job.id}" class="btn btn-primary">Apply Now</a>`
                    )
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

            const cvInput = document.getElementById('cvFile');
            const coverLetter = document.getElementById('coverLetter').value;
            const file = cvInput.files[0];

            if (file && file.size > 2 * 1024 * 1024) { // 2MB limit
                alert('File is too large! Max 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const cvData = e.target.result; // Base64 string

                const application = {
                    id: Date.now(),
                    jobId: parseInt(jobId),
                    candidateId: user.id,
                    status: 'Applied',
                    date: new Date().toISOString(),
                    testScore: null,
                    coverLetter: coverLetter,
                    cvData: cvData,
                    cvName: file ? file.name : 'resume.pdf'
                };

                data.applications.push(application);
                saveData(data);

                if (confirm('Application submitted! Do you want to take the online test now?')) {
                    window.location.href = `test.html?appId=${application.id}`;
                } else {
                    window.location.href = 'index.html';
                }
            };

            if (file) {
                reader.readAsDataURL(file);
            } else {
                // Fallback if no file (shouldn't happen due to required attrib)
                alert('Please upload a CV.');
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

    // Load Questions from Data
    const defaults = [
        { id: 1, text: "Which HTML tag is used to define an internal style sheet?", options: ["<script>", "<css>", "<style>"], answer: 2 },
        { id: 2, text: "Which property is used to change the background color?", options: ["color", "bgcolor", "background-color"], answer: 2 },
        { id: 3, text: "How do you create a function in JavaScript?", options: ["function myFunction()", "function:myFunction()", "function = myFunction()"], answer: 0 }
    ];

    const questions = data.recruitmentQuestions && data.recruitmentQuestions.length > 0
        ? data.recruitmentQuestions
        : defaults;

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

        // Fix: Do not auto-reject. Set to 'Review' so Admin can decide.
        // app.status = 'Tested'; 
        app.status = 'Review';

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
        const closingDate = document.getElementById('jobClosingDate').value;

        const data = getData();
        const newJob = {
            id: Date.now(),
            title: title,
            department: dept,
            location: loc,
            type: type,
            closingDate: closingDate
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
    if (confirm('Are you sure you want to delete this job? This will also remove all candidate applications for this role.')) {
        const data = getData();

        // 1. Delete Job
        data.jobs = data.jobs.filter(j => j.id !== id);

        // 2. Delete Applications
        const appCount = data.applications.filter(a => a.jobId === id).length;
        data.applications = data.applications.filter(a => a.jobId !== id);

        saveData(data);
        alert(`Job deleted successfully. (${appCount} applications removed)`);
        location.reload();
    }
}

/**
 * Test Management (Admin)
 */
function openTestModal() {
    const modal = document.getElementById('testModal');
    const list = document.getElementById('questionsList');
    const data = getData();

    // Ensure questions exist (migration fallback)
    if (!data.recruitmentQuestions) {
        data.recruitmentQuestions = [
            { id: 1, text: "Which HTML tag is used to define an internal style sheet?", options: ["<script>", "<css>", "<style>"], answer: 2 },
            { id: 2, text: "Which property is used to change the background color?", options: ["color", "bgcolor", "background-color"], answer: 2 },
            { id: 3, text: "How do you create a function in JavaScript?", options: ["function myFunction()", "function:myFunction()", "function = myFunction()"], answer: 0 }
        ];
        saveData(data);
    }

    list.innerHTML = '';
    data.recruitmentQuestions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = 'card mb-2 p-3';
        item.innerHTML = `
            <div class="d-flex justify-content-between">
                <h5>Q${index + 1}: ${q.text}</h5>
                <div>
                    <button class="btn btn-sm btn-warning" onclick="editQuestion(${q.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${q.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <ul>
                <li class="${q.answer === 0 ? 'text-success font-weight-bold' : ''}">${q.options[0]}</li>
                <li class="${q.answer === 1 ? 'text-success font-weight-bold' : ''}">${q.options[1]}</li>
                <li class="${q.answer === 2 ? 'text-success font-weight-bold' : ''}">${q.options[2]}</li>
            </ul>
        `;
        list.appendChild(item);
    });

    modal.style.display = 'block';
}

function closeTestModal() {
    document.getElementById('testModal').style.display = 'none';
    hideQuestionForm();
}

// Form Handling
function openAddQuestionForm() {
    document.getElementById('questionFormContainer').style.display = 'block';
    document.getElementById('questionFormTitle').textContent = 'Add New Question';
    document.getElementById('questionForm').reset();
    document.getElementById('qId').value = '';
}

function hideQuestionForm() {
    document.getElementById('questionFormContainer').style.display = 'none';
}

function editQuestion(id) {
    const data = getData();
    const q = data.recruitmentQuestions.find(x => x.id === id);
    if (!q) return;

    document.getElementById('questionFormContainer').style.display = 'block';
    document.getElementById('questionFormTitle').textContent = 'Edit Question';

    document.getElementById('qId').value = q.id;
    document.getElementById('qText').value = q.text;
    document.getElementById('qOpt0').value = q.options[0];
    document.getElementById('qOpt1').value = q.options[1];
    document.getElementById('qOpt2').value = q.options[2];
    document.getElementById('qAnswer').value = q.answer;
}

function deleteQuestion(id) {
    if (confirm('Delete this question?')) {
        const data = getData();
        data.recruitmentQuestions = data.recruitmentQuestions.filter(x => x.id !== id);
        saveData(data);
        openTestModal(); // Refresh list
    }
}

// Save Question
const questionForm = document.getElementById('questionForm');
if (questionForm) {
    questionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('qId').value;
        const text = document.getElementById('qText').value;
        const opt0 = document.getElementById('qOpt0').value;
        const opt1 = document.getElementById('qOpt1').value;
        const opt2 = document.getElementById('qOpt2').value;
        const answer = parseInt(document.getElementById('qAnswer').value);

        const data = getData();
        if (!data.recruitmentQuestions) data.recruitmentQuestions = [];

        if (id) {
            // Edit
            const index = data.recruitmentQuestions.findIndex(x => x.id == id);
            if (index > -1) {
                data.recruitmentQuestions[index] = {
                    id: parseInt(id),
                    text,
                    options: [opt0, opt1, opt2],
                    answer
                };
            }
        } else {
            // Add
            const newQ = {
                id: Date.now(),
                text,
                options: [opt0, opt1, opt2],
                answer
            };
            data.recruitmentQuestions.push(newQ);
        }

        saveData(data);
        alert('Question saved!');
        hideQuestionForm();
        openTestModal(); // Refresh list
    });
}

/**
 * Delete Application (Admin)
 */
function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application? This cannot be undone.')) {
        const data = getData();
        data.applications = data.applications.filter(a => a.id !== id);
        saveData(data);
        alert('Application deleted.');
        location.reload();
    }
}
