/**
 * Mobile Interface Logic for E-PeopleSync — PostgreSQL API Version
 */

const API = 'http://localhost:3001';

// ── In-memory state ──────────────────────────────────────────
let _mCourses = [];
let _mEnrollments = [];
let _mQuizzes = [];
let _mModules = [];
let _mNotifs = [];
let _mAttendance = [];
let _mLeaves = [];
let _mApprovers = [];
let _mShifts = [];
let _mRoster = [];
let currentCourseIdMobile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth(['employee', 'manager', 'admin']);
    if (!user) return;
    await initMobileUI(user);
    updateTime();
    setInterval(updateTime, 60000);
});

async function initMobileUI(user) {
    // 1. Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    document.querySelector('.greeting-prefix').textContent = greeting;
    document.getElementById('userGreetingName').textContent = user.name;

    // 2. Avatars
    const userAvatar = user.avatar || `https://i.pravatar.cc/150?u=${user.id}`;
    const navAvatar = document.getElementById('navAvatar');
    const homeAvatar = document.getElementById('homeProfileImg');
    if (navAvatar) navAvatar.src = userAvatar;
    if (homeAvatar) homeAvatar.src = userAvatar;

    // 3. Load base data in parallel
    await Promise.all([
        loadMobileShifts(),
        loadMobileRoster(user),
        loadMobileNotifications(user),
        loadMobileNews()
    ]);

    // 4. Render Leaderboard from employees API
    renderWinners(user);

    // 5. Badge
    updateNotifBadge();
}

// ── Helpers ───────────────────────────────────────────────────
async function loadMobileShifts() {
    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        _mShifts = data['shiftDefinitions'] ? JSON.parse(data['shiftDefinitions']) : [];
    } catch { _mShifts = []; }
}

async function loadMobileRoster(user) {
    try {
        const res = await fetch(`${API}/api/attendance/roster?userId=${user.id}`);
        _mRoster = await res.json();
    } catch { _mRoster = []; }
}

async function loadMobileNotifications(user) {
    try {
        const res = await fetch(`${API}/api/notifications?userId=${user.id}`);
        _mNotifs = await res.json();
    } catch { _mNotifs = []; }
}

async function loadMobileNews() {
    try {
        const res = await fetch(`${API}/api/news`);
        const newsData = await res.json();
        renderMobileNewsData(newsData);
    } catch { }
}

// ── Avatar Upload ──────────────────────────────────────────────
async function handleAvatarUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('avatar', file);
    const user = JSON.parse(localStorage.getItem('currentUser'));
    formData.append('username', user.username);

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('homeProfileImg').src = e.target.result;
        document.getElementById('navAvatar').src = e.target.result;
    };
    reader.readAsDataURL(file);

    try {
        const response = await fetch(`${API}/api/upload-avatar`, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            user.avatar = result.avatar;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showToast('Foto Profil Berhasil Diupdate! 📸');
        } else alert('Gagal upload foto: ' + result.message);
    } catch (err) {
        console.error('Upload Error:', err);
        alert('Gagal menghubungi server.');
    }
}

function updateTime() {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
}

// ── View Switching ─────────────────────────────────────────────
function switchView(viewId, el) {
    if (navigator.vibrate) navigator.vibrate(5);
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.animation = 'none';
        view.offsetHeight;
        view.style.animation = null;
    });
    const targetView = document.getElementById(viewId + 'View');
    if (targetView) {
        targetView.classList.add('active');
        if (viewId === 'learning') renderMobileLearning('all');
        if (viewId === 'perform') renderMobilePerformance();
        if (viewId === 'notifications') renderNotifications();
        if (viewId === 'history') renderMobileHistory('attendance');
        if (viewId === 'news') loadMobileNews();
        if (viewId === 'stats') {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            renderWinners(user);
        }
    } else {
        if (viewId === 'home') document.getElementById('homeView').classList.add('active');
    }
}

