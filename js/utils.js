/**
 * Utility Functions for HR Platform
 * Handles LocalStorage interactions and default data initialization.
 */

const STORAGE_KEY = 'hr_platform_v5';

const defaultData = {
    users: [
        { id: 1, username: 'admin', password: 'password', role: 'admin', name: 'Admin HR' },
        { id: 2, username: 'manager', password: 'password', role: 'manager', name: 'Budi Santoso' }, // Manager
        { id: 3, username: 'tomy', password: 'password', role: 'employee', name: 'TOMY', department: 'Sales', position: 'Sales Executive' },
        { id: 12, username: 'andi', password: 'password', role: 'employee', name: 'Andi Saputra', department: 'Sales', position: 'Sales Executive' },
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
    evaluations: [
        {
            id: 1,
            userId: 3, // Tomy
            radarData: [85, 90, 70, 80, 75, 95],
            historyData: [3.8, 4.0, 4.2, 4.1, 4.5, 4.6],
            objectives: [
                { title: 'Increase Sales by 15%', status: 'On Track', progress: 75, color: '#00796b' },
                { title: 'Close 5 Enterprise Deals', status: 'Warning', progress: 40, color: '#e53935' }
            ],
            feedback: {
                message: "Excellent performance in the last quarter. Your leadership in the Sales team is becoming more evident.",
                date: "Jan 15, 2026",
                by: "Budi Santoso (Manager)"
            }
        },
        {
            id: 2,
            userId: 12, // Andi
            radarData: [70, 75, 60, 85, 80, 70],
            historyData: [3.2, 3.4, 3.5, 3.5, 3.7, 3.8],
            objectives: [
                { title: 'Training Onboarding', status: 'Complete', progress: 100, color: '#4caf50' }
            ],
            feedback: {
                message: "Good start as a Sales Executive. Focus on product knowledge in the next month.",
                date: "Jan 20, 2026",
                by: "Budi Santoso (Manager)"
            }
        }
    ],
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
    },
    attendance: [
        { id: 1, empId: 1739589237000, date: new Date().toISOString().split('T')[0], clockIn: '08:05', clockOut: '17:00', isLate: true },
        { id: 2, empId: 1739589237001, date: new Date().toISOString().split('T')[0], clockIn: '07:55', clockOut: '16:05', isLate: false }
    ],
    roster: [
        { empId: 1739589237000, date: new Date().toISOString().split('T')[0], shift: 'Pagi' },
        { empId: 1739589237001, date: new Date().toISOString().split('T')[0], shift: 'Siang' }
    ],
    assets: [
        { id: 'AST-001', name: 'MacBook Pro 16"', category: 'Laptop', status: 'Assigned', assignedTo: 'Sarah Admin', dateAssigned: '2025-10-15' },
        { id: 'AST-002', name: 'Dell UltraSharp 27"', category: 'Peripherals', status: 'Available', assignedTo: null, dateAssigned: null },
        { id: 'AST-003', name: 'iPhone 15 Pro', category: 'Smartphone', status: 'Assigned', assignedTo: 'Sarah Admin', dateAssigned: '2025-11-20' },
        { id: 'AST-004', name: 'Toyota Avanza', category: 'Vehicle', status: 'Repair', assignedTo: null, dateAssigned: null },
        { id: 'AST-005', name: 'Logitech MX Master 3', category: 'Peripherals', status: 'Available', assignedTo: null, dateAssigned: null }
    ],
    docCategories: ['Corporate Policy', 'Employee Record', 'Legal', 'Finance', 'Training'],
    documents: [
        { id: 'DOC-001', name: 'Employee Handbook 2026', category: 'Corporate Policy', version: 'v2.1', owner: 'HR Department', expiryDate: null, size: '2.4 MB', type: 'pdf' },
        { id: 'DOC-002', name: 'IT Security Policy', category: 'Corporate Policy', version: 'v1.0', owner: 'IT Department', expiryDate: null, size: '1.2 MB', type: 'pdf' },
        { id: 'DOC-003', name: 'Employment Contract - Sarah Admin', category: 'Employee Record', version: 'v1.0', owner: 'Sarah Admin', expiryDate: '2028-12-31', size: '0.8 MB', type: 'pdf' },
        { id: 'DOC-004', name: 'Identity Card (KTP)', category: 'Employee Record', version: 'v1.0', owner: 'Sarah Admin', expiryDate: '2030-01-01', size: '0.5 MB', type: 'jpg' },
        { id: 'DOC-005', name: 'Annual Tax Report 2025', category: 'Finance', version: 'v1.0', owner: 'Corporate Finance', expiryDate: null, size: '3.1 MB', type: 'pdf' }
    ]
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
        if (!data.assets) { data.assets = defaultData.assets; changed = true; }
        if (!data.docCategories) { data.docCategories = defaultData.docCategories; changed = true; }
        if (!data.documents) { data.documents = defaultData.documents; changed = true; }
        if (!data.attendance) { data.attendance = defaultData.attendance || []; changed = true; }
        if (!data.roster) { data.roster = defaultData.roster || []; changed = true; }
        if (data.users) {
            const tomyUser = data.users.find(u => u.username === 'tomy' || (u.name && u.name.toUpperCase() === 'TOMY'));
            if (tomyUser && (tomyUser.role !== 'employee' || tomyUser.department !== 'Sales')) {
                tomyUser.role = 'employee';
                tomyUser.department = 'Sales';
                changed = true;
            }
        }
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Data migrated or synchronized.');
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

    const navLinks = document.querySelectorAll('.nav-link');
    const labels = document.querySelectorAll('.nav-label');
    const restrictedItems = document.querySelectorAll('.role-restricted');

    const isAdmin = currentUser.role === 'admin';
    const isStaff = currentUser.role === 'employee' || currentUser.role === 'manager';

    // Handle role-restricted elements
    restrictedItems.forEach(item => {
        if (isAdmin) {
            item.classList.remove('role-restricted');
            item.style.display = ''; // Restore default display
        } else {
            item.style.display = 'none'; // Ensure they stay hidden
        }
    });

    if (isStaff) {
        navLinks.forEach(link => {
            const text = link.innerText.trim();
            // Hide admin-only links (Keep Internal Jobs visible for staff was removed)
            if (text.includes('Overview') ||
                text.includes('Employees') ||
                text.includes('Attendance') ||
                text.includes('Payroll') ||
                text.includes('Asset') ||
                text.includes('Document') ||
                text.includes('Org Chart') ||
                text.includes('Recruitment') || // Now hidden for staff
                text.includes('Administration')) {
                link.classList.add('role-restricted'); // Ensure hidden
                link.style.display = 'none';
            }
            if (text.includes('Performance')) {
                const span = link.querySelector('span');
                if (span) span.textContent = 'My Performance';
                else link.textContent = 'My Performance';
            }
        });

        // Hide specific labels
        labels.forEach(lbl => {
            const text = lbl.innerText.trim().toUpperCase();
            if (text.includes('MAIN DASHBOARD') ||
                text.includes('WORKFORCE') ||
                text.includes('FINANCE') ||
                text.includes('ENTERPRISE') ||
                text.includes('SETTINGS')) {
                lbl.classList.add('role-restricted'); // Ensure hidden
                lbl.style.display = 'none';
            }
        });

        // Sidebar will maintain premium styles from CSS
    } else if (currentUser.role === 'candidate') {
        navLinks.forEach(link => {
            const text = link.innerText.trim();
            if (text.includes('Performance') || text.includes('Administration') || text.includes('Settings') ||
                text.includes('Employees') || text.includes('Attendance') || text.includes('Payroll') ||
                text.includes('Asset') || text.includes('Document') || text.includes('Org Chart')) {
                link.style.display = 'none';
            }
            if (text.includes('Recruitment')) {
                link.innerHTML = '<i class="fas fa-briefcase"></i> <span>Jobs</span>';
            }
        });

        labels.forEach(lbl => {
            lbl.style.display = 'none';
        });
    }
}

