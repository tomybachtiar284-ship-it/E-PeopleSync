/**
 * Utility Functions for HR Platform
 * Handles LocalStorage interactions and default data initialization.
 */

const STORAGE_KEY = 'hr_platform_v5';

const defaultData = {
    users: [
        { id: 1, username: 'admin', password: 'password', role: 'admin', name: 'Admin HR' },
        { id: 2, username: 'manager', password: 'password', role: 'manager', name: 'Budi Santoso' }, // Manager
        { id: 3, username: 'andi', password: 'password', role: 'employee', name: 'Andi Saputra', department: 'Sales', position: 'Sales Executive' },
        // Candidates
        { id: 4, username: 'siti', password: 'password', role: 'candidate', name: 'Siti Aminah', email: 'siti.aminah@gmail.com', status: 'registered' },
        { id: 5, username: 'rizky', password: 'password', role: 'candidate', name: 'Rizky Pratama', email: 'rizky.pratama@gmail.com', status: 'registered' },
        { id: 6, username: 'dewi', password: 'password', role: 'candidate', name: 'Dewi Lestari', email: 'dewi.lestari@yahoo.com', status: 'registered' },
        { id: 7, username: 'ahmad', password: 'password', role: 'candidate', name: 'Ahmad Hidayat', email: 'ahmad.hidayat@outlook.com', status: 'registered' },
        { id: 8, username: 'putri', password: 'password', role: 'candidate', name: 'Putri Indah', email: 'putri.indah@gmail.com', status: 'registered' }
    ],
    jobs: [
        { id: 1, title: 'Sales Executive', department: 'Sales', location: 'Jakarta', type: 'Full-time' },
        { id: 2, title: 'Software Engineer', department: 'IT', location: 'Remote', type: 'Contract' },
        { id: 3, title: 'HR Specialist', department: 'HR', location: 'Surabaya', type: 'Full-time' },
        { id: 4, title: 'Marketing Intern', department: 'Marketing', location: 'Jakarta', type: 'Internship' }
    ],
    applications: [], // Emptied for user trial
    courses: [
        {
            id: 1,
            title: 'Introduction to Company Culture',
            description: 'Learn about our core values, mission, and vision.',
            category: 'onboarding',
            department: 'All',
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 2,
            title: 'Advanced Sales Techniques',
            description: 'Master negotiation and closing strategies.',
            category: 'skill',
            department: 'Sales',
            thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
        }
    ],
    modules: [
        { id: 1, courseId: 1, title: 'Welcome Video', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '5 min' },
        { id: 2, courseId: 1, title: 'Our Values', type: 'text', content: 'Our core values are Integrity, Innovation, and Teamwork.', duration: '10 min' },
        { id: 3, courseId: 2, title: 'Negotiation 101', type: 'text', content: 'Always listen more than you speak.', duration: '15 min' }
    ],
    quizzes: [
        {
            id: 1,
            courseId: 1,
            title: 'Culture Quiz',
            questions: [
                { id: 1, type: 'multiple-choice', text: "What is our primary value?", options: ["Money", "Integrity", "Speed"], answer: 1 },
                { id: 2, type: 'multiple-choice', text: "When was the company founded?", options: ["2010", "2020", "2000"], answer: 1 }
            ],
            passingScore: 70
        }
    ],
    quizAttempts: [], // Emptied for user trial
    enrollments: [], // Emptied for user trial
    certificates: [], // Emptied for user trial
    evaluations: [], // Emptied for user trial
    departments: ['Sales', 'IT', 'HR', 'Marketing'], // Default Departments
    locations: ['Jakarta', 'Surabaya', 'Remote', 'Bandung'], // Default Locations
    jobTypes: ['Full-time', 'Contract', 'Internship', 'Part-time'], // Default Job Types
    courseCategories: ['Onboarding', 'Skill', 'Compliance', 'Leadership'], // Default Course Categories
    courseLevels: ['Foundation', 'Practitioner', 'Specialist', 'Mastery'], // Default Course Levels
    recruitmentQuestions: [
        { id: 1, text: "Which HTML tag is used to define an internal style sheet?", options: ["<script>", "<css>", "<style>"], answer: 2 },
        { id: 2, text: "Which property is used to change the background color?", options: ["color", "bgcolor", "background-color"], answer: 2 },
        { id: 3, text: "How do you create a function in JavaScript?", options: ["function myFunction()", "function:myFunction()", "function = myFunction()"], answer: 0 }
    ],
    payrollSettings: {
        bpjs_jht_emp: 2,
        bpjs_jp_emp: 1,
        bpjs_kes_emp: 1,
        ot_index: 173,
        tax_office_limit: 500000,
        ptkp0: 54000000
    }
};