function navigateTo(feature) {
    if (navigator.vibrate) navigator.vibrate(10);
    const card = event.currentTarget;
    if (card) { card.style.transform = 'scale(0.95)'; setTimeout(() => card.style.transform = '', 150); }
    setTimeout(() => {
        switch (feature) {
            case 'attendance': showAttendanceModal(); break;
            case 'leave': showLeaveModal(); break;
            case 'learning': switchView('learning', document.querySelector('.nav-item:nth-child(2)')); break;
            case 'perform': switchView('perform', document.querySelector('.nav-item:nth-child(4)')); break;
            case 'stats': switchView('stats', document.querySelector('.nav-item:nth-child(4)')); break;
            default: showToast(`Fitur ${feature} segera hadir!`);
        }
    }, 100);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = message;
    Object.assign(toast.style, { position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '12px', zIndex: '9999', opacity: '0', transition: 'opacity 0.3s' });
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

// ── Learning Hub ────────────────────────────────────────────────
async function renderMobileLearning(filter) {
    const grid = document.getElementById('mobileCourseGrid');
    if (!grid) return;
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const [cRes, eRes] = await Promise.all([
            fetch(`${API}/api/learning/courses`),
            fetch(`${API}/api/learning/enrollments?userId=${user.id}`)
        ]);
        _mCourses = await cRes.json();
        _mEnrollments = await eRes.json();
    } catch { _mCourses = []; _mEnrollments = []; }

    let courses = _mCourses;
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (filter === 'progress') {
        courses = courses.filter(c => {
            const e = _mEnrollments.find(en => en.course_id === c.id || en.courseId === c.id);
            return e && e.status === 'in-progress';
        });
    } else if (filter === 'completed') {
        courses = courses.filter(c => {
            const e = _mEnrollments.find(en => en.course_id === c.id || en.courseId === c.id);
            return e && e.status === 'completed';
        });
    }

    if (courses.length === 0) {
        grid.innerHTML = '<div class="text-center p-5"><p>Tidak ada kursus ditemukan.</p></div>'; return;
    }
    grid.innerHTML = courses.map(course => {
        const enrollment = _mEnrollments.find(e => e.course_id === course.id || e.courseId === course.id);
        const progress = enrollment ? enrollment.progress : 0;
        const isCompleted = enrollment && enrollment.status === 'completed';
        return `
            <div class="m-course-card">
                <div class="m-course-img" style="background-image:url('${course.thumbnail}')">
                    <span class="m-course-tag">${course.category || 'Skill'}</span>
                </div>
                <div class="m-course-body">
                    <h4 class="m-course-title">${course.title}</h4>
                    <p class="m-course-desc">${course.description || ''}</p>
                    <div class="m-course-progress-label"><span>PROGRESS</span><span>${progress}%</span></div>
                    <div class="m-course-progress-bar"><div class="m-progress-fill" style="width:${progress}%"></div></div>
                    <button class="m-btn-learn ${isCompleted ? 'completed' : ''}" onclick="openCourseDetail(${course.id})">
                        ${isCompleted ? '<i class="fas fa-check-circle"></i> Selesai' : 'Lanjutkan Belajar'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

function filterMobileCourses(filter, el) {
    document.querySelectorAll('#learningView .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderMobileLearning(filter);
}

async function openCourseDetail(id) {
    currentCourseIdMobile = id;
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const [mRes, qRes, eRes] = await Promise.all([
            fetch(`${API}/api/learning/modules?courseId=${id}`),
            fetch(`${API}/api/learning/quizzes?courseId=${id}`),
            fetch(`${API}/api/learning/enrollments?userId=${user.id}`)
        ]);
        _mModules = await mRes.json();
        _mQuizzes = await qRes.json();
        _mEnrollments = await eRes.json();
    } catch { return; }

    const course = _mCourses.find(c => c.id === id);
    const enrollment = _mEnrollments.find(e => e.course_id === id || e.courseId === id);
    if (!course) return;

    document.getElementById('mobileCourseTitle').textContent = course.title;
    document.getElementById('mobileMaterialContainer').style.display = 'block';
    document.getElementById('mobileQuizArea').style.display = 'none';
    document.getElementById('mobileCertificateArea').style.display = 'none';
    document.getElementById('btnStartQuizMobile').style.display = 'none';

    if (enrollment && enrollment.status === 'completed') {
        document.getElementById('mobileMaterialContainer').style.display = 'none';
        document.getElementById('mobileCertificateArea').style.display = 'block';
    } else {
        const container = document.getElementById('mobileMaterialContainer');
        const courseModules = _mModules.filter(m => (m.course_id === id || m.courseId === id));
        container.innerHTML = courseModules.map((mod, idx) => {
            let contentHtml = '';
            if (mod.type === 'video') {
                const videoId = mod.url && mod.url.includes('v=') ? mod.url.split('v=')[1].split('&')[0] : (mod.url || '').split('/').pop();
                contentHtml = `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
            } else {
                contentHtml = `<div class="alert alert-secondary mt-2" style="font-size:13px;white-space:pre-wrap;background:#f1f3f5;border:none;border-radius:12px;padding:15px;">${mod.content || 'No content.'}</div>`;
            }
            return `<div class="course-module"><span class="module-type-badge">${mod.type === 'video' ? 'VIDEO' : 'READING'}</span><h5 style="margin:0 0 10px 0;font-size:15px;">Module ${idx + 1}: ${mod.title}</h5>${contentHtml}</div>`;
        }).join('') || '<p class="text-center p-4">Belum ada materi kursus.</p>';
        if (courseModules.length > 0) document.getElementById('btnStartQuizMobile').style.display = 'block';
    }
    document.getElementById('courseDetailModal').classList.add('active');
}

