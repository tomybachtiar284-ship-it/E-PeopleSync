/**
 * Admin Logic
 * Handles Job, Employee, and LMS Management.
 */

const API = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    initDashboardCharts();
    initUserProfile();

    // Call data loading functions asynchronously
    loadAdminData();
    loadJobs();
    loadEmployees();
    loadCoursesAdmin();
    updateNotifications();

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifDropdown');
        const container = document.getElementById('notifContainer');
        if (dropdown && !container.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

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
 * Notifications Logic
 */
async function updateNotifications() {
    try {
        const res = await fetch(`${API}/api/recruitment/applications`);
        const applications = await res.json();

        const badge = document.getElementById('notifBadge');
        const body = document.getElementById('notifBody');
        const countText = document.getElementById('notifCountText');

        if (!badge || !body) return;

        // Filter New Applications
        const newApps = applications.filter(a => a.status === 'Applied');
        const count = newApps.length;

        // Update Badge
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
            if (countText) countText.textContent = `${count} New`;
        } else {
            badge.style.display = 'none';
            if (countText) countText.textContent = `No New`;
        }

        // Populate Body
        if (count > 0) {
            body.innerHTML = '';
            // Show last 5
            newApps.slice(-5).reverse().forEach(app => {
                const item = document.createElement('div');
                item.className = 'notif-item';
                item.onclick = () => window.location.href = '../recruitment/index.html';
                item.innerHTML = `
                    <i class="fas fa-user-plus"></i>
                    <div class="notif-content">
                        <div class="notif-title">New Application: <b>${app.name}</b></div>
                        <div class="notif-time">Position: ${app.job_title}</div>
                    </div>
                `;
                body.appendChild(item);
            });
        } else {
            body.innerHTML = '<div class="notif-empty">No new notifications</div>';
        }
    } catch (err) {
        console.error('Failed to load notifications:', err);
    }
}

window.toggleNotifDropdown = function (e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

/**
 * Overview & Applications
 */
let skillChart = null;
let funnelChart = null;

async function loadAdminData() {
    try {
        const [empRes, appRes, enrRes, evalRes] = await Promise.all([
            fetch(`${API}/api/employees`),
            fetch(`${API}/api/recruitment/applications`),
            fetch(`${API}/api/learning/enrollments`),
            fetch(`${API}/api/evaluations`)
        ]);

        const employeesList = await empRes.json();
        const applications = await appRes.json();
        const enrollments = await enrRes.json();
        const evaluations = await evalRes.json();

        // 1. Total Employees
        const employees = employeesList.filter(u => u.role === 'employee').length;
        if (document.getElementById('statEmployees')) document.getElementById('statEmployees').textContent = employees;

        // 2. New Applications (Status 'Applied')
        const apps = applications.filter(a => a.status === 'Applied').length;
        if (document.getElementById('statApplications')) document.getElementById('statApplications').textContent = apps;

        // 3. Training Completion
        // Logic: (Completed Enrollments / Total Enrollments) * 100
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(e => e.progress === 100 || e.status === 'completed').length;
        const completionRate = totalEnrollments > 0 ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1) : 0;

        if (document.getElementById('statTrainingCompletion')) {
            document.getElementById('statTrainingCompletion').textContent = `${completionRate}%`;
        }
        if (document.getElementById('statTrainingProgressBar')) {
            document.getElementById('statTrainingProgressBar').style.width = `${completionRate}%`;
        }

        // 4. Avg KPI Score
        // Logic: Average of all evaluations scores. Since evaluations in API don't have a direct 'score', we calculate from radar_data if possible.
        // Assuming evaluations contain a history_data array where recent score is stored, or radar_data sum.
        let avgKPI = 0;
        if (evaluations.length > 0) {
            let totalSum = 0;
            let count = 0;
            evaluations.forEach(ev => {
                if (ev.radar_data) {
                    const data = typeof ev.radar_data === 'string' ? JSON.parse(ev.radar_data) : ev.radar_data;
                    const sum = data.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
                    totalSum += (sum / data.length);
                    count++;
                }
            });
            avgKPI = count > 0 ? (totalSum / count).toFixed(1) : 'N/A';
        }

        if (document.getElementById('statAvgKPI')) document.getElementById('statAvgKPI').textContent = `${avgKPI}/5.0`;

        // 5. Update Charts
        updateDashboardCharts({ applications, evaluations, avgKPI });
    } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
    }
}

function initDashboardCharts() {
    // Skill Trend Chart
    const skillCtx = document.getElementById('skillChart');
    if (skillCtx) {
        skillChart = new Chart(skillCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Avg Competency Score',
                    data: [0, 0, 0, 0, 0, 0], // Default
                    borderColor: '#00796b',
                    backgroundColor: 'rgba(0, 121, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: { y: { beginAtZero: false, min: 0, max: 5 } } // Adjusted max to 5 for KPI 1-5 scale
            }
        });
    }

    // Recruitment Funnel Chart
    const funnelCtx = document.getElementById('funnelChart');
    if (funnelCtx) {
        funnelChart = new Chart(funnelCtx, {
            type: 'pie',
            data: {
                labels: ['Applied', 'Interview', 'Hired', 'Rejected'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#00796b', '#4db6ac', '#81c784', '#e0e0e0']
                }]
            }
        });
    }
}

