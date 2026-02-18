/**
 * Admin Attendance & Shift Logic
 */

let currentViewDate = new Date();
let activeRosterCell = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(['admin', 'manager', 'employee']);
    if (user) initUserProfile();

    // Disable admin features for employees
    if (user && user.role === 'employee') {
        const adminButtons = document.querySelectorAll('.btn-outline-warning, .btn-outline-danger, .btn-primary');
        adminButtons.forEach(btn => {
            if (btn.innerText.includes('Bulk') || btn.innerText.includes('Clear') || btn.innerText.includes('Save')) {
                btn.style.display = 'none';
            }
        });
    }

    initAttendancePage();
});



function initAttendancePage() {
    renderStats();
    renderRoster();
    renderLogs();
    renderApprovalQueue();
}

function renderStats() {
    const data = getData();
    const today = new Date().toISOString().split('T')[0];
    const logsToday = (data.attendance || []).filter(log => log.date === today);
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    // Shift category definitions
    const workShifts = ['P', 'S', 'M', 'DT', 'Pagi', 'Siang', 'Malam', 'Daytime'];
    const leaveShifts = ['CT', 'SD', 'DL', 'I', 'Cuti', 'Sakit', 'Dinas Luar', 'Izin'];

    // Present count
    const presentCount = logsToday.length;
    const lateCount = logsToday.filter(log => log.isLate).length;

    // Absent count: Scheduled for Work but no scan today
    const presentIds = new Set(logsToday.map(log => log.empId));
    const absentCount = employees.filter(emp => {
        const shift = getShiftForDate(emp.id, today);
        return workShifts.includes(shift) && !presentIds.has(emp.id);
    }).length;

    // On Leave count: Roster shows Leave status
    const leaveCount = employees.filter(emp => {
        const shift = getShiftForDate(emp.id, today);
        return leaveShifts.includes(shift);
    }).length;

    document.getElementById('statPresent').textContent = presentCount;
    document.getElementById('statLate').textContent = lateCount;
    document.getElementById('statAbsent').textContent = absentCount;
    document.getElementById('statLeave').textContent = leaveCount;
}

function renderRoster() {
    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('currentMonthYear').textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const header = document.getElementById('rosterHeader');
    const body = document.getElementById('rosterBody');

    // 1. Render Header
    header.innerHTML = '<th style="width: 50px; text-align: center;">No</th><th class="emp-col">Employee</th>';
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = (i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear());
        header.innerHTML += `<th class="date-col ${isToday ? 'active-day' : ''}">${i}</th>`;
    }

    // 2. Render Body
    body.innerHTML = '';
    const employees = data.users
        .filter(u => ['employee', 'manager'].includes(u.role))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Optimasi: Buat map untuk pencarian roster yang cepat O(1)
    const rosterMap = {};
    if (data.roster) {
        data.roster.forEach(entry => {
            rosterMap[`${entry.empId}_${entry.date}`] = entry.shift;
        });
    }

    const fragment = document.createDocumentFragment();

    employees.forEach((emp, idx) => {
        const tr = document.createElement('tr');
        let rowHtml = `
            <td style="text-align: center; vertical-align: middle; padding: 5px;">
                <input type="number" class="order-input" value="${idx + 1}" 
                    style="width: 40px; text-align: center; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-weight: 600; color: #555;"
                    onchange="jumpOrder(${emp.id}, this.value)">
            </td>
            <td class="emp-col">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        ${emp.name}<br>
                        <small style="color:#999;">${emp.nid || ''} <span style="color:#555; background:#eee; padding:1px 4px; border-radius:3px; margin-left:5px;">${emp.group || 'No Group'}</span></small>
                    </div>
                    <div class="reorder-btns d-flex flex-column gap-1 no-print">
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size: 8px; line-height: 1;" onclick="moveEmp(${emp.id}, -1)" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size: 8px; line-height: 1;" onclick="moveEmp(${emp.id}, 1)" ${idx === employees.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                    </div>
                </div>
            </td>`;

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const shift = rosterMap[`${emp.id}_${dateStr}`] || 'Off';
            rowHtml += `<td><span class="shift-badge ${shift.toLowerCase()}" onclick="openShiftSelection(this, '${emp.id}', '${dateStr}')">${shift}</span></td>`;
        }
        tr.innerHTML = rowHtml;
        fragment.appendChild(tr);
    });
    body.appendChild(fragment);
}