function startQuizMobile() {
    const quiz = _mQuizzes.find(q => q.course_id === currentCourseIdMobile || q.courseId === currentCourseIdMobile);
    if (!quiz) { alert('Belum ada kuis untuk kursus ini.'); return; }
    document.getElementById('mobileMaterialContainer').style.display = 'none';
    document.getElementById('btnStartQuizMobile').style.display = 'none';
    const quizArea = document.getElementById('mobileQuizArea');
    quizArea.style.display = 'block';
    let html = `<h4 class="mb-4">${quiz.title}</h4><form id="mobileQuizForm">`;
    (quiz.questions || []).forEach((q, idx) => {
        html += `<div class="course-module mb-4"><p style="font-weight:600;font-size:14px;margin-bottom:15px;">${idx + 1}. ${q.text}</p>`;
        if (q.type === 'essay') {
            html += `<textarea class="mobile-input" name="mq${q.id}" rows="4" placeholder="Ketik jawaban Anda..." required></textarea>`;
        } else {
            (q.options || []).forEach((opt, optIdx) => {
                html += `<label class="d-flex align-items-center mb-3" style="cursor:pointer;"><input type="radio" name="mq${q.id}" value="${optIdx}" required style="width:20px;height:20px;margin-right:12px;"><span style="font-size:14px;">${opt}</span></label>`;
            });
        }
        html += '</div>';
    });
    html += '<button type="submit" class="btn-clock btn-in mt-3"><i class="fas fa-paper-plane"></i> Submit Jawaban</button></form>';
    quizArea.innerHTML = html;
    document.getElementById('mobileQuizForm').onsubmit = e => { e.preventDefault(); submitMobileQuiz(quiz); };
}

