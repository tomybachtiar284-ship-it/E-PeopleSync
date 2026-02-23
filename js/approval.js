/**
 * Digital Approval Logic — PostgreSQL API Version
 * Multi-stage transitions: Supervisor → Manager → Final
 */

const API = 'http://localhost:3001';
let currentRequest = null;
let currentRole = null;

document.addEventListener('DOMContentLoaded', () => {
    initApprovalPage();
});

async function initApprovalPage() {
    const params = new URLSearchParams(window.location.search);
    const requestId = parseInt(params.get('requestId'));
    currentRole = params.get('role');

    if (!requestId || !currentRole) {
        showError("Invalid Parameters: Missing ID or Role.");
        return;
    }

    try {
        const res = await fetch(`${API}/api/leave/${requestId}`);
        if (!res.ok) throw new Error('Not found');
        currentRequest = await res.json();
    } catch (e) {
        showError("Data pengajuan tidak ditemukan.");
        return;
    }

    // Security check
    if (currentRole === 'supervisor' && currentRequest.status !== 'waiting_supervisor') {
        showError("Pengajuan ini sudah diproses atau bukan tahap Supervisor.");
        return;
    }
    if (currentRole === 'manager' && currentRequest.status !== 'waiting_final') {
        showError("Pengajuan ini sudah diproses atau sedang menunggu Supervisor.");
        return;
    }

    renderDetails();
}

function renderDetails() {
    document.getElementById('dispName').textContent = currentRequest.emp_name || currentRequest.empName || currentRequest.name || '-';
    document.getElementById('dispType').textContent = currentRequest.type || '-';
    document.getElementById('dispPeriod').textContent = `${currentRequest.start_date || currentRequest.startDate || '-'} s/d ${currentRequest.end_date || currentRequest.endDate || '-'}`;
    document.getElementById('dispReason').textContent = currentRequest.reason || '-';
    document.getElementById('roleBadge').textContent = currentRole === 'supervisor' ? 'TEAM LEADER APPROVAL' : 'ASMAN APPROVAL';
    document.getElementById('viewTitle').textContent = `Persetujuan ${currentRequest.type || ''}`;
}

async function handleAction(action) {
    if (!currentRequest) return;

    try {
        if (action === 'Rejected') {
            await fetch(`${API}/api/leave/${currentRequest.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Rejected', approved_by: currentRole })
            });
            showSuccess("Pengajuan Ditolak", "Status telah diperbarui menjadi Ditolak.");
            return;
        }

        // APPROVAL LOGIC
        if (currentRole === 'supervisor') {
            // Stage 1: Supervisor approved → move to waiting_final
            await fetch(`${API}/api/leave/${currentRequest.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'waiting_final', approved_by: 'supervisor' })
            });
            showSuccess("Persetujuan Diterima", "Berhasil! Pengajuan diteruskan ke ASMAN untuk persetujuan akhir.");
            simulateEmailToASMAN(currentRequest);

        } else if (currentRole === 'manager') {
            // Stage 2: ASMAN final approval → sync roster
            await fetch(`${API}/api/leave/${currentRequest.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Approved', approved_by: 'manager' })
            });
            // Sync to roster via API
            await syncToRosterAPI(currentRequest);
            showSuccess("Persetujuan ASMAN Berhasil", "Pengajuan disetujui sepenuhnya dan sinkron ke Roster Kehadiran.");
        }
    } catch (e) {
        alert('Gagal memproses: ' + e.message);
    }
}

async function syncToRosterAPI(req) {
    const typeMapping = {
        'Cuti Tahunan': 'CT', 'Sakit': 'SD', 'Izin': 'I',
        'Dinas Luar': 'DL', 'Alpa': 'A'
    };
    const shift_code = typeMapping[req.type] || req.type || 'Off';
    const start = new Date(req.start_date || req.startDate);
    const end = new Date(req.end_date || req.endDate);
    const changes = [];

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        changes.push({
            user_id: req.user_id || req.userId,
            date: dt.toLocaleDateString('en-CA'),
            shift_code
        });
    }

    await Promise.all(changes.map(c =>
        fetch(`${API}/api/attendance/roster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c)
        })
    ));
}

function simulateEmailToASMAN(req) {
    const token = Math.random().toString(36).substr(2);
    const origin = window.location.origin === 'null' ? 'file://' : window.location.origin;
    const approvalLink = `${origin}${window.location.pathname}?requestId=${req.id}&role=manager&token=${token}`;

    console.log("%c[SIMULASI EMAIL ASMAN]", "color:#1976d2;font-weight:bold;font-size:16px;");
    console.log(`Kepada: ${req.manager_email || req.managerEmail || '-'}`);
    console.log(`Subjek: PERSETUJUAN FINAL - ${req.emp_name || req.empName}`);
    console.log(`Link: ${approvalLink}`);

    const nextStageDiv = document.getElementById('trialNextStage');
    const nextStageLink = document.getElementById('trialNextLink');
    if (nextStageDiv && nextStageLink) {
        nextStageDiv.style.display = 'block';
        nextStageLink.href = approvalLink;
        nextStageLink.textContent = approvalLink;
    }
}

function showSuccess(title, msg) {
    document.getElementById('mainView').style.display = 'none';
    document.getElementById('successView').style.display = 'block';
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMsg').textContent = msg;
}

function showError(msg) {
    document.getElementById('mainView').style.display = 'none';
    document.getElementById('errorView').style.display = 'block';
    document.getElementById('errorMsg').textContent = msg;
}