function moveEmp(empId, direction) {
    const data = getData();
    const staff = data.users.filter(u => ['employee', 'manager'].includes(u.role));
    staff.forEach((u, i) => {
        if (u.order === undefined) u.order = i;
    });

    const employees = staff.sort((a, b) => a.order - b.order);
    const idx = employees.findIndex(e => e.id == empId);
    if (idx === -1) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= employees.length) return;

    // 1. Swap logical order in underlying data
    const tempOrder = employees[idx].order;
    employees[idx].order = employees[newIdx].order;
    employees[newIdx].order = tempOrder;
    saveData(data);

    // 2. Perform DOM Swap for instant visual feedback
    const tbody = document.getElementById('rosterBody');
    if (!tbody) return;

    const rows = Array.from(tbody.children);
    const rowA = rows[idx];
    const rowB = rows[newIdx];

    if (direction === -1) {
        // Move Up: Insert Row A before Row B
        tbody.insertBefore(rowA, rowB);
    } else {
        // Move Down: Insert Row B before Row A
        tbody.insertBefore(rowB, rowA);
    }

    // 3. Update sequences and button disabled states
    const updatedRows = Array.from(tbody.children);
    updatedRows.forEach((row, i) => {
        // Update Number Input
        const input = row.querySelector('.order-input');
        if (input) input.value = i + 1;

        // Update Buttons
        const btnUp = row.querySelector('.reorder-btns button:first-child');
        const btnDown = row.querySelector('.reorder-btns button:last-child');
        if (btnUp) btnUp.disabled = (i === 0);
        if (btnDown) btnDown.disabled = (i === updatedRows.length - 1);
    });
}

function jumpOrder(empId, newDisplayOrder) {
    const data = getData();
    const staff = data.users.filter(u => ['employee', 'manager'].includes(u.role));
    staff.forEach((u, i) => { if (u.order === undefined) u.order = i; });

    const employees = staff.sort((a, b) => a.order - b.order);
    const oldIdx = employees.findIndex(e => e.id == empId);
    if (oldIdx === -1) return;

    let newIdx = parseInt(newDisplayOrder) - 1;
    if (isNaN(newIdx)) return renderRoster();
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= employees.length) newIdx = employees.length - 1;

    if (oldIdx === newIdx) return;

    // 1. Swap data logically
    const [movedEmp] = employees.splice(oldIdx, 1);
    employees.splice(newIdx, 0, movedEmp);
    employees.forEach((emp, i) => { emp.order = i; });
    saveData(data);

    // 2. Perform DOM movement for instant feedback
    const tbody = document.getElementById('rosterBody');
    if (!tbody) return;
    const rows = Array.from(tbody.children);
    const rowToMove = rows[oldIdx];
    const targetRow = rows[newIdx];

    if (newIdx < oldIdx) {
        // Moving up: Insert before the target row
        tbody.insertBefore(rowToMove, targetRow);
    } else {
        // Moving down: Insert after the target row
        tbody.insertBefore(rowToMove, targetRow.nextSibling);
    }

    // 3. Refresh Numbers & Buttons (Fast)
    const updatedRows = Array.from(tbody.children);
    updatedRows.forEach((row, i) => {
        const input = row.querySelector('.order-input');
        if (input) input.value = i + 1;

        const btnUp = row.querySelector('.reorder-btns button:first-child');
        const btnDown = row.querySelector('.reorder-btns button:last-child');
        if (btnUp) btnUp.disabled = (i === 0);
        if (btnDown) btnDown.disabled = (i === updatedRows.length - 1);
    });
}

function getShiftForDate(empId, date) {
    const data = getData();
    if (!data.roster) data.roster = [];
    const entry = data.roster.find(r => r.empId === empId && r.date === date);
    return entry ? entry.shift : 'Off';
}