async function submitMobileQuiz(quiz) {
    const formData = new FormData(document.getElementById('mobileQuizForm'));
    let correct = 0;
    (quiz.questions || []).forEach(q => {
        if (q.type === 'essay') correct++;
        else if (parseInt(formData.get(`mq${q.id}`)) === q.answer) correct++;
    });
    const score = ((correct / (quiz.questions || []).length) * 100) || 0;
    if (score >= (quiz.passingScore || 70)) {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        try {
            await fetch(`${API}/api/learning/enrollments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, courseId: currentCourseIdMobile, progress: 100, status: 'completed' })
            });
        } catch { }
        alert(`Selamat! Anda lulus dengan skor ${score.toFixed(0)}`);
        document.getElementById('mobileQuizArea').style.display = 'none';
        document.getElementById('mobileCertificateArea').style.display = 'block';
        renderMobileLearning('all');
    } else {
        alert(`Skor Anda ${score.toFixed(0)}. Skor kelulusan adalah ${quiz.passingScore || 70}. Silakan coba lagi.`);
    }
}

// ── Leave Request ───────────────────────────────────────────────
async function showLeaveModal() {
    const modal = document.getElementById('leaveModal');
    if (!modal) return;
    modal.classList.add('active');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leaveStartDate').value = today;
    document.getElementById('leaveEndDate').value = today;

    // Load approvers from API
    try {
        const res = await fetch(`${API}/api/employees?role=manager`);
        const admR = await fetch(`${API}/api/employees?role=admin`);
        const mgrs = await res.json();
        const adms = await admR.json();
        _mApprovers = [...mgrs, ...adms];
    } catch { _mApprovers = []; }

    const spvSelect = document.getElementById('reqSupervisorMobile');
    const mgrSelect = document.getElementById('reqManagerMobile');
    if (spvSelect) spvSelect.innerHTML = '<option value="">-- Pilih SPV --</option>' + _mApprovers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    if (mgrSelect) mgrSelect.innerHTML = '<option value="">-- Pilih Manager --</option>' + _mApprovers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

function autoFillPositionMobile(type) {
    const id = document.getElementById(type === 'supervisor' ? 'reqSupervisorMobile' : 'reqManagerMobile').value;
    const pos = document.getElementById(type === 'supervisor' ? 'reqSupervisorPositionMobile' : 'reqManagerPositionMobile');
    if (!pos) return;
    const selected = _mApprovers.find(a => a.id == id);
    pos.value = selected ? (selected.position || 'Approver') : '';
}

function showTrialLink(link) {
    const popup = document.getElementById('trialLinkPopup');
    const href = document.getElementById('trialLinkHref');
    if (!popup || !href) return;
    href.href = link; href.textContent = link;
    popup.style.display = 'block';
}

async function submitLeaveRequest(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value;
    const spvSelect = document.getElementById('reqSupervisorMobile');
    const mgrSelect = document.getElementById('reqManagerMobile');

    if (!type || !start || !end || !reason || !spvSelect.value || !mgrSelect.value) {
        alert('Mohon lengkapi semua data pengajuan.'); return;
    }

    const spvObj = _mApprovers.find(a => a.id == spvSelect.value);
    const mgrObj = _mApprovers.find(a => a.id == mgrSelect.value);

    const payload = {
        user_id: user.id,
        emp_nid: user.nid,
        emp_name: user.name,
        type, start_date: start, end_date: end, reason,
        status: 'waiting_supervisor',
        supervisor_id: spvSelect.value,
        supervisor_name: spvObj ? spvObj.name : '',
        supervisor_email: spvObj ? (spvObj.email_company || spvObj.email_personal || '') : '',
        manager_id: mgrSelect.value,
        manager_name: mgrObj ? mgrObj.name : '',
        manager_email: mgrObj ? (mgrObj.email_company || mgrObj.email_personal || '') : '',
    };

    try {
        const res = await fetch(`${API}/api/leave`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const newReq = await res.json();
        const approvalLink = `${window.location.origin}/dashboard/approvers.html?requestId=${newReq.id}&role=supervisor`;
        console.log(`%c[SIMULASI EMAIL TL]`, 'color:#00796b;font-weight:bold;');
        console.log(`Kepada: ${payload.supervisor_email}`);
        console.log(`Link Persetujuan: ${approvalLink}`);
        alert(`Pengajuan berhasil dikirim ke Team Leader: ${payload.supervisor_name}!`);
        showTrialLink(approvalLink);
        closeModal('leaveModal');
        document.getElementById('leaveForm').reset();
        renderMobileHistory('leave');
    } catch { alert('Gagal mengirim pengajuan. Coba lagi.'); }
}

// ── Attendance Modal ────────────────────────────────────────────
function showAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (!modal) return;
    modal.classList.add('active');
    updateModalData();
    checkClockStatus();
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function updateModalData() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('modalTime').textContent = timeStr;
    document.getElementById('modalDate').textContent = dateStr;
}

async function checkClockStatus() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const today = new Date().toISOString().split('T')[0];
    try {
        const res = await fetch(`${API}/api/attendance?userId=${user.id}&date=${today}`, { headers: getAuthHeaders() });
        const logs = await res.json();
        const logToday = logs[0];
        const statusEl = document.getElementById('attendanceStatus');
        const btnIn = document.getElementById('btnClockIn');
        const btnOut = document.getElementById('btnClockOut');
        const hasIn = logToday && logToday.clock_in && logToday.clock_in !== '';
        const hasOut = logToday && logToday.clock_out && logToday.clock_out !== '';
        if (hasOut) {
            statusEl.textContent = 'Status: Sudah Kerja & Pulang (Selesai)'; statusEl.style.color = '#0984E3';
            btnIn.disabled = true; btnOut.disabled = true; btnOut.classList.remove('active');
        } else if (hasIn) {
            statusEl.textContent = 'Status: Sudah Clock In (Sedang Bekerja)'; statusEl.style.color = '#FF9B6A';
            btnIn.disabled = true; btnOut.disabled = false; btnOut.classList.add('active');
        } else {
            statusEl.textContent = 'Status: Belum Absen'; statusEl.style.color = '#00B894';
            btnIn.disabled = false; btnOut.disabled = true; btnOut.classList.remove('active');
        }
    } catch { console.error('checkClockStatus error'); }
}

async function processClock(type) {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

        // Get effective shift
        const shiftCode = getEffectiveShiftCodeMobile(user, today);
        const shiftDef = _mShifts.find(s => s.code === shiftCode);

        // Determine late status
        let isLate = false;
        if (type === 'In' && shiftDef && shiftDef.clockIn) {
            const [defH, defM] = shiftDef.clockIn.split(':').map(Number);
            if (now.getHours() > defH || (now.getHours() === defH && now.getMinutes() > defM)) isLate = true;
        }

        // Find existing log
        try {
            const res = await fetch(`${API}/api/attendance?userId=${user.id}&date=${today}`, { headers: { ...getAuthHeaders() } });
            const logs = await res.json();
            const existing = logs[0];

            const payload = {
                user_id: user.id,
                name: user.name,
                date: today,
                status: shiftCode,
                is_late: isLate,
                clock_in: type === 'In' ? time : (existing ? existing.clock_in : ''),
                clock_out: type === 'Out' ? time : (existing ? existing.clock_out : ''),
                location_in: type === 'In' ? 'Mobile App' : (existing ? existing.location_in : ''),
                location_out: type === 'Out' ? 'Mobile App' : ''
            };

            await fetch(`${API}/api/attendance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(payload)
            });

            // Sync roster
            await fetch(`${API}/api/attendance/roster`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ user_id: user.id, date: today, shift_code: shiftCode, notes: 'Auto-sync from Mobile Attendance' })
            });

            // Notification
            await fetch(`${API}/api/notifications`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ user_id: user.id, title: `Absensi ${type} Berhasil`, message: `Anda telah melakukan Clock ${type} pada pukul ${time} via Mobile.`, type: 'attendance' })
            });

            alert(`Berhasil Absen ${type} pada ${time}\nStatus: ${shiftCode}`);

            // Force immediate UI update for better UX before network refresh
            const statusEl = document.getElementById('attendanceStatus');
            const btnIn = document.getElementById('btnClockIn');
            const btnOut = document.getElementById('btnClockOut');

            if (type === 'In') {
                statusEl.textContent = 'Status: Sudah Clock In (Sedang Bekerja)';
                statusEl.style.color = '#FF9B6A';
                btnIn.disabled = true;
                btnOut.disabled = false;
                btnOut.classList.add('active');
            } else if (type === 'Out') {
                statusEl.textContent = 'Status: Sudah Kerja & Pulang (Selesai)';
                statusEl.style.color = '#0984E3';
                btnIn.disabled = true;
                btnOut.disabled = true;
                btnOut.classList.remove('active');
            }

            checkClockStatus();
            renderMobileHistory('attendance');
        } catch (innerError) {
            console.error('Inner fetch error:', innerError);
            alert('Gagal mengambil/menyimpan data. Pastikan koneksi internet stabil.');
        }
    } catch (e) {
        console.error('processClock inner error:', e);
        alert('Gagal absen. Front-end error: ' + e.message);
    }
}