// Helper: Initialize Dynamic Global Profile (Header)
function initUserProfile() {
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Sync with Master Data
    const allData = getData();
    const updatedUser = allData.users.find(u => u.id === currentUser.id);
    if (updatedUser) {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        currentUser = updatedUser;
    }

    // Update Name (Supports both old and new IDs for compatibility)
    const nameEl = document.getElementById('userName');
    const nameHeaderEl = document.getElementById('userNameHeader');
    const welcomeEl = document.getElementById('welcomeName');

    if (nameEl) nameEl.textContent = currentUser.name;
    if (nameHeaderEl) nameHeaderEl.textContent = currentUser.name;
    if (welcomeEl) welcomeEl.textContent = currentUser.name.split(' ')[0];

    // Update Role
    const roleEl = document.getElementById('userRole');
    const roleHeaderEl = document.getElementById('userRoleHeader');
    if (roleEl) roleEl.textContent = currentUser.role.toUpperCase() + (currentUser.department ? ` - ${currentUser.department}` : '');
    if (roleHeaderEl) roleHeaderEl.textContent = currentUser.role.toUpperCase() + (currentUser.department ? ` - ${currentUser.department}` : '');

    // Update Avatar
    const avatarImg = document.querySelector('.user-avatar');
    if (avatarImg && currentUser.avatar) {
        avatarImg.src = currentUser.avatar;
    } else if (avatarImg) {
        // Fallback for local users if no photo
        avatarImg.src = `https://i.pravatar.cc/150?u=${currentUser.username || 'default'}_epeoplesync`;
    }

    // Dynamic Sidebar based on role
    updateSidebarForRole();
}

