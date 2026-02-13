/**
 * Admin Logic
 * Handles Job, Employee, and LMS Management.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    loadAdminData();
    loadJobs();
    loadEmployees();
    loadCoursesAdmin();

    // Event Listeners
    const jobForm = document.getElementById('addJobForm');
    if (jobForm) jobForm.addEventListener('submit', addJob);

    const courseForm = document.getElementById('addCourseForm');
    if (courseForm) courseForm.addEventListener('submit', addCourse);
});

// UI Helper: Tab Switching
window.showTab = function (tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + tabId).classList.add('active');
};

/**
 * Overview & Applications
 */
function loadAdminData() {
    const data = getData();

    // Stats
    const candidates = data.users.filter(u => u.role === 'candidate').length;
    const apps = data.applications.filter(a => a.status === 'Applied').length;
    const employees = data.users.filter(u => u.role === 'employee').length;

    if (document.getElementById('statCandidates')) document.getElementById('statCandidates').textContent = candidates;
    if (document.getElementById('statApplications')) document.getElementById('statApplications').textContent = apps;
    if (document.getElementById('statEmployees')) document.getElementById('statEmployees').textContent = employees;

    // Applications Table (Overview or Recruitment Tab)
    // Note: admin/index.html might not have this table if using the new layout, 
    // but we'll keep the logic if it's reused.
}

window.downloadReport = function () {
    const data = getData();
    const headers = ["ID", "Name", "Role", "Status", "Department"];
    const rows = data.users.map(u => [u.id, u.name, u.role, u.status || '-', u.department || '-']);

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kompetenza_hr_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ... (Rest of existing logic for Jobs, Employees, Courses)

function loadJobs() {
    const tbody = document.getElementById('jobsTable');
    if (!tbody) return;
    const data = getData();
    tbody.innerHTML = '';

    data.jobs.forEach(job => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${job.title}</td>
            <td>${job.department}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteJob(${job.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addJob(e) {
    e.preventDefault();
    const title = document.getElementById('jobTitle').value;
    const dept = document.getElementById('jobDept').value;
    const loc = document.getElementById('jobLoc').value;
    const type = document.getElementById('jobType').value;

    const data = getData();
    data.jobs.push({
        id: Date.now(),
        title,
        department: dept,
        location: loc,
        type
    });
    saveData(data);
    alert('Job Added Successfully!');
    loadJobs();
    document.getElementById('addJobForm').reset();
}

window.deleteJob = function (id) {
    if (!confirm('Delete this job?')) return;
    const data = getData();
    data.jobs = data.jobs.filter(j => j.id !== id);
    saveData(data);
    loadJobs();
};

function loadEmployees() {
    const tbody = document.getElementById('employeesTable');
    if (!tbody) return;
    const data = getData();
    tbody.innerHTML = '';

    const employees = data.users.filter(u => u.role === 'employee' || u.role === 'manager');
    employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td><span class="badge badge-info">${emp.role}</span></td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="alert('Edit feature coming soon')">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function loadCoursesAdmin() {
    const list = document.getElementById('courseListAdmin');
    if (!list) return;
    const data = getData();
    list.innerHTML = '';

    data.courses.forEach(c => {
        const li = document.createElement('li');
        li.className = 'card mb-2 p-2';
        li.innerHTML = `
            <strong>${c.title}</strong> (${c.category})
            <button class="btn btn-sm btn-danger float-right" onclick="deleteCourse(${c.id})">Delete</button>
        `;
        list.appendChild(li);
    });
}

function addCourse(e) {
    e.preventDefault();
    const title = document.getElementById('courseTitle').value;
    const category = document.getElementById('courseCategory').value;

    const data = getData();
    data.courses.push({
        id: Date.now(),
        title,
        category,
        department: 'All',
        materials: []
    });
    saveData(data);
    loadCoursesAdmin();
    e.target.reset();
}

window.deleteCourse = function (id) {
    if (!confirm('Delete this course?')) return;
    const data = getData();
    data.courses = data.courses.filter(c => c.id !== id);
    saveData(data);
    loadCoursesAdmin();
};