function getEffectiveShiftCodeMobile(user, date) {
    const rosterEntry = _mRoster.find(r => (r.emp_id == user.id || r.empId == user.id) && r.date === date);
    if (rosterEntry && rosterEntry.shift && !['Off', 'L', 'Libur'].includes(rosterEntry.shift)) return rosterEntry.shift;
    return 'DT';
}

// ── Rankings / Winners ──────────────────────────────────────────
async function renderWinners(currentUser) {
    const listContainer = document.getElementById('rankingListContainer');
    if (!listContainer) return;
    try {
        const res = await fetch(`${API}/api/employees`);
        const emps = await res.json();
        const employees = emps.filter(u => ['employee', 'manager'].includes(u.role));
        const rankings = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            points: Math.floor(Math.random() * 5000) + 1000,
            avatar: emp.avatar || `https://i.pravatar.cc/100?u=${emp.id}`
        })).sort((a, b) => b.points - a.points);

        const top3 = rankings.slice(0, 3);
        const podiumItems = document.querySelectorAll('.podium-item');
        const layout = [top3[1], top3[0], top3[2]];
        podiumItems.forEach((item, idx) => {
            const p = layout[idx];
            if (p) { item.querySelector('img').src = p.avatar; item.querySelector('.podium-name').textContent = p.name.split(' ')[0]; item.querySelector('.podium-pts').textContent = `${p.points} Pts`; }
        });
        listContainer.innerHTML = rankings.slice(3, 10).map((p, idx) =>
            `<div class="rank-item"><span class="rank-num">${idx + 4}</span><img src="${p.avatar}" class="rank-avatar"><span class="rank-name">${p.name}</span><span class="rank-pts">${p.points} Pts</span></div>`
        ).join('');
        const myRank = rankings.findIndex(r => r.id === currentUser.id) + 1;
        const myData = rankings.find(r => r.id === currentUser.id);
        const currUserEl = document.querySelector('.rank-item.current-user');
        if (currUserEl && myData) {
            currUserEl.querySelector('.rank-num').textContent = myRank;
            currUserEl.querySelector('.rank-avatar').src = myData.avatar;
            currUserEl.querySelector('.rank-name').textContent = `${myData.name} (You)`;
            currUserEl.querySelector('.rank-pts').textContent = `${myData.points} Pts`;
        }
    } catch { console.error('renderWinners error'); }
}