function autoFillRosterFromPatterns() {
    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const patterns = (data.groupPatterns || {})[monthKey];
    if (!patterns) {
        alert(`Pola shift master untuk bulan ${monthKey} belum dikonfigurasi di menu Settings.`);
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin mengisi jadwal secara otomatis untuk bulan ${monthKey} berdasarkan pola grup? Jadwal yang sudah ada akan ditimpa.`)) {
        return;
    }

    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));
    if (!data.roster) data.roster = [];

    let filledCount = 0;
    employees.forEach(emp => {
        const group = emp.group || '';
        const groupPattern = patterns[group];

        if (groupPattern && Array.isArray(groupPattern)) {
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                // Shift in pattern is 0-indexed (day 1 is index 0)
                const shiftCode = groupPattern[i - 1] || 'Off';

                // Map "Off" to "L" if needed, or keep as is. Let's keep consistency.
                const finalShift = shiftCode === 'Off' ? 'Off' : shiftCode;

                const idx = data.roster.findIndex(r => r.empId === emp.id && r.date === dateStr);
                if (idx > -1) {
                    data.roster[idx].shift = finalShift;
                } else {
                    data.roster.push({ empId: emp.id, date: dateStr, shift: finalShift });
                }
            }
            filledCount++;
        }
    });

    saveData(data);
    renderRoster();
    alert(`Berhasil sinkronisasi jadwal untuk ${filledCount} karyawan berdasarkan grup.`);
}

function openShiftSelection(cell, empId, date) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.role === 'employee') return; // Read-only for employees

    activeRosterCell = { cell, empId, date };

    // Dynamically generate shift buttons based on shiftDefinitions
    const data = getData();
    const shifts = data.shiftDefinitions || [];
    const container = document.querySelector('#shiftModal .d-flex.flex-column');
    if (container) {
        container.innerHTML = '';
        shifts.forEach(s => {
            const btn = document.createElement('button');
            btn.className = `btn btn-outline-primary w-100 mb-2 py-2`;
            btn.style.textAlign = 'left';
            btn.style.paddingLeft = '15px';
            btn.style.borderRadius = '10px';
            const timeInfo = (s.clockIn && s.clockOut) ? ` <small style="color: #666;">(${s.clockIn} - ${s.clockOut})</small>` : '';
            btn.innerHTML = `<strong>${s.code}</strong> - ${s.name}${timeInfo}`;
            btn.onclick = () => applyShift(s.code);
            container.appendChild(btn);
        });
    }

    document.getElementById('shiftModal').style.display = 'block';
}

function closeShiftModal() {
    document.getElementById('shiftModal').style.display = 'none';
}

function applyShift(shiftCode) {
    if (!activeRosterCell) return;

    const { cell, empId, date } = activeRosterCell;
    cell.textContent = shiftCode;
    cell.className = `shift-badge ${shiftCode.toLowerCase()}`;

    updateRosterData(empId, date, shiftCode);
    closeShiftModal();
}

function updateRosterData(empId, date, shift) {
    const data = getData();
    if (!data.roster) data.roster = [];

    const idx = data.roster.findIndex(r => r.empId === empId && r.date === date);
    if (idx > -1) {
        data.roster[idx].shift = shift;
    } else {
        data.roster.push({ empId, date, shift });
    }
    // Note: We don't saveData(data) here yet, we'll do it on "Save Schedule" button
    window.tempRosterData = data;
}

function saveRoster() {
    if (window.tempRosterData) {
        saveData(window.tempRosterData);
        alert('Work schedule saved successfully!');
    } else {
        alert('No changes to save.');
    }
}

function changeMonth(dir) {
    currentViewDate.setMonth(currentViewDate.getMonth() + dir);
    renderRoster();
}

function renderLogs() {
    const data = getData();
    const body = document.getElementById('attendanceLogsBody');
    if (!body) return;
    body.innerHTML = '';

    const logs = data.attendance || [];
    // Show last 15 logs
    logs.slice(-15).reverse().forEach(log => {
        const emp = data.users.find(u => u.id == log.empId) || { name: 'Unknown' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${emp.name}</td>
            <td style="font-size: 13px;">${log.date}</td>
            <td style="font-weight:700;">${log.clockIn || '--:--'}</td>
            <td style="font-weight:700;">${log.clockOut || '--:--'}</td>
            <td><span class="badge ${log.isLate ? 'badge-danger' : 'badge-success'}" style="padding: 4px 10px; border-radius: 6px;">${log.isLate ? 'Late' : 'On Time'}</span></td>
            <td style="text-align: center;">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editLog(${log.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteLog(${log.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        body.appendChild(tr);
    });

    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#999; padding: 20px;">No attendance logs found.</td></tr>';
    }
}

function renderApprovalQueue() {
    const data = getData();
    const queueBody = document.getElementById('leaveApprovalBody');
    const historyBody = document.getElementById('leaveHistoryBody');
    if (!queueBody || !historyBody) return;

    const allRequests = data.leaveRequests || [];
    // Case-insensitive filtering for robustness
    const pendingRequests = allRequests.filter(r => {
        const s = (r.status || '').toLowerCase();
        return s !== 'approved' && s !== 'rejected';
    });
    const processedRequests = allRequests.filter(r => {
        const s = (r.status || '').toLowerCase();
        return s === 'approved' || s === 'rejected';
    });

    const statusMap = {
        'waiting_supervisor': '<span class="badge badge-info">Menunggu TL</span>',
        'waiting_final': '<span class="badge badge-warning">Menunggu ASMAN</span>',
        'Approved': '<span class="badge badge-success">Diterima</span>',
        'Rejected': '<span class="badge badge-danger">Ditolak</span>',
        'Pending': '<span class="badge badge-secondary">Pending</span>'
    };

    // Clear containers
    queueBody.innerHTML = '';
    historyBody.innerHTML = '';

    pendingRequests.forEach(req => {
        const statusKey = req.status || 'Pending';
        const displayStatus = statusMap[statusKey] || `<span class="badge badge-secondary">${statusKey}</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 700; color: var(--premium-navy);">${req.empName || req.name || 'No Name'}</td>
            <td>
                <div class="d-flex flex-column gap-1">
                    <span class="shift-badge ${req.type ? req.type.toLowerCase() : 'off'}" style="font-size: 10px; width: 40px;">${req.type || '-'}</span>
                    ${displayStatus}
                </div>
            </td>
            <td style="font-size: 13px;">${req.startDate || req.dateStart || '-'} s/d ${req.endDate || req.dateEnd || '-'}</td>
                <td title="${req.reason}"><div style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-size: 12px; color: #666;">${req.reason}</div></td>
                <td style="text-align: center;">
                    <div class="d-flex justify-content-center gap-1">
                        <button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})" style="background: var(--premium-emerald); border: none; font-weight: 700; border-radius: 8px;">ACC</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="rejectRequest(${req.id})">Rej</button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editRequest(${req.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
        queueBody.appendChild(tr);
    });

    // Render History (Approved/Rejected)
    // historyBody.innerHTML = ''; // Already cleared above
    // Show last 20 processed requests, newest first
    processedRequests.slice().reverse().slice(0, 20).forEach(req => {
        const isApproved = (req.status || '').toLowerCase() === 'approved';
        const statusClass = isApproved ? 'badge-success' : 'badge-danger';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${req.empName || req.name || 'No Name'}</td>
            <td><span class="shift-badge ${req.type ? req.type.toLowerCase() : 'off'}" style="font-size: 10px; width: 40px;">${req.type || '-'}</span></td>
            <td style="font-size: 12px;">${req.startDate || req.dateStart || '-'} - ${req.endDate || req.dateEnd || '-'}</td>
            <td title="${req.reason || '-'}"><div style="max-width: 150px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-size: 11px; color: #777;">${req.reason || '-'}</div></td>
            <td><span class="badge ${statusClass}" style="padding: 4px 10px; border-radius: 6px;">${req.status || '-'}</span></td>
            <td style="text-align: center;">
                <div class="d-flex justify-content-center gap-1">
                    ${isApproved ? `<button class="btn btn-sm btn-outline-success" onclick="generateReceiptPDF(${req.id})" title="Cetak Resi"><i class="fas fa-print"></i></button>` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        historyBody.appendChild(tr);
    });

    if (processedRequests.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No history records found.</td></tr>';
    }

    // Update pending count badge
    const badge = document.getElementById('pendingCountBadge');
    if (badge) badge.textContent = `${pendingRequests.length} Pending`;
}

