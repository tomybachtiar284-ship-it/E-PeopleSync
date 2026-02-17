/**
 * Mobile Interface Logic for E-PeopleSync
 */

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(['employee', 'manager', 'admin']);
    if (!user) return;

    // Initialize UI
    initMobileUI(user);
    updateTime();
    setInterval(updateTime, 60000); // Update clock every minute
});

function initMobileUI(user) {
    const data = getData();

    // 1. Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17) greeting = "Good Evening";

    document.querySelector('.greeting-prefix').textContent = greeting;
    document.getElementById('userGreetingName').textContent = user.name;

    // 2. Navigation & Profile Images
    const userAvatar = user.avatar || `https://i.pravatar.cc/150?u=${user.id}`;
    document.getElementById('navAvatar').src = userAvatar;

    // 3. Render Leaderboard (Winners)
    renderWinners(data, user);

    // 4. Initialize Notifications
    initNotifications();
    updateNotifBadge();
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = timeStr;
}

/**
 * Switch between different views (Home, Stats, Learning, etc.)
 */
function switchView(viewId, el) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    // Update active view
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(viewId + 'View');
    if (targetView) {
        targetView.classList.add('active');
        if (viewId === 'learning') renderMobileLearning('all');
        if (viewId === 'perform') renderMobilePerformance();
        if (viewId === 'notifications') renderNotifications();
        if (viewId === 'stats') {
            const data = getData();
            const user = JSON.parse(localStorage.getItem('currentUser'));
            renderWinners(data, user);
        }
    } else {
        console.log(`View ${viewId} is under construction`);
        if (viewId === 'home') document.getElementById('homeView').classList.add('active');
    }
}

/**
 * Feature Navigation
 */
function navigateTo(feature) {
    switch (feature) {
        case 'attendance':
            showAttendanceModal();
            break;
        case 'leave':
            showLeaveModal();
            break;
        case 'learning':
            switchView('learning', document.querySelector('.nav-item:nth-child(2)'));
            break;
        case 'perform':
            switchView('perform', document.querySelector('.nav-item:nth-child(4)'));
            break;
        case 'stats':
            switchView('stats', document.querySelector('.nav-item:nth-child(4)'));
            break;
        case 'learning_detail':
            // Logic for opening detail from home cards etc if needed
            break;
        default:
            alert(`Fitur ${feature.toUpperCase()} segera hadir!`);
    }
}

/**
 * Learning Hub Mobile Logic
 */
let currentCourseIdMobile = null;