// ── Notifications ──────────────────────────────────────────────
async function initNotifications() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    await loadMobileNotifications(user);
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('mobileNotificationsList');
    const emptyState = document.getElementById('emptyNotifState');
    if (!list) return;
    if (_mNotifs.length === 0) {
        list.style.display = 'none'; emptyState.style.display = 'block'; return;
    }
    list.style.display = 'block'; emptyState.style.display = 'none';
    list.innerHTML = [..._mNotifs].reverse().map(n => `
        <div class="notif-item ${n.is_read || n.isRead ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
            <div class="notif-icon-box ${n.type}"><i class="fas ${getNotifIcon(n.type)}"></i></div>
            <div class="notif-content">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${n.time || new Date(n.created_at).toLocaleString('id-ID')}</div>
            </div>
        </div>`).join('');
    updateNotifBadge();
}

function getNotifIcon(type) {
    const icons = { leave: 'fa-calendar-check', attendance: 'fa-clock', learning: 'fa-graduation-cap', performance: 'fa-chart-line' };
    return icons[type] || 'fa-bell';
}

async function markNotificationRead(id) {
    try {
        await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT' });
        const n = _mNotifs.find(n => n.id === id);
        if (n) n.is_read = true;
        renderNotifications();
    } catch { }
}

async function markAllNotificationsRead() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    try {
        await Promise.all(_mNotifs.filter(n => !(n.is_read || n.isRead)).map(n =>
            fetch(`${API}/api/notifications/${n.id}/read`, { method: 'PUT' })
        ));
        _mNotifs.forEach(n => n.is_read = true);
        renderNotifications();
    } catch { }
}

function updateNotifBadge() {
    const hasUnread = _mNotifs.some(n => !(n.is_read || n.isRead));
    const navItem = document.querySelector('.nav-item:last-child');
    if (navItem) navItem.classList.toggle('has-notif', hasUnread);
}

