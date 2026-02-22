/**
 * Admin Attendance & Shift Logic — PostgreSQL API Version
 */

const API = 'http://localhost:3001';
let currentViewDate = new Date();
let activeRosterCell = null;

// ── Cache ─────────────────────────────────────────────────────
let _cache = { employees: [], roster: [], attendance: [], leave: [], shifts: [] };

async function loadCache() {
    const yr = currentViewDate.getFullYear();
    const mo = currentViewDate.getMonth() + 1;
    try {
        const [emps, roster, att, leave, shifts] = await Promise.all([
            fetch(`${API}/api/employees`).then(r => r.json()),
            fetch(`${API}/api/attendance/roster?month=${mo}&year=${yr}`).then(r => r.json()),
            fetch(`${API}/api/attendance?month=${mo}&year=${yr}`).then(r => r.json()),
            fetch(`${API}/api/leave`).then(r => r.json()),
            fetch(`${API}/api/attendance/shifts`).then(r => r.json()),
        ]);
        _cache.employees = emps.filter(u => ['employee', 'manager'].includes(u.role));
        _cache.roster = Array.isArray(roster) ? roster : [];
        _cache.attendance = Array.isArray(att) ? att : [];
        _cache.leave = Array.isArray(leave) ? leave : [];
        _cache.shifts = Array.isArray(shifts) ? shifts : [];
    } catch (e) { console.error('loadCache error:', e.message); }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth(['admin', 'manager', 'employee']);
    if (user) initUserProfile();
    if (user && user.role === 'employee') {
        document.querySelectorAll('.btn-outline-warning,.btn-outline-danger,.btn-primary').forEach(btn => {
            if (btn.innerText.includes('Bulk') || btn.innerText.includes('Clear') || btn.innerText.includes('Save')) btn.style.display = 'none';
        });
    }
    await loadCache();
    initAttendancePage();
});

function initAttendancePage() {
    renderStats(); renderRoster(); renderLogs(); renderApprovalQueue();
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
    const today = new Date().toISOString().split('T')[0];
    const workShifts = ['P', 'S', 'M', 'DT', 'Pagi', 'Siang', 'Malam', 'Daytime'];
    const leaveShifts = ['CT', 'SD', 'DL', 'I', 'Cuti', 'Sakit', 'Dinas Luar', 'Izin'];
    const logsToday = _cache.attendance.filter(l => l.date?.startsWith(today));
    const presentIds = new Set(logsToday.map(l => l.user_id));
    const lateCount = logsToday.filter(l => l.late_minutes > 0).length;
    const absentCount = _cache.employees.filter(emp => {
        const shift = getRosterShift(emp.id, today);
        return workShifts.includes(shift) && !presentIds.has(emp.id);
    }).length;
    const leaveCount = _cache.employees.filter(emp => leaveShifts.includes(getRosterShift(emp.id, today))).length;
    document.getElementById('statPresent').textContent = logsToday.length;
    document.getElementById('statLate').textContent = lateCount;
    document.getElementById('statAbsent').textContent = absentCount;
    document.getElementById('statLeave').textContent = leaveCount;
}

// ── Roster Render ─────────────────────────────────────────────
function getRosterShift(userId, date) {
    const e = _cache.roster.find(r => r.user_id == userId && r.date?.startsWith(date));
    return e ? e.shift_code : 'Off';
}