function renderMobileLearning(filter) {
    const grid = document.getElementById('mobileCourseGrid');
    if (!grid) return;

    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    let courses = data.courses || [];

    // Filter logic
    if (filter === 'progress') {
        courses = courses.filter(c => {
            const e = (data.enrollments || []).find(en => en.courseId === c.id && en.userId === user.id);
            return e && e.status === 'in-progress';
        });
    } else if (filter === 'completed') {
        courses = courses.filter(c => {
            const e = (data.enrollments || []).find(en => en.courseId === c.id && en.userId === user.id);
            return e && e.status === 'completed';
        });
    }

    if (courses.length === 0) {
        grid.innerHTML = '<div class="text-center p-5"><p>Tidak ada kursus ditemukan.</p></div>';
        return;
    }

    grid.innerHTML = courses.map(course => {
        const enrollment = (data.enrollments || []).find(e => e.courseId === course.id && e.userId === user.id);
        const progress = enrollment ? enrollment.progress : 0;
        const isCompleted = enrollment && enrollment.status === 'completed';

        return `
            <div class="m-course-card">
                <div class="m-course-img" style="background-image: url('${course.thumbnail}')">
                    <span class="m-course-tag">${course.category || 'Skill'}</span>
                </div>
                <div class="m-course-body">
                    <h4 class="m-course-title">${course.title}</h4>
                    <p class="m-course-desc">${course.description || 'Master this new competency.'}</p>
                    
                    <div class="m-course-progress-label">
                        <span>PROGRESS</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="m-course-progress-bar">
                        <div class="m-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    
                    <button class="m-btn-learn ${isCompleted ? 'completed' : ''}" onclick="openCourseDetail(${course.id})">
                        ${isCompleted ? '<i class="fas fa-check-circle"></i> Selesai' : 'Lanjutkan Belajar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterMobileCourses(filter, el) {
    document.querySelectorAll('#learningView .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderMobileLearning(filter);
}

function openCourseDetail(id) {
    currentCourseIdMobile = id;
    const data = getData();
    const course = data.courses.find(c => c.id === id);
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const enrollment = (data.enrollments || []).find(e => e.courseId === id && e.userId === user.id);

    if (!course) return;

    // Reset UI
    document.getElementById('mobileCourseTitle').textContent = course.title;
    document.getElementById('mobileMaterialContainer').style.display = 'block';
    document.getElementById('mobileQuizArea').style.display = 'none';
    document.getElementById('mobileCertificateArea').style.display = 'none';
    document.getElementById('btnStartQuizMobile').style.display = 'none';

    // Render Modules
    const modules = (data.modules || []).filter(m => m.courseId === id);
    const container = document.getElementById('mobileMaterialContainer');

    if (enrollment && enrollment.status === 'completed') {
        document.getElementById('mobileMaterialContainer').style.display = 'none';
        document.getElementById('mobileCertificateArea').style.display = 'block';
    } else {
        container.innerHTML = modules.map((mod, index) => {
            let contentHtml = '';
            if (mod.type === 'video') {
                const videoId = mod.url.includes('v=') ? mod.url.split('v=')[1].split('&')[0] : mod.url.split('/').pop();
                contentHtml = `<div class="video-container">
                                <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
                               </div>`;
            } else {
                contentHtml = `<div class="alert alert-secondary mt-2" style="font-size: 13px; white-space: pre-wrap; background: #f1f3f5; border: none; border-radius: 12px; padding: 15px;">${mod.content || 'No content.'}</div>`;
            }

            return `
                <div class="course-module">
                    <span class="module-type-badge">${mod.type === 'video' ? 'VIDEO' : 'READING'}</span>
                    <h5 style="margin: 0 0 10px 0; font-size: 15px;">Module ${index + 1}: ${mod.title}</h5>
                    ${contentHtml}
                </div>
            `;
        }).join('') || '<p class="text-center p-4">Belum ada materi kursus.</p>';

        if (modules.length > 0) {
            document.getElementById('btnStartQuizMobile').style.display = 'block';
        }
    }

    document.getElementById('courseDetailModal').classList.add('active');
}

function startQuizMobile() {
    const data = getData();
    const quiz = (data.quizzes || []).find(q => q.courseId === currentCourseIdMobile);

    if (!quiz) {
        alert('Belum ada kuis untuk kursus ini.');
        return;
    }

    document.getElementById('mobileMaterialContainer').style.display = 'none';
    document.getElementById('btnStartQuizMobile').style.display = 'none';

    const quizArea = document.getElementById('mobileQuizArea');
    quizArea.style.display = 'block';

    let html = `<h4 class="mb-4">${quiz.title}</h4><form id="mobileQuizForm">`;
    quiz.questions.forEach((q, index) => {
        html += `<div class="course-module mb-4">
                    <p style="font-weight: 600; font-size: 14px; margin-bottom: 15px;">${index + 1}. ${q.text}</p>`;

        if (q.type === 'essay') {
            html += `<textarea class="mobile-input" name="mq${q.id}" rows="4" placeholder="Ketik jawaban Anda..." required></textarea>`;
        } else {
            (q.options || []).forEach((opt, optIdx) => {
                html += `
                    <label class="d-flex align-items-center mb-3" style="cursor: pointer;">
                        <input type="radio" name="mq${q.id}" value="${optIdx}" required style="width: 20px; height: 20px; margin-right: 12px; accent-color: var(--mobile-primary);">
                        <span style="font-size: 14px;">${opt}</span>
                    </label>
                `;
            });
        }
        html += `</div>`;
    });

    html += `<button type="submit" class="btn-clock btn-in mt-3"><i class="fas fa-paper-plane"></i> Submit Jawaban</button></form>`;
    quizArea.innerHTML = html;

    document.getElementById('mobileQuizForm').onsubmit = (e) => {
        e.preventDefault();
        submitMobileQuiz(quiz);
    };
}

function submitMobileQuiz(quiz) {
    const formData = new FormData(document.getElementById('mobileQuizForm'));
    let totalQuestions = quiz.questions.length;
    let correctOnes = 0;

    quiz.questions.forEach(q => {
        const val = formData.get(`mq${q.id}`);
        if (q.type === 'essay') {
            correctOnes++; // Mock correct for essay on mobile for now
        } else if (parseInt(val) === q.answer) {
            correctOnes++;
        }
    });

    const finalScore = (correctOnes / totalQuestions) * 100;

    if (finalScore >= quiz.passingScore) {
        // Complete Course Logic
        const data = getData();
        const user = JSON.parse(localStorage.getItem('currentUser'));
        let enrollment = (data.enrollments || []).find(e => e.courseId === currentCourseIdMobile && e.userId === user.id);

        if (!enrollment) {
            enrollment = { id: Date.now(), userId: user.id, courseId: currentCourseIdMobile, progress: 100, status: 'completed' };
            if (!data.enrollments) data.enrollments = [];
            data.enrollments.push(enrollment);
        } else {
            enrollment.status = 'completed';
            enrollment.progress = 100;
            enrollment.completionDate = new Date().toISOString();
        }

        saveData(data);
        alert(`Selamat! Anda lulus dengan skor ${finalScore.toFixed(0)}`);

        document.getElementById('mobileQuizArea').style.display = 'none';
        document.getElementById('mobileCertificateArea').style.display = 'block';
        renderMobileLearning('all');
    } else {
        alert(`Skor Anda ${finalScore.toFixed(0)}. Skor kelulusan adalah ${quiz.passingScore}. Silakan coba lagi.`);
    }
}

/**
 * Leave Request Logic
 */
function showLeaveModal() {
    const modal = document.getElementById('leaveModal');
    if (!modal) return;
    modal.classList.add('active');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leaveStartDate').value = today;
    document.getElementById('leaveEndDate').value = today;
}

function submitLeaveRequest(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value;

    if (!type || !start || !end || !reason) {
        alert('Mohon lengkapi semua data pengajuan.');
        return;
    }

    const newRequest = {
        id: Date.now(),
        userId: user.id,
        empId: user.empId || 'EMP001',
        name: user.name,
        type: type,
        startDate: start,
        endDate: end,
        reason: reason,
        status: 'Pending',
        submittedAt: new Date().toISOString()
    };

    if (!data.leaveRequests) data.leaveRequests = [];
    data.leaveRequests.push(newRequest);
    saveData(data);
    alert('Pengajuan Anda berhasil dikirim! Mohon tunggu persetujuan Admin.');
    closeModal('leaveModal');
    document.getElementById('leaveForm').reset();
}

/**
 * Attendance Modal Logic
 */
function showAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (!modal) return;
    modal.classList.add('active');
    updateModalData();
    checkClockStatus();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function updateModalData() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('modalTime').textContent = timeStr;
    document.getElementById('modalDate').textContent = dateStr;
}

function checkClockStatus() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();
    const today = new Date().toISOString().split('T')[0];
    const logToday = (data.attendance || []).find(log => log.userId === user.id && log.date === today);

    const hasIn = logToday && logToday.clockIn !== '';
    const hasOut = logToday && logToday.clockOut !== '';

    const statusEl = document.getElementById('attendanceStatus');
    const btnIn = document.getElementById('btnClockIn');
    const btnOut = document.getElementById('btnClockOut');

    if (hasOut) {
        statusEl.textContent = "Status: Sudah Kerja & Pulang (Selesai)";
        statusEl.style.color = "#0984E3";
        btnIn.disabled = true;
        btnOut.disabled = true;
        btnOut.classList.remove('active');
    } else if (hasIn) {
        statusEl.textContent = "Status: Sudah Clock In (Sedang Bekerja)";
        statusEl.style.color = "#FF9B6A";
        btnIn.disabled = true;
        btnOut.disabled = false;
        btnOut.classList.add('active');
    } else {
        statusEl.textContent = "Status: Belum Absen";
        statusEl.style.color = "#00B894";
        btnIn.disabled = false;
        btnOut.disabled = true;
        btnOut.classList.remove('active');
    }
}

function processClock(type) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    if (!data.attendance) data.attendance = [];

    // Find existing log for today
    let log = data.attendance.find(l => l.userId === user.id && l.date === today);
    let isNew = false;

    if (!log) {
        isNew = true;
        log = {
            id: Date.now(),
            userId: user.id,
            empId: user.id, // Admin view expects user.id as empId based on previous audit
            name: user.name,
            date: today,
            clockIn: '',
            clockOut: '',
            status: 'P',
            locationIn: '',
            locationOut: '',
            isLate: false
        };
    }

    if (type === 'In') {
        log.clockIn = time;
        log.locationIn = 'Mobile App';
        // Simple late detection (hardcoded 08:00 for demo)
        if (now.getHours() >= 8 && now.getMinutes() > 0) {
            log.isLate = true;
            log.status = 'DT';
        }
    } else {
        log.clockOut = time;
        log.locationOut = 'Mobile App';
    }

    if (isNew) data.attendance.push(log);

    saveData(data);

    // NOTIFIKASI
    createNotification(user.id, `Absensi ${type} Berhasil`, `Anda telah melakukan Clock ${type} pada pukul ${time} via Mobile.`, "attendance");

    alert(`Berhasil Absen ${type} pada ${time}`);
    checkClockStatus();
}

function renderWinners(data, currentUser) {
    const listContainer = document.getElementById('rankingListContainer');
    if (!listContainer) return;
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));
    const rankings = employees.map(emp => {
        const evaluation = data.evaluations ? data.evaluations.find(e => e.userId === emp.id) : null;
        return {
            id: emp.id,
            name: emp.name,
            points: evaluation ? Math.round(evaluation.radarData.reduce((a, b) => a + b, 0) * 10) : Math.floor(Math.random() * 5000) + 1000,
            avatar: emp.avatar || `https://i.pravatar.cc/100?u=${emp.id}`
        };
    }).sort((a, b) => b.points - a.points);

    const top3 = rankings.slice(0, 3);
    const podiumItems = document.querySelectorAll('.podium-item');
    const layoutOrder = [top3[1], top3[0], top3[2]];

    podiumItems.forEach((item, idx) => {
        const pData = layoutOrder[idx];
        if (pData) {
            item.querySelector('img').src = pData.avatar;
            item.querySelector('.podium-name').textContent = pData.name.split(' ')[0];
            item.querySelector('.podium-pts').textContent = `${pData.points} Pts`;
        }
    });

    listContainer.innerHTML = rankings.slice(3, 10).map((p, idx) => `
        <div class="rank-item">
            <span class="rank-num">${idx + 4}</span>
            <img src="${p.avatar}" class="rank-avatar">
            <span class="rank-name">${p.name}</span>
            <span class="rank-pts">${p.points} Pts</span>
        </div>
    `).join('');

    const myRank = rankings.findIndex(r => r.id === currentUser.id) + 1;
    const myData = rankings.find(r => r.id === currentUser.id);
    const currUserEl = document.querySelector('.rank-item.current-user');
    if (currUserEl && myData) {
        currUserEl.querySelector('.rank-num').textContent = myRank;
        currUserEl.querySelector('.rank-avatar').src = myData.avatar;
        currUserEl.querySelector('.rank-name').textContent = `${myData.name} (You)`;
        currUserEl.querySelector('.rank-pts').textContent = `${myData.points} Pts`;
    }
}

