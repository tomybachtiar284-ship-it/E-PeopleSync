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
    header.innerHTML = '<th class="emp-col">Employee</th>';
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = (i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear());
        header.innerHTML += `<th class="date-col ${isToday ? 'active-day' : ''}">${i}</th>`;
    }

    // 2. Render Body
    body.innerHTML = '';
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="emp-col">${emp.name}<br><small style="color:#999;">${emp.nid || ''}</small></td>`;

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const shift = getShiftForDate(emp.id, dateStr);
            tr.innerHTML += `<td><span class="shift-badge ${shift.toLowerCase()}" onclick="openShiftSelection(this, '${emp.id}', '${dateStr}')">${shift}</span></td>`;
        }
        body.appendChild(tr);
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

window.onclick = function (event) {
    if (event.target == document.getElementById('shiftModal')) {
        closeShiftModal();
    }
    if (event.target == document.getElementById('bulkModal')) {
        closeBulkModal();
    }
}
