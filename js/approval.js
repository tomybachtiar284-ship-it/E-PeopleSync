/**
 * Digital Approval Logic
 * Handles multi-stage transitions: Supervisor -> Manager -> Final
 */

let currentRequest = null;
let currentRole = null; // 'supervisor' or 'manager'

document.addEventListener('DOMContentLoaded', () => {
    initApprovalPage();
});

function initApprovalPage() {
    const params = new URLSearchParams(window.location.search);
    const requestId = parseInt(params.get('requestId'));
    currentRole = params.get('role');
    const token = params.get('token');

    if (!requestId || !currentRole) {
        showError("Invalid Parameters: Missing ID or Role.");
        return;
    }

    const data = getData();
    currentRequest = (data.leaveRequests || []).find(r => r.id === requestId);

    if (!currentRequest) {
        showError("Data pengajuan tidak ditemukan.");
        return;
    }

    // Security check (Simulation: match status with requested role)
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
    document.getElementById('dispName').textContent = currentRequest.empName || currentRequest.name;
    document.getElementById('dispType').textContent = currentRequest.type;
    document.getElementById('dispPeriod').textContent = `${currentRequest.startDate || currentRequest.dateStart} s/d ${currentRequest.endDate || currentRequest.dateEnd}`;
    document.getElementById('dispReason').textContent = currentRequest.reason || '-';

    document.getElementById('roleBadge').textContent = currentRole === 'supervisor' ? 'TEAM LEADER APPROVAL' : 'ASMAN APPROVAL';
    document.getElementById('viewTitle').textContent = `Persetujuan ${currentRequest.type}`;
}

function handleAction(action) {
    if (!currentRequest) return;

    const data = getData();
    const req = data.leaveRequests.find(r => r.id === currentRequest.id);
    if (!req) return;

    if (action === 'Rejected') {
        req.status = 'Rejected';
        req.approvalHistory.push({
            role: currentRole,
            action: 'Rejected',
            time: new Date().toISOString()
        });
        saveData(data);
        showSuccess("Pengajuan Ditolak", "Status telah diperbarui menjadi Ditolak.");

        // Notify Employee
        createNotification(req.userId, "Pengajuan Ditolak", `Pengajuan ${req.type} Anda ditolak oleh ${currentRole === 'supervisor' ? 'Team Leader' : 'ASMAN'}.`, "leave");
        return;
    }

    // APPROVAL LOGIC
    if (currentRole === 'supervisor') {
        // Stage 1: Move to ASMAN
        req.status = 'waiting_final';
        req.approvalHistory.push({
            role: 'supervisor',
            action: 'Approved',
            time: new Date().toISOString()
        });
        saveData(data);

        showSuccess("Persetujuan Diterima", "Berhasil! Pengajuan diteruskan ke ASMAN untuk persetujuan akhir.");

        // SIMULATE EMAIL TO ASMAN
        simulateEmailToASMAN(req);

    } else if (currentRole === 'manager') {
        // Stage 2: ASMAN Final Approval
        req.status = 'Approved';
        req.approvedAt = new Date().toISOString();
        req.approvalHistory.push({
            role: 'asman',
            action: 'Approved',
            time: new Date().toISOString()
        });

        // SYNC TO ROSTER
        syncToRoster(req, data);

        saveData(data);
        showSuccess("Persetujuan ASMAN Berhasil", "Pengajuan telah disetujui sepenuhnya oleh ASMAN dan sinkron ke Roster Kehadiran.");

        // Notify Employee
        createNotification(req.userId, "Pengajuan Disetujui", `Pengajuan ${req.type} Anda telah disetujui oleh ASMAN.`, "leave");
    }
}

function syncToRoster(req, data) {
    const start = new Date(req.startDate || req.dateStart);
    const end = new Date(req.endDate || req.dateEnd);

    // Leave Type to Roster Code Mapping
    const typeMapping = {
        'Cuti Tahunan': 'CT',
        'Sakit': 'SD',
        'Izin': 'I',
        'Dinas Luar': 'DL',
        'Alpa': 'A'
    };
    const rosterCode = typeMapping[req.type] || req.type || 'Off';

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        const dateStr = dt.toISOString().split('T')[0];
        if (!data.roster) data.roster = [];
        // Corrected: Use req.userId (numeric ID) instead of req.empId (display NID)
        const rosterIdx = data.roster.findIndex(r => r.empId === req.userId && r.date === dateStr);
        if (rosterIdx > -1) {
            data.roster[rosterIdx].shift = rosterCode;
        } else {
            data.roster.push({ empId: req.userId, date: dateStr, shift: rosterCode });
        }
    }
}

function simulateEmailToASMAN(req) {
    const token = Math.random().toString(36).substr(2);
    const origin = window.location.origin === 'null' ? 'file://' : window.location.origin;
    const path = window.location.pathname;
    const approvalLink = `${origin}${path}?requestId=${req.id}&role=manager&token=${token}`;

    console.log("%c[SIMULASI EMAIL ASMAN]", "color: #1976d2; font-weight: bold; font-size: 16px;");
    console.log(`Kepada: ${req.managerEmail}`);
    console.log(`Subjek: PERSETUJUAN FINAL - ${req.empName}`);
    console.log(`Link: ${approvalLink}`);

    // Show Trial Link for next stage
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