function updateDashboardCharts(data) {
    // A. Update Recruitment Funnel
    const apps = data.applications || [];
    const applied = apps.filter(a => ['Applied', 'Review'].includes(a.status)).length;
    const interview = apps.filter(a => ['Interview', 'Recommended'].includes(a.status)).length;
    const hired = apps.filter(a => ['Offer', 'Hired'].includes(a.status)).length;
    const rejected = apps.filter(a => a.status === 'Rejected').length;

    if (funnelChart) {
        funnelChart.data.datasets[0].data = [applied, interview, hired, rejected];
        funnelChart.update();
    }

    // B. Update Skill Trend
    if (skillChart) {
        const avgScore = isNaN(data.avgKPI) ? 0 : data.avgKPI;
        const dataPoints = [0, 0, 0, 0, 0, avgScore];
        skillChart.data.datasets[0].data = dataPoints;
        skillChart.update();
    }
}

window.downloadReport = async function () {
    try {
        const res = await fetch(`${API}/api/employees`);
        const users = await res.json();

        const headers = ["ID", "Name", "Role", "Status", "Department"];
        const rows = users.map(u => [u.id, u.name, u.role, u.status || '-', u.department || '-']);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "epeoplesync_hr_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Failed to download report', err);
        alert('Failed to generate report.');
    }
};

// ... (Rest of existing logic for Jobs, Employees, Courses)

async function loadJobs() {
    const tbody = document.getElementById('jobsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API}/api/recruitment/jobs`);
        const jobs = await res.json();

        jobs.forEach(job => {
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
    } catch (err) {
        console.error('Failed to load jobs', err);
    }
}

async function addJob(e) {
    e.preventDefault();
    const title = document.getElementById('jobTitle').value;
    const dept = document.getElementById('jobDept').value;
    const loc = document.getElementById('jobLoc').value;
    const type = document.getElementById('jobType').value;

    const newJob = {
        title,
        department: dept,
        location: loc,
        type,
        status: 'open',
        posted_by: currentUser.id
    };

    try {
        const res = await fetch(`${API}/api/recruitment/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newJob)
        });

        if (res.ok) {
            alert('Job Added Successfully!');
            loadJobs();
            document.getElementById('addJobForm').reset();
        } else {
            alert('Failed to add job.');
        }
    } catch (err) {
        console.error('Failed to add job:', err);
    }
}

window.deleteJob = async function (id) {
    if (!confirm('Delete this job?')) return;
    try {
        const res = await fetch(`${API}/api/recruitment/jobs/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadJobs();
        } else {
            alert('Failed to delete job.');
        }
    } catch (err) {
        console.error('Failed to delete job', err);
    }
};

async function loadEmployees() {
    const tbody = document.getElementById('employeesTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API}/api/employees`);
        const users = await res.json();
        const employees = users.filter(u => u.role === 'employee' || u.role === 'manager');

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
    } catch (err) {
        console.error('Failed to load employees', err);
    }
}

async function loadCoursesAdmin() {
    const list = document.getElementById('courseListAdmin');
    if (!list) return;
    list.innerHTML = '';

    try {
        const res = await fetch(`${API}/api/learning/courses`);
        const courses = await res.json();

        courses.forEach(c => {
            const li = document.createElement('li');
            li.className = 'card mb-2 p-2';
            li.innerHTML = `
                <strong>${c.title}</strong> (${c.category})
                <button class="btn btn-sm btn-danger float-right" onclick="deleteCourse(${c.id})">Delete</button>
            `;
            list.appendChild(li);
        });
    } catch (err) {
        console.error('Failed to load courses admin', err);
    }
}

async function addCourse(e) {
    e.preventDefault();
    const title = document.getElementById('courseTitle').value;
    const category = document.getElementById('courseCategory').value;

    const newCourse = {
        title,
        category,
        department: 'All', // Default or UI could evolve
        created_by: currentUser.id
    };

    try {
        const res = await fetch(`${API}/api/learning/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCourse)
        });

        if (res.ok) {
            loadCoursesAdmin();
            e.target.reset();
            alert('Course Added Successfully!');
        } else {
            alert('Failed to add course.');
        }
    } catch (err) {
        console.error('Failed to add course:', err);
    }
}

window.deleteCourse = async function (id) {
    if (!confirm('Delete this course?')) return;
    try {
        const res = await fetch(`${API}/api/learning/courses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadCoursesAdmin();
        } else {
            alert('Failed to delete course.');
        }
    } catch (err) {
        console.error('Failed to delete course', err);
    }
};