// Initialize Data if empty
function initData() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        console.log('Default data initialized.');
    } else {
        // Migration: Ensure new arrays exist in old data
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        let changed = false;
        if (!data.departments) { data.departments = defaultData.departments; changed = true; }
        if (!data.locations) { data.locations = defaultData.locations; changed = true; }
        if (!data.jobTypes) { data.jobTypes = defaultData.jobTypes; changed = true; }
        if (!data.courseCategories) { data.courseCategories = defaultData.courseCategories; changed = true; }
        if (!data.courseLevels) { data.courseLevels = defaultData.courseLevels; changed = true; }
        if (!data.recruitmentQuestions) { data.recruitmentQuestions = defaultData.recruitmentQuestions; changed = true; }
        if (!data.payrollSettings) { data.payrollSettings = defaultData.payrollSettings; changed = true; }
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Data migrated with new fields.');
        }
    }
}

// Get Data
function getData() {
    if (!localStorage.getItem(STORAGE_KEY)) initData(); // Ensure init
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

// Save Data
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Helper: Format Date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Helper: Check Auth
function checkAuth(allowedRoles = []) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '../login/index.html';
        return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        alert('Access Denied: You do not have permission to view this page.');
        window.location.href = '../login/index.html';
        return null;
    }
    return currentUser;
}

// Helper: Update Sidebar based on Role
function updateSidebarForRole() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    if (currentUser.role === 'candidate') {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const text = link.innerText.trim();
            // Hide only Performance and Administration
            // Allow: Dashboard, Recruitment (Jobs), Learning Hub, Logout
            if (text.includes('Performance') || text.includes('Administration') || text.includes('Settings')) {
                link.style.display = 'none';
            }
            if (text.includes('Recruitment')) {
                link.innerHTML = '<i class="fas fa-briefcase"></i> <span>Jobs</span>';
            }
            if (text.includes('Dashboard')) {
                link.href = '../dashboard/index.html';
            }
        });

        // Hide "Settings" label if exists
        const labels = document.querySelectorAll('.nav-label');
        labels.forEach(lbl => {
            if (lbl.innerText === 'Settings') lbl.style.display = 'none';
        });
    }
}

// Helper: Logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
}

// Global Helper: Populate Dropdown with "Add New" feature
function populateDropdown(elementId, items, typeName) {
    const select = document.getElementById(elementId);
    if (!select) return; // Guard clause

    select.innerHTML = '';

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });

    // Add "Add New" option
    const addNew = document.createElement('option');
    addNew.value = 'ADD_NEW';
    addNew.textContent = `[ + Add New ${typeName} ]`;
    addNew.style.fontWeight = 'bold';
    addNew.style.color = 'blue';
    select.appendChild(addNew);

    // Event Listener for "Add New" - Remove existing (to avoid duplicates if called multiple times)
    // Note: This needs to be handled carefully. Ideally assign onchange once.
    // simpler approach: overwrite onchange
    select.onchange = function () {
        if (this.value === 'ADD_NEW') {
            const newValue = prompt(`Enter new ${typeName}:`);
            if (newValue && newValue.trim() !== '') {
                // Save to Data
                const currentData = getData();
                let key;

                // Map typeName to data key
                if (typeName === 'Department') key = 'departments';
                else if (typeName === 'Location') key = 'locations';
                else if (typeName === 'Job Type') key = 'jobTypes';
                else if (typeName === 'Category') key = 'courseCategories';
                else return; // Unknown type

                // Initialize if undefined (safety)
                if (!currentData[key]) currentData[key] = [];

                // Add if not exists
                if (!currentData[key].includes(newValue)) {
                    currentData[key].push(newValue);
                    saveData(currentData);

                    // Re-populate (recursive call, passing updated list)
                    populateDropdown(elementId, currentData[key], typeName);
                    // Select the new item
                    select.value = newValue;
                } else {
                    alert(`${typeName} already exists!`);
                    select.value = newValue; // Select existing
                }
            } else {
                // Revert to first option if cancelled
                select.selectedIndex = 0;
            }
        }
    };
}

// Initialize on load
initData();
