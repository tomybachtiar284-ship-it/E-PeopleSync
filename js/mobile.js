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

    // Update all avatar instances
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) navAvatar.src = userAvatar;

    const homeAvatar = document.getElementById('homeProfileImg');
    if (homeAvatar) homeAvatar.src = userAvatar;

    // 3. Render Leaderboard (Winners)
    renderWinners(data, user);

    // 4. Initialize Notifications
    initNotifications();
    updateNotifBadge();

    // 5. Render News
    renderMobileNews();
}

/**
 * Handle Avatar Upload
 */
async function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        // Get current user to identify who is uploading
        const user = JSON.parse(localStorage.getItem('currentUser'));
        formData.append('username', user.username);

        // UI Optimistic Update (Preview)
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('homeProfileImg').src = e.target.result;
            document.getElementById('navAvatar').src = e.target.result;
        }
        reader.readAsDataURL(file);

        try {
            // Send to Backend
            const response = await fetch('http://localhost:3001/api/upload-avatar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update Local Storage with new Avatar URL from server
                user.avatar = result.avatar;
                localStorage.setItem('currentUser', JSON.stringify(user));

                // Show Success Toast
                showToast("Foto Profil Berhasil Diupdate! 📸");
            } else {
                alert('Gagal upload foto: ' + result.message);
                // Revert UI if needed (refresh page or reload user data)
            }
        } catch (error) {
            console.error('Upload Error:', error);
            alert('Gagal menghubungi server. Pastikan server backend berjalan.');
        }
    }
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
    // Haptic Feedback
    if (navigator.vibrate) navigator.vibrate(5);

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    // Update active view with animation reset
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.animation = 'none'; // Reset animation
        view.offsetHeight; /* trigger reflow */
        view.style.animation = null;
    });

    const targetView = document.getElementById(viewId + 'View');
    if (targetView) {
        targetView.classList.add('active');

        // Render View Content
        if (viewId === 'learning') renderMobileLearning('all');
        if (viewId === 'perform') renderMobilePerformance();
        if (viewId === 'notifications') renderNotifications();
        if (viewId === 'history') renderMobileHistory('attendance');
        if (viewId === 'news') renderMobileNews();
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
 * Feature Navigation with Haptic Feedback
 */
function navigateTo(feature) {
    // Haptic Feedback (if supported)
    if (navigator.vibrate) navigator.vibrate(10);

    const card = event.currentTarget;
    if (card) {
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.style.transform = "", 150);
    }

    setTimeout(() => {
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
                switchView('stats', document.querySelector('.nav-item:nth-child(4)')); // Corrected index for stats if needed, or link to history/profile
                break;
            case 'learning_detail':
                break;
            default:
                // Toast notification instead of alert
                showToast(`Fitur ${feature} segera hadir!`);
        }
    }, 100); // Small delay for animation
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = message;

    // Inline styles for toast if not in CSS
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '20px',
        fontSize: '12px',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.3s'
    });

    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
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

    // POPULATE APPROVERS (Mobile) - Pull from NEW bucket
    const data = getData();
    const approvers = data.companyApprovers || [];

    const spvSelect = document.getElementById('reqSupervisorMobile');
    const mgrSelect = document.getElementById('reqManagerMobile');

    if (spvSelect) {
        spvSelect.innerHTML = '<option value="">-- Pilih SPV --</option>' +
            approvers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }

    if (mgrSelect) {
        mgrSelect.innerHTML = '<option value="">-- Pilih Manager --</option>' +
            approvers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

function autoFillPositionMobile(type) {
    const data = getData();
    const approvers = data.companyApprovers || [];
    const id = document.getElementById(type === 'supervisor' ? 'reqSupervisorMobile' : 'reqManagerMobile').value;
    const posInput = document.getElementById(type === 'supervisor' ? 'reqSupervisorPositionMobile' : 'reqManagerPositionMobile');

    if (!posInput) return;

    const selected = approvers.find(a => a.id == id);
    posInput.value = selected ? (selected.position || 'Approver') : '';

    // If Trial Link is visible, hide it on any change to avoid confusion
    const trialPopup = document.getElementById('trialLinkPopup');
    if (trialPopup) trialPopup.style.display = 'none';
}

function showTrialLink(link) {
    const trialPopup = document.getElementById('trialLinkPopup');
    const trialLinkHref = document.getElementById('trialLinkHref');
    if (!trialPopup || !trialLinkHref) return;

    trialLinkHref.href = link;
    trialLinkHref.textContent = link;
    trialPopup.style.display = 'block';
}

function submitLeaveRequest(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();
    const approvers = data.companyApprovers || [];

    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value;

    const spvSelect = document.getElementById('reqSupervisorMobile');
    const mgrSelect = document.getElementById('reqManagerMobile');

    if (!type || !start || !end || !reason || !spvSelect.value || !mgrSelect.value) {
        alert('Mohon lengkapi semua data pengajuan.');
        return;
    }

    const spvObj = approvers.find(a => a.id == spvSelect.value);
    const mgrObj = approvers.find(a => a.id == mgrSelect.value);

    const spvName = spvObj ? spvObj.name : 'Unknown';
    const spvEmail = spvObj ? (spvObj.email || 'supervisor@test.com') : 'supervisor@test.com';
    const mgrName = mgrObj ? mgrObj.name : 'Unknown';
    const mgrEmail = mgrObj ? (mgrObj.email || 'manager@test.com') : 'manager@test.com';

    const newRequest = {
        id: Date.now(),
        userId: user.id,
        empId: user.nid || 'EMP-001',
        empName: user.name,
        type: type,
        startDate: start,
        endDate: end,
        reason: reason,
        status: 'waiting_supervisor',

        // Approver Info
        supervisorId: spvSelect.value,
        supervisorName: spvName,
        supervisorEmail: spvEmail,
        managerId: mgrSelect.value,
        managerName: mgrName,
        managerEmail: mgrEmail,

        submittedAt: new Date().toISOString(),
        approvalHistory: []
    };

    if (!data.leaveRequests) data.leaveRequests = [];
    data.leaveRequests.push(newRequest);
    saveData(data);

    // Simulate Email to Team Leader
    const approvalLink = `${window.location.origin}${window.location.pathname.replace('index.html', 'approval.html')}?requestId=${newRequest.id}&role=supervisor&token=${Math.random().toString(36).substr(2)}`;

    console.log("%c[SIMULASI EMAIL TL]", "color: #00796b; font-weight: bold; font-size: 14px;");
    console.log(`Kepada (TL): ${spvEmail}`);
    console.log(`Subjek: Persetujuan Pengajuan Cuti - ${user.name}`);
    console.log(`Link Persetujuan: ${approvalLink}`);

    alert(`Pengajuan Anda berhasil dikirim ke Team Leader: ${spvName}!`);
    showTrialLink(approvalLink);

    closeModal('leaveModal');
    document.getElementById('leaveForm').reset();
    renderMobileHistory('leave'); // Refresh history if viewing
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
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    // 1. Determine Effective Shift Code
    const effectiveShiftCode = getEffectiveShiftCode(data, currentUser, today);
    const shiftDef = (data.shiftDefinitions || []).find(s => s.code === effectiveShiftCode);

    if (!data.attendance) data.attendance = [];

    // Find existing log for today
    let log = data.attendance.find(l => l.userId === currentUser.id && l.date === today);
    let isNew = false;

    if (!log) {
        isNew = true;
        log = {
            id: Date.now(),
            userId: currentUser.id,
            empId: currentUser.id, // Admin view expects user.id as empId
            name: currentUser.name,
            date: today,
            clockIn: '',
            clockOut: '',
            status: effectiveShiftCode, // Initialize with shift code
            locationIn: '',
            locationOut: '',
            isLate: false
        };
    }

    if (type === 'In') {
        log.clockIn = time;
        log.locationIn = 'Mobile App';
        log.status = effectiveShiftCode; // Ensure status matches shift code (e.g., DT, P)

        // Dynamic Late Detection based on Shift Definition
        if (shiftDef && shiftDef.clockIn) {
            const [defH, defM] = shiftDef.clockIn.split(':').map(Number);
            const currentH = now.getHours();
            const currentM = now.getMinutes();

            // Late if current time > shift start time
            if (currentH > defH || (currentH === defH && currentM > defM)) {
                log.isLate = true;
            } else {
                log.isLate = false;
            }
        }
    } else {
        log.clockOut = time;
        log.locationOut = 'Mobile App';
    }

    if (isNew) data.attendance.push(log);

    // 2. Sync to Roster Table
    if (!data.roster) data.roster = [];
    const rosterIdx = data.roster.findIndex(r => r.empId === currentUser.id && r.date === today);
    if (rosterIdx > -1) {
        data.roster[rosterIdx].shift = effectiveShiftCode;
    } else {
        data.roster.push({ empId: currentUser.id, date: today, shift: effectiveShiftCode });
    }

    saveData(data);

    // NOTIFIKASI
    createNotification(currentUser.id, `Absensi ${type} Berhasil`, `Anda telah melakukan Clock ${type} pada pukul ${time} via Mobile.`, "attendance");

    alert(`Berhasil Absen ${type} pada ${time}\nStatus: ${effectiveShiftCode}`);
    checkClockStatus();
}

/**
 * Helper to determine the expected shift code based on individual roster or group patterns
 */
function getEffectiveShiftCode(data, user, date) {
    // 1. Check Individual Roster (Specific mapping for this employee)
    const rosterEntry = (data.roster || []).find(r => r.empId === user.id && r.date === date);
    if (rosterEntry && rosterEntry.shift && !['Off', 'L', 'Libur'].includes(rosterEntry.shift)) {
        return rosterEntry.shift;
    }

    // 2. Check Group Patterns (The system-wide schedule from "Shift Patterns" tab)
    const [year, month, day] = date.split('-').map(Number);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const dayIndex = day - 1;
    const group = user.group || '';

    if (data.groupPatterns && data.groupPatterns[monthKey] && data.groupPatterns[monthKey][group]) {
        const groupShift = data.groupPatterns[monthKey][group][dayIndex];
        if (groupShift && !['Off', 'L', 'Libur'].includes(groupShift)) {
            return groupShift;
        }
    }

    // 3. Fallback to hardcoded group defaults (based on user's system configuration)
    const groupLower = group.toLowerCase();
    if (groupLower.includes('daytime') || group === 'DT') return 'DT';
    if (groupLower.includes('grup a')) return 'P';
    if (groupLower.includes('grup b')) return 'M'; // Malam
    if (groupLower.includes('grup c')) return 'S'; // Siang
    if (groupLower.includes('grup d')) return 'L'; // Libur/Off

    return 'DT'; // Default fallback
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

function renderMobileHistory(type, el) {
    const list = document.getElementById('mobileHistoryList');
    if (!list) return;

    // Default to 'attendance' if type is undefined, or keep current type
    if (!type) {
        // Find active tab to determine type
        const activeTab = document.querySelector('.hist-tab.active');
        type = activeTab ? (activeTab.textContent.includes('Absensi') ? 'attendance' : 'leaves') : 'attendance';
    }

    // Handle Tab UI
    if (el) {
        document.querySelectorAll('.hist-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    }

    // Initialize Filter Date if empty
    const filterInput = document.getElementById('historyFilterMonth');
    if (filterInput && !filterInput.value) {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        filterInput.value = monthStr;
    }
    const selectedMonth = filterInput ? filterInput.value : '';

    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));

    list.innerHTML = '';

    // Show/Hide Summary Panel based on type
    const summaryPanel = document.getElementById('leaveSummaryPanel');
    if (summaryPanel) {
        summaryPanel.style.display = type === 'leaves' ? 'grid' : 'none';
    }

    if (type === 'attendance') {
        let myLogs = (data.attendance || []).filter(l => l.userId === user.id);

        // Filter by Month
        if (selectedMonth) {
            myLogs = myLogs.filter(l => l.date.startsWith(selectedMonth));
        }

        myLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (myLogs.length === 0) {
            list.innerHTML = `<div class="text-center p-5"><i class="fas fa-calendar-times mb-3" style="font-size:40px; color:#cbd5e0;"></i><p>Tidak ada riwayat absensi pada bulan ${selectedMonth}.</p></div>`;
            return;
        }

        list.innerHTML = myLogs.map(l => `
            <div class="hist-card">
                <div class="hist-info">
                    <div class="hist-date">${formatDate(l.date)}</div>
                    <div class="hist-time-row">
                        <span><i class="fas fa-sign-in-alt text-success"></i> ${l.clockIn || '--:--'}</span>
                        <span><i class="fas fa-sign-out-alt text-danger"></i> ${l.clockOut || '--:--'}</span>
                    </div>
                    <span class="hist-meta">Lokasi: ${l.locationIn || 'N/A'}</span>
                </div>
                <div class="hist-status-box">
                    <span class="hist-badge ${l.isLate ? 'late' : 'ontime'}">${l.isLate ? 'Terlambat' : 'Tepat Waktu'}</span>
                    <span class="hist-meta">${l.status === 'DT' ? 'Datang Terlambat' : 'Hadir Penuh'}</span>
                </div>
            </div>
        `).join('');
    } else {
        const myRequests = (data.leaveRequests || [])
            .filter(r => r.userId === user.id);

        if (myRequests.length === 0) {
            list.innerHTML = '<div class="text-center p-5"><i class="fas fa-plane-slash mb-3" style="font-size:40px; color:#cbd5e0;"></i><p>Belum ada riwayat pengajuan cuti.</p></div>';
            return;
        }
        const sortedItems = myRequests.sort((a, b) => new Date(b.date || b.dateStart || b.submittedAt) - new Date(a.date || a.dateStart || a.submittedAt));

        list.innerHTML = sortedItems.map(item => {
            let statusLabel = item.status;
            let badgeClass = item.status.toLowerCase();

            const statusLower = (item.status || '').toLowerCase();
            if (statusLower === 'waiting_supervisor') {
                statusLabel = 'Menunggu TL';
                badgeClass = 'pending';
            } else if (statusLower === 'waiting_final') {
                statusLabel = 'Menunggu ASMAN';
                badgeClass = 'pending';
            } else if (statusLower === 'approved') {
                statusLabel = 'Disetujui';
                badgeClass = 'approved';
            } else if (statusLower === 'rejected') {
                statusLabel = 'Ditolak';
                badgeClass = 'rejected';
            }

            const displayDate = item.date ? formatDate(item.date) : (item.dateStart ? formatDate(item.dateStart) : 'Date Error');

            return `
                <div class="hist-card" style="position: relative;">
                    <div class="hist-info">
                        <span class="hist-date">${displayDate}</span>
                        <div class="hist-time-row">
                            <span><i class="far fa-clock"></i> ${item.type || 'Attendance'}</span>
                            ${item.reason ? `<span style="display:block; font-size:10px; color:#999;">${item.reason}</span>` : ''}
                        </div>
                    </div>
                    <div class="hist-status-box" style="text-align: right;">
                        <span class="hist-badge ${badgeClass}">${statusLabel}</span>
                        ${item.status === 'Approved' ? `<button onclick="generateReceiptPDF(${item.id})" style="display:block; margin-top:5px; background: none; border: 1px solid var(--premium-emerald); color: var(--premium-emerald); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; width: 100%;"><i class="fas fa-print"></i> Cetak Resi</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// News Logic
function renderMobileNews() {
    const verticalContainer = document.getElementById('news-list-vertical');

    const data = getData();
    const news = (data.news || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render Vertical List (Dedicated View)
    if (verticalContainer) {
        if (news.length === 0) {
            verticalContainer.innerHTML = '<div class="text-center p-5"><p>Tidak ada berita saat ini.</p></div>';
        } else {
            verticalContainer.innerHTML = news.map(item => `
                <div class="m-news-item" onclick="openNewsDetail(${item.id})">
                    <div class="m-news-img" style="background-image: url('${item.image || 'https://via.placeholder.com/400x200?text=News'}')"></div>
                    <div class="m-news-info">
                        <span class="m-news-date">${formatDate(item.date)}</span>
                        <h4 class="m-news-item-title">${item.title}</h4>
                        <p class="m-news-excerpt">${item.content.substring(0, 60)}...</p>
                    </div>
                    <i class="fas fa-chevron-right m-news-arrow"></i>
                </div>
            `).join('');
        }
    }
}

function openNewsDetail(id) {
    const data = getData();
    const newsItem = data.news.find(n => n.id === id);
    if (!newsItem) return;

    // Create Modal on the fly if not exists
    let modal = document.getElementById('newsDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'newsDetailModal';
        modal.className = 'bottom-modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="news-modal-content">
            <img src="${newsItem.image || 'https://via.placeholder.com/600x400?text=News'}" class="news-detail-img" onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=News';">
            <div class="news-detail-body">
                <h3 class="news-detail-title">${newsItem.title}</h3>
                <div class="news-detail-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formatDate(newsItem.date)}</span>
                    <span><i class="far fa-user"></i> ${newsItem.author}</span>
                </div>
                <div class="news-detail-text">
                    ${newsItem.content.replace(/\n/g, '<br>')}
                </div>
                <button class="btn-block mt-4" onclick="closeNewsDetail()" style="background: #f1f3f5; color: #2D3436;">Close</button>
            </div>
        </div>
    `;

    // Add overlay if not exists
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.className = 'modal-overlay';
        overlay.onclick = closeNewsDetail; // Global helper might interfere, ensure specific close
        document.body.appendChild(overlay);
    }

    setTimeout(() => {
        modal.classList.add('active');
        overlay.classList.add('active');
    }, 10);
}

function closeNewsDetail() {
    const modal = document.getElementById('newsDetailModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// Global scope
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