function renderRoster() {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('currentMonthYear').textContent = `${mNames[month]} ${year}`;
    const days = new Date(year, month + 1, 0).getDate();
    const header = document.getElementById('rosterHeader');
    const body = document.getElementById('rosterBody');

    header.innerHTML = '<th style="width:50px;text-align:center;">No</th><th class="emp-col">Employee</th>';
    for (let i = 1; i <= days; i++) {
        const today = new Date();
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        header.innerHTML += `<th class="date-col ${isToday ? 'active-day' : ''}">${i}</th>`;
    }

    body.innerHTML = '';
    const employees = [..._cache.employees].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    // roster map for fast lookup
    const rMap = {};
    _cache.roster.forEach(r => { rMap[`${r.user_id}_${r.date?.split('T')[0]}`] = r.shift_code; });
    const frag = document.createDocumentFragment();

    employees.forEach((emp, idx) => {
        const tr = document.createElement('tr');
        let html = `
            <td style="text-align:center;vertical-align:middle;padding:5px;">
                <input type="number" class="order-input" value="${idx + 1}"
                    style="width:40px;text-align:center;border:1px solid #ddd;border-radius:4px;font-size:12px;font-weight:600;color:#555;"
                    onchange="jumpOrder(${emp.id},this.value)">
            </td>
            <td class="emp-col">
                <div class="d-flex align-items-center justify-content-between">
                    <div>${emp.name}<br><small style="color:#999;">${emp.nid || ''} <span style="color:#555;background:#eee;padding:1px 4px;border-radius:3px;margin-left:5px;">${emp.group || 'No Group'}</span></small></div>
                    <div class="reorder-btns d-flex flex-column gap-1 no-print">
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size:8px;line-height:1;" onclick="moveEmp(${emp.id},-1)" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size:8px;line-height:1;" onclick="moveEmp(${emp.id},1)" ${idx === employees.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                    </div>
                </div>
            </td>`;
        for (let i = 1; i <= days; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const shift = rMap[`${emp.id}_${dateStr}`] || 'Off';
            html += `<td><span class="shift-badge ${shift.toLowerCase()}" onclick="openShiftSelection(this,'${emp.id}','${dateStr}')">${shift}</span></td>`;
        }
        tr.innerHTML = html;
        frag.appendChild(tr);
    });
    body.appendChild(frag);
}

// ── Reorder ───────────────────────────────────────────────────
async function moveEmp(empId, dir) {
    const employees = [..._cache.employees].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = employees.findIndex(e => e.id == empId);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= employees.length) return;
    [employees[idx].order, employees[newIdx].order] = [employees[newIdx].order, employees[idx].order];
    // DOM swap for instant feedback
    const tbody = document.getElementById('rosterBody');
    const rows = Array.from(tbody.children);
    dir === -1 ? tbody.insertBefore(rows[idx], rows[newIdx]) : tbody.insertBefore(rows[newIdx], rows[idx]);
    _refreshOrderUI(tbody.children);
    // Save to API
    await Promise.all([
        fetch(`${API}/api/employees/${employees[idx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: employees[idx].order }) }),
        fetch(`${API}/api/employees/${employees[newIdx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: employees[newIdx].order }) })
    ]).catch(e => console.error('moveEmp save error:', e.message));
}

function _refreshOrderUI(rows) {
    Array.from(rows).forEach((row, i) => {
        const inp = row.querySelector('.order-input'); if (inp) inp.value = i + 1;
        const btnU = row.querySelector('.reorder-btns button:first-child');
        const btnD = row.querySelector('.reorder-btns button:last-child');
        if (btnU) btnU.disabled = (i === 0);
        if (btnD) btnD.disabled = (i === rows.length - 1);
    });
}

