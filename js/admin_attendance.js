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
}

function renderStats() {
    const data = getData();
    const today = new Date().toISOString().split('T')[0];
    const logsToday = data.attendance ? data.attendance.filter(log => log.date === today) : [];
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    // Who is supposed to work today according to roster?
    const scheduledToday = employees.filter(emp => {
        const shift = getShiftForDate(emp.id, today);
        return shift !== 'Off';
    });

    const presentIds = new Set(logsToday.map(log => log.empId));
    const presentCount = logsToday.length;
    const lateCount = logsToday.filter(log => log.isLate).length;

    // Absent = Scheduled but not present
    const absentCount = scheduledToday.filter(emp => !presentIds.has(emp.id)).length;

    document.getElementById('statPresent').textContent = presentCount;
    document.getElementById('statLate').textContent = lateCount;
    document.getElementById('statAbsent').textContent = absentCount;
    document.getElementById('statLeave').textContent = 0;
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

    employees.forEach((emp, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center; vertical-align: middle; padding: 5px;">
                <input type="number" class="order-input" value="${idx + 1}" 
                    style="width: 40px; text-align: center; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-weight: 600; color: #555;"
                    onchange="jumpOrder(${emp.id}, this.value)">
            </td>
            <td class="emp-col">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        ${emp.name}<br>
                        <small style="color:#999;">${emp.nid || ''}</small>
                    </div>
                    <div class="reorder-btns d-flex flex-column gap-1 no-print">
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size: 8px; line-height: 1;" onclick="moveEmp(${emp.id}, -1)" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                        <button class="btn btn-xs btn-outline-secondary p-0" style="font-size: 8px; line-height: 1;" onclick="moveEmp(${emp.id}, 1)" ${idx === employees.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                    </div>
                </div>
            </td>`;

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const shift = getShiftForDate(emp.id, dateStr);
            tr.innerHTML += `<td><span class="shift-badge ${shift.toLowerCase()}" onclick="openShiftSelection(this, '${emp.id}', '${dateStr}')">${shift}</span></td>`;
        }
        body.appendChild(tr);
    });
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

function openShiftSelection(cell, empId, date) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.role === 'employee') return; // Read-only for employees

    activeRosterCell = { cell, empId, date };
    document.getElementById('shiftModal').style.display = 'block';
}

function closeShiftModal() {
    document.getElementById('shiftModal').style.display = 'none';
}

function applyShift(shiftType) {
    if (!activeRosterCell) return;

    const { cell, empId, date } = activeRosterCell;
    cell.textContent = shiftType;
    cell.className = `shift-badge ${shiftType.toLowerCase()}`;

    // Temporary storage in a local buffer if we want bulk save, 
    // or just update data object directly.
    updateRosterData(empId, date, shiftType);

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
    body.innerHTML = '';

    const logs = data.attendance || [];
    // Show last 10 logs
    logs.slice(-10).reverse().forEach(log => {
        const emp = data.users.find(u => u.id === log.empId) || { name: 'Unknown' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td>${log.date}</td>
            <td>${log.clockIn || '--:--'}</td>
            <td>${log.clockOut || '--:--'}</td>
            <td><span class="badge ${log.isLate ? 'badge-danger' : 'badge-success'}">${log.isLate ? 'Late' : 'On Time'}</span></td>
        `;
        body.appendChild(tr);
    });

    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#999;">No attendance logs yet.</td></tr>';
    }
}

function openBulkModal() {
    document.getElementById('bulkModal').style.display = 'block';
}

function closeBulkModal() {
    document.getElementById('bulkModal').style.display = 'none';
}

function applyBulkShift() {
    const shiftType = document.getElementById('bulkShiftType').value;
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
                data.roster[idx].shift = shiftType;
            } else {
                data.roster.push({ empId: emp.id, date: dateStr, shift: shiftType });
            }
        }
    });

    window.tempRosterData = data;
    renderRoster();
    closeBulkModal();
    alert(`Successfully assigned ${shiftType} to all employees for this month.`);
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
    // This will be implemented after discussing code mappings (P, S, S, M, L, DT, etc.)
    console.log("Roster data received:", rows);
    alert("Fitur Impor sedang disiapkan. Menunggu konfirmasi kode shift (P, S, M, L, DT, dll).");
}

window.onclick = function (event) {
    if (event.target == document.getElementById('shiftModal')) {
        closeShiftModal();
    }
    if (event.target == document.getElementById('bulkModal')) {
        closeBulkModal();
    }
}