function approveRequest(id) {
    if (!confirm('Setujui pengajuan ini secara manual (Admin Overwrite)?')) return;

    const data = getData();
    const req = data.leaveRequests.find(r => r.id === id);
    if (!req) return;

    req.status = 'Approved';
    req.approvedAt = new Date().toISOString();
    if (!req.approvalHistory) req.approvalHistory = [];
    req.approvalHistory.push({
        role: 'admin',
        action: 'Approved (Manual)',
        time: new Date().toISOString()
    });

    // Sync to Roster
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
        // Corrected: Use userId for roster matching
        const rosterIdx = data.roster.findIndex(r => r.userId === req.userId && r.date === dateStr);

        if (rosterIdx > -1) {
            data.roster[rosterIdx].shift = rosterCode;
        } else {
            data.roster.push({ empId: req.userId, date: dateStr, shift: rosterCode });
        }
    }

    saveData(data);

    // NOTIFIKASI KARYAWAN
    createNotification(req.userId, "Pengajuan Cuti Disetujui", `Pengajuan ${req.type} Anda (${req.startDate} s/d ${req.endDate}) telah disetujui.`, "leave");

    alert('Pengajuan disetujui! Roster untuk periode tersebut telah diperbarui otomatis.');
    initAttendancePage();
}

function rejectRequest(id) {
    if (!confirm('Yakin ingin menolak pengajuan ini?')) return;
    const data = getData();
    const req = data.leaveRequests.find(r => r.id === id);
    if (!req) return;

    req.status = 'Rejected';
    saveData(data);

    // NOTIFIKASI KARYAWAN
    createNotification(req.userId, "Pengajuan Cuti Ditolak", `Mohon maaf, pengajuan ${req.type} Anda (${req.startDate}) tidak dapat disetujui saat ini.`, "leave");

    renderApprovalQueue();
}