async function jumpOrder(empId, newDisplay) {
    const employees = [..._cache.employees].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const oldIdx = employees.findIndex(e => e.id == empId);
    if (oldIdx === -1) return;
    let newIdx = parseInt(newDisplay) - 1;
    if (isNaN(newIdx)) return renderRoster();
    newIdx = Math.max(0, Math.min(employees.length - 1, newIdx));
    if (oldIdx === newIdx) return;
    const [moved] = employees.splice(oldIdx, 1);
    employees.splice(newIdx, 0, moved);
    employees.forEach((e, i) => e.order = i);
    _cache.employees = employees;
    renderRoster();
    await Promise.all(employees.map(e =>
        fetch(`${API}/api/employees/${e.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: e.order }) })
    )).catch(e => console.error('jumpOrder save error:', e.message));
}

// ── Shift Selection ───────────────────────────────────────────
function openShiftSelection(cell, empId, date) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.role === 'employee') return;
    activeRosterCell = { cell, empId, date };
    const container = document.querySelector('#shiftModal .d-flex.flex-column');
    if (container) {
        container.innerHTML = '';
        _cache.shifts.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-primary w-100 mb-2 py-2';
            btn.style.cssText = 'text-align:left;padding-left:15px;border-radius:10px;';
            const time = (s.clock_in && s.clock_out) ? ` <small style="color:#666;">(${s.clock_in} - ${s.clock_out})</small>` : '';
            btn.innerHTML = `<strong>${s.code}</strong> - ${s.name}${time}`;
            btn.onclick = () => applyShift(s.code);
            container.appendChild(btn);
        });
    }
    document.getElementById('shiftModal').style.display = 'block';
}

function closeShiftModal() { document.getElementById('shiftModal').style.display = 'none'; }

async function applyShift(shiftCode) {
    if (!activeRosterCell) return;
    const { cell, empId, date } = activeRosterCell;
    cell.textContent = shiftCode;
    cell.className = `shift-badge ${shiftCode.toLowerCase()}`;
    // Update cache
    const existing = _cache.roster.find(r => r.user_id == empId && r.date?.startsWith(date));
    if (existing) existing.shift_code = shiftCode;
    else _cache.roster.push({ user_id: Number(empId), date, shift_code: shiftCode });
    window._pendingRosterChanges = window._pendingRosterChanges || [];
    window._pendingRosterChanges.push({ user_id: empId, date, shift_code: shiftCode });
    closeShiftModal();
}

async function saveRoster() {
    const changes = window._pendingRosterChanges || [];
    if (changes.length === 0) { alert('Tidak ada perubahan untuk disimpan.'); return; }
    try {
        await Promise.all(changes.map(c =>
            fetch(`${API}/api/attendance/roster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
        ));
        window._pendingRosterChanges = [];
        alert('Jadwal berhasil disimpan!');
    } catch (e) { alert('Gagal menyimpan: ' + e.message); }
}

function changeMonth(dir) {
    currentViewDate.setMonth(currentViewDate.getMonth() + dir);
    loadCache().then(() => { renderRoster(); renderStats(); });
}

// ── Bulk & Clear ──────────────────────────────────────────────
function openBulkModal() { document.getElementById('bulkModal').style.display = 'block'; }
function closeBulkModal() { document.getElementById('bulkModal').style.display = 'none'; }

function applyBulkShift() {
    const shiftCode = document.getElementById('bulkShiftType').value;
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    _cache.employees.forEach(emp => {
        for (let i = 1; i <= days; i++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const ex = _cache.roster.find(r => r.user_id == emp.id && r.date?.startsWith(date));
            if (ex) ex.shift_code = shiftCode;
            else _cache.roster.push({ user_id: emp.id, date, shift_code: shiftCode });
            window._pendingRosterChanges = window._pendingRosterChanges || [];
            window._pendingRosterChanges.push({ user_id: emp.id, date, shift_code: shiftCode });
        }
    });
    renderRoster(); closeBulkModal();
    alert(`Shift ${shiftCode} diterapkan. Klik "Save Schedule" untuk menyimpan.`);
}

async function clearMonth() {
    if (!confirm('Hapus seluruh jadwal bulan ini?')) return;
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    _cache.roster = _cache.roster.filter(r => !r.date?.startsWith(prefix));
    // Mark as pending (will be overwritten as Off when saved, or just re-fetch)
    renderRoster(); alert('Jadwal dikosongkan. Klik "Save Schedule" untuk menyimpan ke database.');
}