// ── History ─────────────────────────────────────────────────────
async function renderMobileHistory(type, el) {
    const list = document.getElementById('mobileHistoryList');
    if (!list) return;
    if (!type) {
        const activeTab = document.querySelector('.hist-tab.active');
        type = activeTab ? (activeTab.textContent.includes('Absensi') ? 'attendance' : 'leaves') : 'attendance';
    }
    if (el) { document.querySelectorAll('.hist-tab').forEach(t => t.classList.remove('active')); el.classList.add('active'); }

    const filterInput = document.getElementById('historyFilterMonth');
    if (filterInput && !filterInput.value) {
        const now = new Date();
        filterInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const selectedMonth = filterInput ? filterInput.value : '';
    const user = JSON.parse(localStorage.getItem('currentUser'));
    list.innerHTML = '';
    const summaryPanel = document.getElementById('leaveSummaryPanel');
    if (summaryPanel) summaryPanel.style.display = type === 'leaves' ? 'grid' : 'none';

    if (type === 'attendance') {
        try {
            let url = `${API}/api/attendance?userId=${user.id}`;
            if (selectedMonth) url += `&month=${selectedMonth}`;
            const res = await fetch(url, { headers: { ...getAuthHeaders() } });
            let myLogs = await res.json();
            myLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (myLogs.length === 0) {
                list.innerHTML = `<div class="text-center p-5"><i class="fas fa-calendar-times mb-3" style="font-size:40px;color:#cbd5e0;"></i><p>Tidak ada riwayat absensi pada bulan ${selectedMonth}.</p></div>`;
                return;
            }
            list.innerHTML = myLogs.map(l => `
                <div class="hist-card">
                    <div class="hist-info">
                        <div class="hist-date">${formatDate(l.date)}</div>
                        <div class="hist-time-row">
                            <span><i class="fas fa-sign-in-alt text-success"></i> ${l.clock_in || l.clockIn || '--:--'}</span>
                            <span><i class="fas fa-sign-out-alt text-danger"></i> ${l.clock_out || l.clockOut || '--:--'}</span>
                        </div>
                        <span class="hist-meta">Lokasi: ${l.location_in || l.locationIn || 'N/A'}</span>
                    </div>
                    <div class="hist-status-box">
                        <span class="hist-badge ${(l.is_late || l.isLate) ? 'late' : 'ontime'}">${(l.is_late || l.isLate) ? 'Terlambat' : 'Tepat Waktu'}</span>
                    </div>
                </div>`).join('');
        } catch (e) {
            console.error('renderMobileHistory attendance error:', e);
            list.innerHTML = '<p class="text-center p-5">Gagal memuat data absensi.</p>';
        }
    } else {
        try {
            const res = await fetch(`${API}/api/leave?userId=${user.id}`, { headers: { ...getAuthHeaders() } });
            const reqs = await res.json();
            if (reqs.length === 0) {
                list.innerHTML = '<div class="text-center p-5"><i class="fas fa-plane-slash mb-3" style="font-size:40px;color:#cbd5e0;"></i><p>Belum ada riwayat pengajuan cuti.</p></div>';
                return;
            }
            const sorted = [...reqs].sort((a, b) => new Date(b.submitted_at || b.submittedAt) - new Date(a.submitted_at || a.submittedAt));
            list.innerHTML = sorted.map(item => {
                const statusLower = (item.status || '').toLowerCase();
                let statusLabel = item.status, badgeClass = statusLower;
                if (statusLower === 'waiting_supervisor') { statusLabel = 'Menunggu TL'; badgeClass = 'pending'; }
                else if (statusLower === 'waiting_final') { statusLabel = 'Menunggu ASMAN'; badgeClass = 'pending'; }
                else if (statusLower === 'approved') { statusLabel = 'Disetujui'; badgeClass = 'approved'; }
                else if (statusLower === 'rejected') { statusLabel = 'Ditolak'; badgeClass = 'rejected'; }
                const displayDate = item.start_date || item.startDate || '-';
                return `
                    <div class="hist-card" style="position:relative;">
                        <div class="hist-info">
                            <span class="hist-date">${formatDate(displayDate)}</span>
                            <div class="hist-time-row">
                                <span><i class="far fa-clock"></i> ${item.type || 'Cuti'}</span>
                                ${item.reason ? `<span style="display:block;font-size:10px;color:#999;">${item.reason}</span>` : ''}
                            </div>
                        </div>
                        <div class="hist-status-box" style="text-align:right;">
                            <span class="hist-badge ${badgeClass}">${statusLabel}</span>
                            ${item.status === 'Approved' ? `<button onclick="generateReceiptPDF(${item.id})" style="display:block;margin-top:5px;background:none;border:1px solid var(--premium-emerald);color:var(--premium-emerald);padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;width:100%;"><i class="fas fa-print"></i> Cetak Resi</button>` : ''}
                        </div>
                    </div>`;
            }).join('');
        } catch (e) {
            console.error('renderMobileHistory leave error:', e);
            list.innerHTML = '<p class="text-center p-5">Gagal memuat data cuti.</p>';
        }
    }
}

// ── News ───────────────────────────────────────────────────────
function renderMobileNewsData(newsArr) {
    const container = document.getElementById('news-list-vertical');
    if (!container) return;
    if (!newsArr || newsArr.length === 0) {
        container.innerHTML = '<div class="text-center p-5"><p>Tidak ada berita saat ini.</p></div>'; return;
    }
    const sorted = [...newsArr].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(item => `
        <div class="m-news-item" onclick="openNewsDetail(${item.id})">
            <div class="m-news-img" style="background-image:url('${item.image || ''}')"></div>
            <div class="m-news-info">
                <span class="m-news-date">${formatDate(item.date)}</span>
                <h4 class="m-news-item-title">${item.title}</h4>
                <p class="m-news-excerpt">${(item.content || '').substring(0, 60)}...</p>
            </div>
            <i class="fas fa-chevron-right m-news-arrow"></i>
        </div>`).join('');
}

async function renderMobileNews() { await loadMobileNews(); }

async function openNewsDetail(id) {
    try {
        const res = await fetch(`${API}/api/news/${id}`);
        const item = await res.json();
        let modal = document.getElementById('newsDetailModal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'newsDetailModal'; modal.className = 'bottom-modal'; document.body.appendChild(modal); }
        modal.innerHTML = `
            <div class="news-modal-content">
                <img src="${item.image || ''}" class="news-detail-img" onerror="this.style.display='none'">
                <div class="news-detail-body">
                    <h3 class="news-detail-title">${item.title}</h3>
                    <div class="news-detail-meta">
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(item.date)}</span>
                        <span><i class="far fa-user"></i> ${item.author || '-'}</span>
                    </div>
                    <div class="news-detail-text">${(item.content || '').replace(/\n/g, '<br>')}</div>
                    <button class="btn-block mt-4" onclick="closeNewsDetail()" style="background:#f1f3f5;color:#2D3436;">Close</button>
                </div>
            </div>`;
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) { overlay = document.createElement('div'); overlay.id = 'modalOverlay'; overlay.className = 'modal-overlay'; overlay.onclick = closeNewsDetail; document.body.appendChild(overlay); }
        setTimeout(() => { modal.classList.add('active'); overlay.classList.add('active'); }, 10);
    } catch { alert('Gagal memuat berita.'); }
}

function closeNewsDetail() {
    const modal = document.getElementById('newsDetailModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// ── Performance ─────────────────────────────────────────────────
function renderMobilePerformance() { /* Placeholder - handled by evaluation.js */ }

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Global scope ───────────────────────────────────────────────
window.startQuizMobile = startQuizMobile;
window.filterMobileCourses = filterMobileCourses;
window.openCourseDetail = openCourseDetail;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.switchView = switchView;
window.navigateTo = navigateTo;
window.renderMobileHistory = renderMobileHistory;
window.renderMobileNews = renderMobileNews;
window.openNewsDetail = openNewsDetail;
window.closeNewsDetail = closeNewsDetail;
window.autoFillPositionMobile = autoFillPositionMobile;
window.showLeaveModal = showLeaveModal;
window.submitLeaveRequest = submitLeaveRequest;
window.closeModal = closeModal;
window.showAttendanceModal = showAttendanceModal;
window.processClock = processClock;
