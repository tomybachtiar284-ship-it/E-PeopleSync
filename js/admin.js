/**
 * Admin Logic
 * Handles Job, Employee, and LMS Management.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    loadAdminData();
    initDashboardCharts();
    loadJobs();
    loadEmployees();
    loadCoursesAdmin();
    updateNotifications();
    initUserProfile();

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
function updateNotifications() {
    const data = getData();
    const badge = document.getElementById('notifBadge');
    const body = document.getElementById('notifBody');
    const countText = document.getElementById('notifCountText');

    if (!badge || !body) return;

    // Filter New Applications
    const newApps = data.applications.filter(a => a.status === 'Applied');
    const count = newApps.length;

    // Update Badge
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
        countText.textContent = `${count} New`;
    } else {
        badge.style.display = 'none';
        countText.textContent = `No New`;
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
                    <div class="notif-time">Position: ${app.jobTitle}</div>
                </div>
            `;
            body.appendChild(item);
        });
    } else {
        body.innerHTML = '<div class="notif-empty">No new notifications</div>';
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

function loadAdminData() {
    const data = getData();

    // 1. Total Employees
    const employees = data.users.filter(u => u.role === 'employee').length;
    if (document.getElementById('statEmployees')) document.getElementById('statEmployees').textContent = employees;

    // 2. New Applications (Status 'Applied')
    const apps = data.applications.filter(a => a.status === 'Applied').length;
    if (document.getElementById('statApplications')) document.getElementById('statApplications').textContent = apps;

    // 3. Training Completion
    // Logic: (Completed Enrollments / Total Enrollments) * 100
    // Assuming enrollment.progress === 100 means completed.
    const totalEnrollments = data.enrollments ? data.enrollments.length : 0;
    const completedEnrollments = data.enrollments ? data.enrollments.filter(e => e.progress === 100).length : 0;
    const completionRate = totalEnrollments > 0 ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1) : 0;

    if (document.getElementById('statTrainingCompletion')) {
        document.getElementById('statTrainingCompletion').textContent = `${completionRate}%`;
    }
    if (document.getElementById('statTrainingProgressBar')) {
        document.getElementById('statTrainingProgressBar').style.width = `${completionRate}%`;
    }

    // 4. Avg KPI Score
    // Logic: Average of all evaluations.score
    const evaluations = data.evaluations || [];
    let avgKPI = 0;
    if (evaluations.length > 0) {
        const totalScore = evaluations.reduce((sum, ev) => sum + (ev.score || 0), 0);
        avgKPI = (totalScore / evaluations.length).toFixed(1);
    }

    if (document.getElementById('statAvgKPI')) document.getElementById('statAvgKPI').textContent = `${avgKPI}/5.0`;

    // 5. Update Charts
    updateDashboardCharts(data);
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
    // Count based on groupings
    const apps = data.applications || [];
    const applied = apps.filter(a => ['Applied', 'Review'].includes(a.status)).length;
    const interview = apps.filter(a => ['Interview', 'Recommended'].includes(a.status)).length;
    const hired = apps.filter(a => ['Offer', 'Hired'].includes(a.status)).length;
    const rejected = apps.filter(a => a.status === 'Rejected').length;

    if (funnelChart) {
        funnelChart.data.datasets[0].data = [applied, interview, hired, rejected];
        funnelChart.update();
    }

    // B. Update Skill Trend (Mock Logic for now as we don't have historical data)
    // In a real app, we would query historical evaluation data. 
    // For now, we'll plot the current Avg KPI as the latest point.
    if (skillChart) {
        const evaluations = data.evaluations || [];
        // If we have data, let's try to simulate a trend or just show the current average
        // For simplicity in this local version: 
        // We will just show the current Avg KPI across all months to indicate "Current Level" 
        // OR leave it flat 0 if empty.

        // Better approach for Demo:
        // Use the actual average for the last month, and random variations for previous? 
        // No, let's stick to honest data. If no history, we can't invent it.
        // We will just map the current average to the last month.

        let avgScore = 0;
        if (evaluations.length > 0) {
            avgScore = evaluations.reduce((sum, ev) => sum + (ev.score || 0), 0) / evaluations.length;
        }

        // Update last data point
        const dataPoints = [0, 0, 0, 0, 0, avgScore];
        skillChart.data.datasets[0].data = dataPoints;
        skillChart.update();
    }
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
    link.setAttribute("download", "epeoplesync_hr_data.csv");
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