// ── Logs ──────────────────────────────────────────────────────
function renderLogs() {
    const body = document.getElementById('attendanceLogsBody');
    if (!body) return;
    body.innerHTML = '';
    const logs = [..._cache.attendance].slice(0, 15);
    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#999;padding:20px;">No attendance logs found.</td></tr>';
        return;
    }
    logs.forEach(log => {
        const isLate = log.late_minutes > 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${log.name || 'Unknown'}</td>
            <td style="font-size:13px;">${log.date?.split('T')[0] || ''}</td>
            <td style="font-weight:700;">${log.clock_in || '--:--'}</td>
            <td style="font-weight:700;">${log.clock_out || '--:--'}</td>
            <td><span class="badge ${isLate ? 'badge-danger' : 'badge-success'}" style="padding:4px 10px;border-radius:6px;">${isLate ? 'Late' : 'On Time'}</span></td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editLog(${log.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteLog(${log.id})"><i class="fas fa-trash"></i></button>
            </td>`;
        body.appendChild(tr);
    });
}

// ── Leave Queue ───────────────────────────────────────────────
function renderApprovalQueue() {
    const queueBody = document.getElementById('leaveApprovalBody');
    const historyBody = document.getElementById('leaveHistoryBody');
    if (!queueBody || !historyBody) return;

    const pending = _cache.leave.filter(r => !['approved', 'rejected'].includes((r.status || '').toLowerCase()));
    const processed = _cache.leave.filter(r => ['approved', 'rejected'].includes((r.status || '').toLowerCase()));
    const statusMap = {
        'waiting_supervisor': '<span class="badge badge-info">Menunggu TL</span>',
        'waiting_final': '<span class="badge badge-warning">Menunggu ASMAN</span>',
        'Approved': '<span class="badge badge-success">Diterima</span>',
        'Rejected': '<span class="badge badge-danger">Ditolak</span>',
        'Pending': '<span class="badge badge-secondary">Pending</span>'
    };
    queueBody.innerHTML = '';
    pending.forEach(req => {
        const st = statusMap[req.status] || `<span class="badge badge-secondary">${req.status}</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;">${req.emp_name || req.empName || 'No Name'}</td>
            <td><div class="d-flex flex-column gap-1"><span class="shift-badge ${(req.type || 'off').toLowerCase()}" style="font-size:10px;width:40px;">${req.type || '-'}</span>${st}</div></td>
            <td style="font-size:13px;">${req.start_date || '-'} s/d ${req.end_date || '-'}</td>
            <td title="${req.reason}"><div style="max-width:200px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-size:12px;color:#666;">${req.reason || ''}</div></td>
            <td style="text-align:center;">
                <div class="d-flex justify-content-center gap-1">
                    <button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})" style="border:none;font-weight:700;border-radius:8px;">ACC</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="rejectRequest(${req.id})">Rej</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>`;
        queueBody.appendChild(tr);
    });

    historyBody.innerHTML = '';
    processed.slice().reverse().slice(0, 20).forEach(req => {
        const isApp = (req.status || '').toLowerCase() === 'approved';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${req.emp_name || req.empName || 'No Name'}</td>
            <td><span class="shift-badge ${(req.type || 'off').toLowerCase()}" style="font-size:10px;width:40px;">${req.type || '-'}</span></td>
            <td style="font-size:12px;">${req.start_date || '-'} - ${req.end_date || '-'}</td>
            <td><div style="max-width:150px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-size:11px;color:#777;">${req.reason || '-'}</div></td>
            <td><span class="badge ${isApp ? 'badge-success' : 'badge-danger'}" style="padding:4px 10px;border-radius:6px;">${req.status || '-'}</span></td>
            <td style="text-align:center;"><button class="btn btn-sm btn-outline-danger" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button></td>`;
        historyBody.appendChild(tr);
    });
    if (processed.length === 0) historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No history records found.</td></tr>';

    const badge = document.getElementById('pendingCountBadge');
    if (badge) badge.textContent = `${pending.length} Pending`;
}

// ── Approve / Reject ──────────────────────────────────────────
async function approveRequest(id) {
    if (!confirm('Setujui pengajuan ini secara manual?')) return;
    try {
        const res = await fetch(`${API}/api/leave/${id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Approved', approved_by: 'admin' }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        // Update cache
        const req = _cache.leave.find(r => r.id === id);
        if (req) req.status = 'Approved';
        alert('Pengajuan disetujui! Roster diperbarui otomatis.');
        await loadCache();
        initAttendancePage();
    } catch (e) { alert('Gagal: ' + e.message); }
}

async function rejectRequest(id) {
    if (!confirm('Yakin ingin menolak?')) return;
    try {
        await fetch(`${API}/api/leave/${id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Rejected', approved_by: 'admin' }) });
        const req = _cache.leave.find(r => r.id === id);
        if (req) req.status = 'Rejected';
        renderApprovalQueue();
    } catch (e) { alert('Gagal: ' + e.message); }
}

async function deleteRequest(id) {
    if (!confirm('Hapus record ini?')) return;
    try {
        await fetch(`${API}/api/leave/${id}`, { method: 'DELETE' });
        _cache.leave = _cache.leave.filter(r => r.id !== id);
        renderApprovalQueue(); renderStats();
    } catch (e) { alert('Gagal: ' + e.message); }
}

// ── Edit/Delete Log ───────────────────────────────────────────
function editLog(id) {
    const log = _cache.attendance.find(l => l.id === id);
    if (!log) return;
    document.getElementById('editLogId').value = log.id;
    document.getElementById('editLogDate').value = log.date?.split('T')[0] || '';
    document.getElementById('editLogClockIn').value = log.clock_in || '';
    document.getElementById('editLogClockOut').value = log.clock_out || '';
    document.getElementById('editLogModal').style.display = 'block';
}

async function deleteLog(id) {
    if (!confirm('Hapus log absensi ini?')) return;
    try {
        await fetch(`${API}/api/attendance/${id}`, { method: 'DELETE' });
        _cache.attendance = _cache.attendance.filter(l => l.id !== id);
        renderLogs(); renderStats();
    } catch (e) { alert('Gagal: ' + e.message); }
}

document.getElementById('editLogForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editLogId').value;
    const body = {
        clock_in: document.getElementById('editLogClockIn').value,
        clock_out: document.getElementById('editLogClockOut').value,
    };
    try {
        const res = await fetch(`${API}/api/attendance/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const updated = await res.json();
        const idx = _cache.attendance.findIndex(l => l.id == id);
        if (idx > -1) Object.assign(_cache.attendance[idx], updated);
        closeModal('editLogModal'); renderLogs(); renderStats();
        alert('Log updated successfully.');
    } catch (e) { alert('Gagal: ' + e.message); }
});

// ── Auto-fill Roster from Patterns ───────────────────────────
async function autoFillRosterFromPatterns() {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const days = new Date(year, month + 1, 0).getDate();
    // Ambil group_patterns dari settings
    try {
        const settings = await fetch(`${API}/api/settings`).then(r => r.json());
        const gpSetting = settings.find(s => s.key === 'group_patterns');
        const allPatterns = gpSetting ? (typeof gpSetting.value === 'string' ? JSON.parse(gpSetting.value) : gpSetting.value) : {};
        const patterns = allPatterns[monthKey];
        if (!patterns) { alert(`Pola shift untuk ${monthKey} belum dikonfigurasi.`); return; }
        if (!confirm(`Isi jadwal otomatis untuk bulan ${monthKey}? Jadwal yang ada akan ditimpa.`)) return;

        const changes = [];
        _cache.employees.forEach(emp => {
            const gpat = patterns[emp.group || ''];
            if (!gpat || !Array.isArray(gpat)) return;
            for (let i = 1; i <= days; i++) {
                const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const shift_code = gpat[i - 1] || 'Off';
                changes.push({ user_id: emp.id, date, shift_code });
                const ex = _cache.roster.find(r => r.user_id == emp.id && r.date?.startsWith(date));
                if (ex) ex.shift_code = shift_code;
                else _cache.roster.push({ user_id: emp.id, date, shift_code });
            }
        });
        await Promise.all(changes.map(c => fetch(`${API}/api/attendance/roster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })));
        renderRoster();
        alert(`Jadwal berhasil diisi untuk ${_cache.employees.length} karyawan.`);
    } catch (e) { alert('Error: ' + e.message); }
}

// ── Leave Request (Desktop) ───────────────────────────────────
function openRequestModal() {
    document.getElementById('requestModal').style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reqStart').value = today;
    document.getElementById('reqEnd').value = today;
    // Populate approvers from employees (managers)
    const managers = _cache.employees.filter(e => e.role === 'manager');
    ['reqSupervisor', 'reqManager'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Pilih --</option>' + managers.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    });
}
function closeRequestModal() { document.getElementById('requestModal').style.display = 'none'; }

async function submitDesktopRequest(event) {
    if (event) event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const type = document.getElementById('reqType').value;
    const start = document.getElementById('reqStart').value;
    const end = document.getElementById('reqEnd').value;
    const reason = document.getElementById('reqReason').value;
    const spvId = document.getElementById('reqSupervisor').value;
    const mgrId = document.getElementById('reqManager').value;
    if (!type || !start || !end || !reason || !spvId || !mgrId) { alert('Lengkapi semua data.'); return; }
    try {
        const res = await fetch(`${API}/api/leave`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                user_id: user.id, emp_name: user.name, type, start_date: start, end_date: end,
                reason, status: 'waiting_supervisor', supervisor_id: spvId, manager_id: mgrId
            })
        });
        if (!res.ok) throw new Error('Submit failed');
        alert('Pengajuan berhasil dikirim!');
        closeRequestModal();
        await loadCache(); renderApprovalQueue(); renderStats();
    } catch (e) { alert('Gagal: ' + e.message); }
}

function renderMyRequests() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const body = document.getElementById('myRequestsBody');
    if (!body) return;
    const mine = _cache.leave.filter(r => r.user_id == user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    body.innerHTML = '';
    if (mine.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center p-4">Belum ada riwayat pengajuan.</td></tr>';
        return;
    }
    mine.forEach(req => {
        const statusMap2 = {
            'waiting_supervisor': '<span class="badge badge-warning">Menunggu Supervisor</span>',
            'waiting_final': '<span class="badge badge-info">Menunggu Manajer</span>',
            'Approved': '<span class="badge badge-success">Disetujui</span>',
            'approved': '<span class="badge badge-success">Disetujui</span>',
            'Rejected': '<span class="badge badge-danger">Ditolak</span>',
            'rejected': '<span class="badge badge-danger">Ditolak</span>',
        };
        const badge = statusMap2[req.status] || `<span class="badge badge-secondary">${req.status}</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(req.created_at).toLocaleDateString('id-ID')}</td><td><strong>${req.type}</strong></td><td>${req.start_date || '-'}</td><td>${req.end_date || '-'}</td><td>${req.reason || ''}</td><td>${badge}</td><td></td>`;
        body.appendChild(tr);
    });
}

// ── Roster Import/Export ──────────────────────────────────────
function triggerRosterImport() { document.getElementById('rosterImportInput').click(); }

function handleRosterImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { processRosterExcel(XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).SheetNames[0]], { header: 1 })); };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

async function processRosterExcel(rows) {
    if (!rows || rows.length < 2) { alert('File kosong atau format tidak sesuai.'); return; }
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const changes = []; let count = 0;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i]; if (!row || row.length < 3) continue;
        const emp = _cache.employees.find(e => e.nid && e.nid.toString() === row[0].toString());
        if (!emp) continue;
        for (let d = 1; d <= days; d++) {
            const shift_code = (row[d + 1] || 'Off').toString().trim();
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            changes.push({ user_id: emp.id, date, shift_code });
        }
        count++;
    }
    await Promise.all(changes.map(c => fetch(`${API}/api/attendance/roster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })));
    await loadCache(); renderRoster();
    alert(`Berhasil mengimpor roster untuk ${count} karyawan.`);
}