/**
 * Notification Center Logic
 */
function initNotifications() {
    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));

    // Create dummy notifications if not exists
    if (!data.notifications || data.notifications.length === 0) {
        data.notifications = [
            {
                id: 1,
                userId: user.id,
                title: "Pengajuan Cuti Disetujui",
                message: "Pengajuan cuti tahunan Anda untuk tanggal 20 Feb telah disetujui oleh Admin.",
                type: "leave",
                time: "2 jam yang lalu",
                isRead: false
            },
            {
                id: 2,
                userId: user.id,
                title: "Info Learning Hub",
                message: "Kursus baru 'Effective Communication' telah tersedia untuk Anda kerjakan.",
                type: "learning",
                time: "1 hari yang lalu",
                isRead: true
            },
            {
                id: 3,
                userId: user.id,
                title: "Performa Bulanan",
                message: "Manajer Anda baru saja memberikan feedback untuk review performa bulan Januari.",
                type: "performance",
                time: "2 hari yang lalu",
                isRead: true
            }
        ];
        saveData(data);
    }
}

function renderNotifications() {
    const list = document.getElementById('mobileNotificationsList');
    const emptyState = document.getElementById('emptyNotifState');
    if (!list) return;

    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const userNotifs = (data.notifications || []).filter(n => n.userId === user.id);

    if (userNotifs.length === 0) {
        list.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        list.style.display = 'block';
        emptyState.style.display = 'none';

        list.innerHTML = userNotifs.map(n => `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
                <div class="notif-icon-box ${n.type}">
                    <i class="fas ${getNotifIcon(n.type)}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
            </div>
        `).reverse().join(''); // Show latest first
    }

    updateNotifBadge();
}

function getNotifIcon(type) {
    switch (type) {
        case 'leave': return 'fa-calendar-check';
        case 'attendance': return 'fa-clock';
        case 'learning': return 'fa-graduation-cap';
        case 'performance': return 'fa-chart-line';
        default: return 'fa-bell';
    }
}

function markNotificationRead(id) {
    const data = getData();
    const notif = data.notifications.find(n => n.id === id);
    if (notif) {
        notif.isRead = true;
        saveData(data);
        renderNotifications();
    }
}

function markAllNotificationsRead() {
    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    data.notifications.forEach(n => {
        if (n.userId === user.id) n.isRead = true;
    });
    saveData(data);
    renderNotifications();
}

function updateNotifBadge() {
    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const hasUnread = (data.notifications || []).some(n => n.userId === user.id && !n.isRead);

    const navItem = document.querySelector('.nav-item:last-child'); // Notifications icon
    if (navItem) {
        if (hasUnread) navItem.classList.add('has-notif');
        else navItem.classList.remove('has-notif');
    }
}

// Global scope
window.startQuizMobile = startQuizMobile;
window.filterMobileCourses = filterMobileCourses;
window.openCourseDetail = openCourseDetail;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.switchView = switchView;
window.navigateTo = navigateTo;