function openBulkModal() {
    document.getElementById('bulkModal').style.display = 'block';
}

function closeBulkModal() {
    document.getElementById('bulkModal').style.display = 'none';
}

function applyBulkShift() {
    const shiftCode = document.getElementById('bulkShiftType').value;
    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    if (!data.roster) data.roster = [];

    employees.forEach(emp => {
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const idx = data.roster.findIndex(r => r.empId === emp.id && r.date === dateStr);
            if (idx > -1) {
                data.roster[idx].shift = shiftCode;
            } else {
                data.roster.push({ empId: emp.id, date: dateStr, shift: shiftCode });
            }
        }
    });

    window.tempRosterData = data;
    renderRoster();
    closeBulkModal();
    alert(`Berhasil menetapkan shift ${shiftCode} untuk semua karyawan di bulan ini.`);
}

function clearMonth() {
    if (!confirm('Are you sure you want to clear the entire schedule for this month?')) return;

    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const startPattern = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (data.roster) {
        data.roster = data.roster.filter(r => !r.date.startsWith(startPattern));
    }

    saveData(data);
    renderRoster();
    alert('Monthly schedule cleared.');
}

function triggerRosterImport() {
    document.getElementById('rosterImportInput').click();
}

function downloadRosterTemplate() {
    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(currentViewDate);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Header
    const header = ['NID', 'Nama Karyawan'];
    for (let i = 1; i <= daysInMonth; i++) header.push(i);

    const rows = [header];
    const employees = data.users
        .filter(u => ['employee', 'manager'].includes(u.role))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Optimasi: Buat map untuk pencarian roster yang cepat
    const rosterMap = {};
    if (data.roster) {
        data.roster.forEach(entry => {
            rosterMap[`${entry.empId}_${entry.date}`] = entry.shift;
        });
    }

    employees.forEach(emp => {
        const row = [emp.nid || '-', emp.name];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            row.push(rosterMap[`${emp.id}_${dateStr}`] || 'Off');
        }
        rows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
    XLSX.writeFile(workbook, `Roster_Karyawan_${monthName}_${year}.xlsx`);
}

/**
 * Request Leave Logic (Desktop)
 */
function openRequestModal() {
    document.getElementById('requestModal').style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reqStart').value = today;
    document.getElementById('reqEnd').value = today;

    const data = getData();
    const approvers = data.companyApprovers || [];

    const spvSelect = document.getElementById('reqSupervisor');
    const mgrSelect = document.getElementById('reqManager');

    if (spvSelect) {
        spvSelect.innerHTML = '<option value="">-- Pilih SPV --</option>' +
            approvers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }

    if (mgrSelect) {
        mgrSelect.innerHTML = '<option value="">-- Pilih Manager --</option>' +
            approvers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
}

function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

function submitDesktopRequest(event) {
    if (event) event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const data = getData();

    const type = document.getElementById('reqType').value;
    const start = document.getElementById('reqStart').value;
    const end = document.getElementById('reqEnd').value;
    const reason = document.getElementById('reqReason').value;

    const spvSelect = document.getElementById('reqSupervisor');
    const mgrSelect = document.getElementById('reqManager');

    const spvId = spvSelect.value;
    const mgrId = mgrSelect.value;

    const approvers = data.companyApprovers || [];
    const spvObj = approvers.find(a => a.id == spvId);
    const mgrObj = approvers.find(a => a.id == mgrId);

    const spvName = spvObj ? spvObj.name : 'Unknown';
    const spvEmail = spvObj ? (spvObj.email || 'supervisor@test.com') : 'supervisor@test.com';
    const mgrName = mgrObj ? mgrObj.name : 'Unknown';
    const mgrEmail = mgrObj ? (mgrObj.email || 'manager@test.com') : 'manager@test.com';

    if (!type || !start || !end || !reason || !spvId || !mgrId) {
        alert('Mohon lengkapi semua data pengajuan termasuk approver.');
        return;
    }

    const newRequest = {
        id: Date.now(),
        userId: user.id,
        empId: user.nid || 'EMP-' + user.id,
        empName: user.name,
        type: type,
        startDate: start,
        endDate: end,
        reason: reason,
        status: 'waiting_supervisor',

        supervisorId: spvId,
        supervisorName: spvName,
        supervisorEmail: spvEmail,

        managerId: mgrId,
        managerName: mgrName,
        managerEmail: mgrEmail,

        submittedAt: new Date().toISOString(),
        approvalHistory: []
    };

    if (!data.leaveRequests) data.leaveRequests = [];
    data.leaveRequests.push(newRequest);
    saveData(data);

    const approvalToken = Math.random().toString(36).substr(2);
    const path = window.location.pathname.replace('admin/attendance.html', 'mobile/approval.html');
    const origin = window.location.origin === 'null' ? 'file://' : window.location.origin;

    let approvalLink = `${origin}${path}?requestId=${newRequest.id}&role=supervisor&token=${approvalToken}`;
    if (window.location.protocol === 'file:') {
        approvalLink = `${path}?requestId=${newRequest.id}&role=supervisor&token=${approvalToken}`;
    }

    console.log("%c[SIMULASI EMAIL SERVER]", "color: #d35400; font-weight: bold; font-size: 16px;");
    console.log(`To: ${spvEmail} (${spvName})`);
    console.log(`Subject: PERSETUJUAN CUTI (SPV) - ${user.name}`);
    console.log(`Link: ${approvalLink}`);

    alert(`Pengajuan berhasil sent to Supervisor: ${spvName}! Link simulasi ada di Console.`);

    closeRequestModal();
    document.getElementById('leaveRequestForm')?.reset();
    renderMyRequests();
    renderApprovalQueue();
}

function renderMyRequests() {
    const data = getData();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const body = document.getElementById('myRequestsBody');
    if (!body) return;

    if (!data.leaveRequests) data.leaveRequests = [];
    const myRequests = data.leaveRequests.filter(r => r.userId === user.id);

    body.innerHTML = '';
    if (myRequests.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center p-4">Anda belum memiliki riwayat pengajuan cuti.</td></tr>';
        return;
    }

    myRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    myRequests.forEach(req => {
        let statusBadge = '';
        let tracking = '';

        switch (req.status) {
            case 'waiting_supervisor':
                statusBadge = '<span class="badge badge-warning">Menunggu Supervisor</span>';
                tracking = '<i class="fas fa-user-tie text-warning"></i> Supervisor sedang meninjau';
                break;
            case 'waiting_final':
                statusBadge = '<span class="badge badge-info">Menunggu Manajer</span>';
                tracking = '<i class="fas fa-check text-success"></i> Spv OK &rarr; <i class="fas fa-user-shield text-info"></i> Mgr meninjau';
                break;
            case 'Approved':
            case 'approved':
                statusBadge = '<span class="badge badge-success">Disetujui</span>';
                tracking = '<i class="fas fa-check-circle text-success"></i> Selesai';
                break;
            case 'Rejected':
            case 'rejected':
                statusBadge = '<span class="badge badge-danger">Ditolak</span>';
                tracking = '<i class="fas fa-times-circle text-danger"></i> Ditolak';
                break;
            default:
                statusBadge = '<span class="badge badge-secondary">Pending</span>';
                tracking = 'Menunggu proses';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(req.submittedAt).toLocaleDateString('id-ID')}</td>
            <td><strong>${req.type}</strong></td>
            <td>${formatDate(req.startDate)}</td>
            <td>${formatDate(req.endDate)}</td>
            <td>${req.reason}</td>
            <td>${statusBadge}</td>
            <td style="font-size: 12px; color: #555;">${tracking}</td>
        `;
        body.appendChild(tr);
    });
}


/**
 * Handle Excel file import for Roster
 * Requires SheetJS (XLSX) library (already present in parent/other pages)
 */
function handleRosterImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        processRosterExcel(jsonData);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset for re-upload
}

function processRosterExcel(rows) {
    if (!rows || rows.length < 2) {
        alert("File Excel kosong atau format tidak sesuai.");
        return;
    }

    const data = getData();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (!data.roster) data.roster = [];
    let updatedCount = 0;

    // Start from row 2 (index 1) assuming row 1 is header
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;

        const nid = row[0]; // Assuming Column A is NID
        const emp = data.users.find(u => u.nid && u.nid.toString() === nid.toString());

        if (!emp) continue;

        // Days start from column 3 (index 2)
        for (let day = 1; day <= daysInMonth; day++) {
            const shiftCode = (row[day + 1] || 'Off').toString().trim();
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const idx = data.roster.findIndex(r => r.empId === emp.id && r.date === dateStr);
            if (idx > -1) {
                data.roster[idx].shift = shiftCode;
            } else {
                data.roster.push({ empId: emp.id, date: dateStr, shift: shiftCode });
            }
        }
        updatedCount++;
    }

    saveData(data);
    renderRoster();
    alert(`Berhasil mengimpor roster untuk ${updatedCount} karyawan.`);
}

/**
 * EXPORT FUNCTIONS (EXCEL REPORTING)
 */

function downloadAttendanceExcel() {
    const data = getData();
    const logs = data.attendance || [];
    if (logs.length === 0) {
        alert("Tidak ada data log kehadiran untuk diekspor.");
        return;
    }

    const rows = [
        ['Nama Karyawan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterlambatan']
    ];

    // Export all logs, sorted by date DESC
    logs.slice().reverse().forEach(log => {
        const emp = data.users.find(u => u.id === log.empId) || { name: 'Unknown' };
        rows.push([
            emp.name,
            log.date,
            log.clockIn || '-',
            log.clockOut || '-',
            log.status,
            log.isLate ? 'Terlambat' : 'Tepat Waktu'
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Logs");
    XLSX.writeFile(workbook, `Laporan_Kehadiran_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function downloadLeaveHistoryExcel() {
    const data = getData();
    const history = (data.leaveRequests || []).filter(r => r.status !== 'Pending');
    if (history.length === 0) {
        alert("Tidak ada riwayat pengajuan cuti untuk diekspor.");
        return;
    }

    const rows = [
        ['Nama Karyawan', 'Tipe', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Status', 'Tanggal Diproses']
    ];

    history.slice().reverse().forEach(req => {
        rows.push([
            req.empName,
            req.type,
            req.startDate,
            req.endDate,
            req.reason,
            req.status,
            req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-'
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave History");
    XLSX.writeFile(workbook, `Laporan_Riwayat_Cuti_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function downloadFullReport() {
    const data = getData();
    const workbook = XLSX.utils.book_new();

    // 1. SHEET ROSTER
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentViewDate.toLocaleString('default', { month: 'long' });

    const rosterRows = [];
    const headerRow = ['Nama Karyawan', 'NID', 'Grup'];
    for (let i = 1; i <= daysInMonth; i++) headerRow.push(i.toString());
    rosterRows.push(headerRow);

    data.users.forEach(user => {
        const row = [user.name, user.nid || '-', user.group || '-'];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const rosterEntry = (data.roster || []).find(r => r.empId === user.id && r.date === dateStr);
            row.push(rosterEntry ? rosterEntry.shift : '-');
        }
        rosterRows.push(row);
    });
    const wsRoster = XLSX.utils.aoa_to_sheet(rosterRows);
    XLSX.utils.book_append_sheet(workbook, wsRoster, "Monthly Roster");

    // 2. SHEET ATTENDANCE LOGS
    const logs = data.attendance || [];
    const logRows = [['Nama Karyawan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterlambatan']];
    logs.slice().reverse().forEach(log => {
        const emp = data.users.find(u => u.id === log.empId) || { name: 'Unknown' };
        logRows.push([emp.name, log.date, log.clockIn || '-', log.clockOut || '-', log.status, log.isLate ? 'Ya' : 'Tidak']);
    });
    const wsLogs = XLSX.utils.aoa_to_sheet(logRows);
    XLSX.utils.book_append_sheet(workbook, wsLogs, "Attendance Logs");

    // 3. SHEET LEAVE HISTORY
    const history = (data.leaveRequests || []).filter(r => r.status !== 'Pending');
    const leaveRows = [['Nama Karyawan', 'Tipe', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Status', 'Diproses Pada']];
    history.slice().reverse().forEach(req => {
        leaveRows.push([req.empName, req.type, req.startDate, req.endDate, req.reason, req.status, req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-']);
    });
    const wsLeave = XLSX.utils.aoa_to_sheet(leaveRows);
    XLSX.utils.book_append_sheet(workbook, wsLeave, "Leave History");

    // DOWNLOAD
    XLSX.writeFile(workbook, `Laporan_Terpadu_SDM_${monthName}_${year}.xlsx`);
}

window.onclick = function (event) {
    if (event.target == document.getElementById('shiftModal')) closeShiftModal();
    if (event.target == document.getElementById('bulkModal')) closeBulkModal();
    if (event.target == document.getElementById('editLogModal')) closeModal('editLogModal');
}

/**
 * MANAGEMENT ACTIONS: EDIT & DELETE
 */

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ATTENDANCE LOGS
function editLog(id) {
    const data = getData();
    const log = data.attendance.find(l => l.id === id);
    if (!log) return;

    document.getElementById('editLogId').value = log.id;
    document.getElementById('editLogDate').value = log.date;
    document.getElementById('editLogClockIn').value = log.clockIn || '';
    document.getElementById('editLogClockOut').value = log.clockOut || '';
    document.getElementById('editLogModal').style.display = 'block';
}

function deleteLog(id) {
    if (!confirm('Are you sure you want to delete this attendance log?')) return;
    const data = getData();
    data.attendance = data.attendance.filter(l => l.id !== id);
    saveData(data);
    renderLogs();
    renderStats();
}

document.getElementById('editLogForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = getData();
    const id = parseInt(document.getElementById('editLogId').value);
    const logIndex = data.attendance.findIndex(l => l.id === id);
    if (logIndex === -1) return;

    const newDate = document.getElementById('editLogDate').value;
    const newIn = document.getElementById('editLogClockIn').value;
    const newOut = document.getElementById('editLogClockOut').value;

    data.attendance[logIndex].date = newDate;
    data.attendance[logIndex].clockIn = newIn;
    data.attendance[logIndex].clockOut = newOut;

    saveData(data);
    closeModal('editLogModal');
    renderLogs();
    renderStats();
    alert('Log updated successfully.');
});

function editRequest(id) {
    const data = getData();
    const req = data.leaveRequests.find(r => r.id === id);
    if (!req) return;

    document.getElementById('editRequestId').value = req.id;
    document.getElementById('editRequestType').value = req.type;
    document.getElementById('editRequestStart').value = req.startDate || req.dateStart || '';
    document.getElementById('editRequestEnd').value = req.endDate || req.dateEnd || '';
    document.getElementById('editRequestReason').value = req.reason || '';

    document.getElementById('editRequestModal').style.display = 'block';
}

function deleteRequest(id) {
    if (!confirm('Are you sure you want to delete this request record?')) return;
    const data = getData();
    data.leaveRequests = (data.leaveRequests || []).filter(r => r.id !== id);
    saveData(data);
    renderApprovalQueue();
    renderStats();
}

document.getElementById('editRequestForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = getData();
    const id = parseInt(document.getElementById('editRequestId').value);
    const reqIndex = data.leaveRequests.findIndex(r => r.id === id);
    if (reqIndex === -1) return;

    const newType = document.getElementById('editRequestType').value;
    const newStart = document.getElementById('editRequestStart').value;
    const newEnd = document.getElementById('editRequestEnd').value;
    const newReason = document.getElementById('editRequestReason').value;

    data.leaveRequests[reqIndex].type = newType;
    data.leaveRequests[reqIndex].startDate = newStart;
    data.leaveRequests[reqIndex].endDate = newEnd;
    data.leaveRequests[reqIndex].reason = newReason;

    saveData(data);
    closeModal('editRequestModal');
    renderApprovalQueue();
    renderStats();
    alert('Leave request updated successfully.');
});