function downloadRosterTemplate() {
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const header = ['NID', 'Nama Karyawan'];
    for (let i = 1; i <= days; i++) header.push(i);
    const rows = [header];
    const rMap = {}; _cache.roster.forEach(r => { rMap[`${r.user_id}_${r.date?.split('T')[0]}`] = r.shift_code; });
    [..._cache.employees].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach(emp => {
        const row = [emp.nid || '-', emp.name];
        for (let i = 1; i <= days; i++) {
            const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            row.push(rMap[`${emp.id}_${d}`] || 'Off');
        }
        rows.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, `Roster_${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(currentViewDate)}_${year}.xlsx`);
}

// ── Download Reports ──────────────────────────────────────────
function downloadAttendanceExcel() {
    if (_cache.attendance.length === 0) { alert('Tidak ada data.'); return; }
    const rows = [['Nama', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterlambatan']];
    _cache.attendance.slice().reverse().forEach(l => rows.push([l.name || 'Unknown', l.date?.split('T')[0] || '', l.clock_in || '-', l.clock_out || '-', l.status || '-', l.late_minutes > 0 ? 'Terlambat' : 'Tepat Waktu']));
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Laporan_Kehadiran_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function downloadLeaveHistoryExcel() {
    const hist = _cache.leave.filter(r => ['approved', 'rejected'].includes((r.status || '').toLowerCase()));
    if (hist.length === 0) { alert('Tidak ada data.'); return; }
    const rows = [['Nama', 'Tipe', 'Mulai', 'Selesai', 'Alasan', 'Status']];
    hist.slice().reverse().forEach(r => rows.push([r.emp_name || r.empName || '-', r.type || '-', r.start_date || '-', r.end_date || '-', r.reason || '-', r.status || '-']));
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave History');
    XLSX.writeFile(wb, `Laporan_Cuti_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function downloadFullReport() {
    const wb = XLSX.utils.book_new();
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const rMap = {}; _cache.roster.forEach(r => { rMap[`${r.user_id}_${r.date?.split('T')[0]}`] = r.shift_code; });
    // Roster sheet
    const rRows = [['Nama', 'NID', 'Grup']]; for (let i = 1; i <= days; i++) rRows[0].push(i);
    _cache.employees.forEach(u => { const row = [u.name, u.nid || '-', u.group || '-']; for (let d = 1; d <= days; d++) { const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; row.push(rMap[`${u.id}_${ds}`] || '-'); } rRows.push(row); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rRows), 'Monthly Roster');
    // Attendance sheet
    const aRows = [['Nama', 'Tanggal', 'Masuk', 'Pulang', 'Status', 'Terlambat']];
    _cache.attendance.slice().reverse().forEach(l => aRows.push([l.name || '-', l.date?.split('T')[0] || '-', l.clock_in || '-', l.clock_out || '-', l.status || '-', l.late_minutes > 0 ? 'Ya' : 'Tidak']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aRows), 'Attendance Logs');
    // Leave sheet
    const lRows = [['Nama', 'Tipe', 'Mulai', 'Selesai', 'Alasan', 'Status']];
    _cache.leave.filter(r => ['approved', 'rejected'].includes((r.status || '').toLowerCase())).slice().reverse().forEach(r => lRows.push([r.emp_name || '-', r.type || '-', r.start_date || '-', r.end_date || '-', r.reason || '-', r.status || '-']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lRows), 'Leave History');
    XLSX.writeFile(wb, `Laporan_Terpadu_${currentViewDate.toLocaleString('default', { month: 'long' })}_${year}.xlsx`);
}

// ── Utilities ─────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

window.onclick = function (event) {
    ['shiftModal', 'bulkModal', 'editLogModal'].forEach(id => {
        if (event.target == document.getElementById(id)) closeModal(id);
    });
};

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID');
}

function editRequest(id) {
    const req = _cache.leave.find(r => r.id === id); if (!req) return;
    document.getElementById('editRequestId').value = req.id;
    document.getElementById('editRequestType').value = req.type || '';
    document.getElementById('editRequestStart').value = req.start_date || '';
    document.getElementById('editRequestEnd').value = req.end_date || '';
    document.getElementById('editRequestReason').value = req.reason || '';
    document.getElementById('editRequestModal').style.display = 'block';
}

document.getElementById('editRequestForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editRequestId').value;
    const body = { type: document.getElementById('editRequestType').value, start_date: document.getElementById('editRequestStart').value, end_date: document.getElementById('editRequestEnd').value, reason: document.getElementById('editRequestReason').value };
    try {
        await fetch(`${API}/api/leave/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const idx = _cache.leave.findIndex(r => r.id == id);
        if (idx > -1) Object.assign(_cache.leave[idx], body);
        closeModal('editRequestModal'); renderApprovalQueue(); renderStats();
        alert('Leave request updated.');
    } catch (e2) { alert('Gagal: ' + e2.message); }
});