// Helper: Render Modern Glass Header
function renderModernHeader() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Remove old header if exists
    const oldHeader = document.querySelector('.header, .top-header');
    if (oldHeader) oldHeader.remove();

    const headerHTML = `
        <header class="top-header premium" style="height: 100px; padding: 0 40px;">
            <!-- Decorative Shapes -->
            <div class="premium-decoration">
                <div class="premium-shape shape-1"></div>
                <div class="premium-shape shape-2"></div>
                <div class="premium-shape shape-3"></div>
            </div>

            <div class="premium-header-content">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <button class="sidebar-toggle" onclick="toggleSidebar()" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 40px; height: 40px; border-radius: 12px; cursor: pointer;">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="search-bar" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 15px; width: 350px; display: flex; align-items: center; padding: 10px 15px; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="fas fa-search" style="color: rgba(255,255,255,0.7); margin-right: 10px;"></i>
                        <input type="text" placeholder="Search for anything..." style="border: none; background: transparent; outline: none; width: 100%; font-size: 14px; color: #fff;">
                    </div>
                </div>
                <div class="header-right" style="display: flex; align-items: center; gap: 25px;">
                    <div class="notification" style="background: rgba(255,255,255,0.2); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; transition: 0.3s; border: 1px solid rgba(255,255,255,0.1);">
                        <i class="far fa-bell" style="font-size: 18px; color: #fff;"></i>
                    </div>
                    <div class="user-profile" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 5px 15px 5px 5px; border-radius: 15px; display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.1);">
                        <img src="https://i.pravatar.cc/150?u=default" class="user-avatar" alt="Profile" style="width: 35px; height: 35px; border-radius: 10px; border: 2px solid #fff;">
                        <div class="user-details" style="text-align: left; margin-left: 10px;">
                            <h4 id="userNameHeader" style="font-size: 13px; margin: 0; font-weight: 700; color: var(--premium-navy); text-shadow: 0 0 10px rgba(255,255,255,0.5);">Sarah Andrea</h4>
                            <span id="userRoleHeader" style="font-size: 10px; color: rgba(13, 33, 55, 0.7); text-transform: uppercase; font-weight: 600;">Marketing Specialist</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;
    mainContent.insertAdjacentHTML('afterbegin', headerHTML);
    initUserProfile();
}

// Helper: Render Modern Footer
function renderModernFooter() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const footerHTML = `
        <footer class="premium-footer mt-5">
            <div class="footer-curve"></div>
            <div class="footer-decoration">
                &copy; 2026 E-PeopleSync HRMS &bull; Enterprise Human Capital Management &bull; Version 2.0.0
            </div>
        </footer>
    `;
    mainContent.insertAdjacentHTML('beforeend', footerHTML);
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
