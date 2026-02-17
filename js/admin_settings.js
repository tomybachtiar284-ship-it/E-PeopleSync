document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    loadUsers();
    loadMasterData();
    populateDropdown('uDept', getData().departments);
    initUserProfile();
    populatePatternMonths();
});

function switchTab(tab) {
    document.getElementById('tab-users').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('tab-master').style.display = tab === 'master' ? 'block' : 'none';
    document.getElementById('tab-payroll').style.display = tab === 'payroll' ? 'block' : 'none';
    document.getElementById('tab-patterns').style.display = tab === 'patterns' ? 'block' : 'none';
    document.getElementById('tab-shifts').style.display = tab === 'shifts' ? 'block' : 'none';

    // Update button styles
    const buttons = document.querySelectorAll('.tabs button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (tab === 'users') buttons[0].classList.add('active');
    else if (tab === 'master') buttons[1].classList.add('active');
    else if (tab === 'payroll') {
        buttons[2].classList.add('active');
        loadPayrollSettings();
    } else if (tab === 'patterns') {
        buttons[3].classList.add('active');
        renderPatternGrid();
    } else if (tab === 'shifts') {
        buttons[4].classList.add('active');
        renderShiftDefinitions();
    }
}

function loadPayrollSettings() {
    const data = getData();
    const settings = data.payrollSettings;

    if (settings) {
        document.getElementById('set_bpjs_jht').value = settings.bpjs_jht_emp;
        document.getElementById('set_bpjs_jp').value = settings.bpjs_jp_emp;
        document.getElementById('set_bpjs_kes').value = settings.bpjs_kes_emp;
        document.getElementById('set_ot_index').value = settings.ot_index;
        document.getElementById('set_tax_limit').value = settings.tax_office_limit;
        document.getElementById('set_ptkp0').value = settings.ptkp0;
    }
}

function resetPayrollSettings() {
    if (confirm('Reset to default settings?')) {
        const data = getData();
        data.payrollSettings = {
            bpjs_jht_emp: 2,
            bpjs_jp_emp: 1,
            bpjs_kes_emp: 1,
            ot_index: 173,
            tax_office_limit: 500000,
            ptkp0: 54000000
        };
        saveData(data);
        loadPayrollSettings();
        alert('Settings reset to default.');
    }
}

document.getElementById('payrollSettingsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getData();
    data.payrollSettings = {
        bpjs_jht_emp: parseFloat(document.getElementById('set_bpjs_jht').value),
        bpjs_jp_emp: parseFloat(document.getElementById('set_bpjs_jp').value),
        bpjs_kes_emp: parseFloat(document.getElementById('set_bpjs_kes').value),
        ot_index: parseInt(document.getElementById('set_ot_index').value),
        tax_office_limit: parseInt(document.getElementById('set_tax_limit').value),
        ptkp0: parseInt(document.getElementById('set_ptkp0').value)
    };
    saveData(data);
    alert('Payroll settings updated successfully!');
});

/**
 * User Management
 */
function loadUsers() {
    const data = getData();
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    data.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td><span class="badge badge-info">${u.role}</span></td>
            <td>${u.department || '-'}</td>
            <td>${u.position || '-'}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                ${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUserModal() {
    document.getElementById('userModal').style.display = 'block';
    document.getElementById('userModalTitle').innerText = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

function editUser(id) {
    const data = getData();
    const user = data.users.find(u => u.id === id);
    if (!user) return;

    document.getElementById('userModal').style.display = 'block';
    document.getElementById('userModalTitle').innerText = 'Edit User';

    document.getElementById('userId').value = user.id;
    document.getElementById('uName').value = user.name;
    document.getElementById('uUsername').value = user.username;
    document.getElementById('uRole').value = user.role;
    document.getElementById('uDept').value = user.department || '';
    document.getElementById('uPosition').value = user.position || '';
    document.getElementById('uPassword').value = ''; // Don't show password
}

function deleteUser(id) {
    if (confirm('Delete this user?')) {
        const data = getData();
        data.users = data.users.filter(u => u.id !== id);
        saveData(data);
        loadUsers();
    }
}

document.getElementById('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('uName').value;
    const username = document.getElementById('uUsername').value;
    const password = document.getElementById('uPassword').value;
    const role = document.getElementById('uRole').value;
    const dept = document.getElementById('uDept').value;
    const pos = document.getElementById('uPosition').value;

    const data = getData();

    if (id) {
        // Edit
        const idx = data.users.findIndex(u => u.id == id);
        if (idx > -1) {
            data.users[idx].name = name;
            data.users[idx].username = username;
            data.users[idx].role = role;
            data.users[idx].department = dept;
            data.users[idx].position = pos;
            if (password) data.users[idx].password = password;
        }
    } else {
        // Add
        // Check duplicate username
        if (data.users.some(u => u.username === username)) {
            alert('Username already exists!');
            return;
        }
        data.users.push({
            id: Date.now(),
            name,
            username,
            password: password || '123456', // Default password
            role,
            department: dept,
            position: pos
        });
    }

    saveData(data);
    closeUserModal();
    loadUsers();
    alert('User saved successfully');
});

/**
 * Master Data Management
 */
function loadMasterData() {
    const data = getData();

    renderList('deptList', data.departments || [], 'department');
    renderList('locList', data.locations || [], 'location');
    renderList('typeList', data.jobTypes || [], 'jobType');
}

function renderList(elementId, items, type) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            ${item}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('${type}', ${index})">&times;</button>
        `;
        list.appendChild(li);
    });
}

function addMasterData(type) {
    const value = prompt(`Enter new ${type}:`);
    if (value) {
        const data = getData();
        const key = type === 'department' ? 'departments' : (type === 'location' ? 'locations' : 'jobTypes');

        if (!data[key]) data[key] = [];
        data[key].push(value);
        saveData(data);
        loadMasterData();
    }
}

function deleteMasterData(type, index) {
    if (confirm('Delete this item?')) {
        const data = getData();
        const key = type === 'department' ? 'departments' : (type === 'location' ? 'locations' : 'jobTypes');

        data[key].splice(index, 1);
        saveData(data);
        loadMasterData();
    }
}

/**
 * Shift Pattern Management
 */
function populatePatternMonths() {
    const select = document.getElementById('patternMonth');
    if (!select) return;
    select.innerHTML = '';
    const now = new Date();
    for (let i = -1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (i === 0) opt.selected = true;
        select.appendChild(opt);
    }
}

function renderPatternGrid() {
    const monthKey = document.getElementById('patternMonth').value;
    if (!monthKey) return;
    const header = document.getElementById('patternTableHeader');
    const body = document.getElementById('patternTableBody');
    const data = getData();
    const groups = data.employeeGroups || ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D'];
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const shifts = data.shiftDefinitions || [];

    // Render Header
    let headHtml = '<tr><th style="width:150px; background:#f8f9fa; vertical-align:middle; text-align:center;">Grup / Tanggal</th>';
    for (let i = 1; i <= daysInMonth; i++) {
        headHtml += `<th style="text-align:center; min-width:45px; background:#007bff; color:white; font-size:12px; padding:8px 2px;">${i}</th>`;
    }
    headHtml += '</tr>';
    header.innerHTML = headHtml;

    // Render Body
    body.innerHTML = '';
    const patterns = data.groupPatterns[monthKey] || {};

    groups.forEach(group => {
        const tr = document.createElement('tr');
        let rowHtml = `<td style="font-weight:700; background:#f8f9fa; font-size:13px; padding-left:15px; vertical-align:middle;">${group}</td>`;
        const groupPattern = patterns[group] || [];

        for (let i = 0; i < daysInMonth; i++) {
            const currentVal = groupPattern[i] || 'L'; // Default to Libur (L) instead of Off

            // Helper to get color class - reuse logic from attendance
            const colorClass = currentVal.toLowerCase();

            rowHtml += `
                <td class="pattern-cell-container ${colorClass}" style="padding:0; text-align:center; vertical-align:middle; width:45px; height:40px;">
                    <select class="pattern-cell" data-group="${group}" data-day="${i}" 
                        onchange="this.parentElement.className='pattern-cell-container ' + this.value.toLowerCase()"
                        style="width:100%; height:100%; border:none; background:transparent; font-size:11px; font-weight:800; text-align:center; cursor:pointer; color:inherit; appearance:none; -webkit-appearance:none;">
                        ${shifts.map(s => `<option value="${s.code}" ${currentVal === s.code ? 'selected' : ''} style="background:white; color:black;">${s.code}</option>`).join('')}
                    </select>
                </td>
            `;
        }
        tr.innerHTML = rowHtml;
        body.appendChild(tr);
    });
}

function savePatternGrid() {
    const monthKey = document.getElementById('patternMonth').value;
    const data = getData();
    if (!data.groupPatterns) data.groupPatterns = {};
    const patterns = {};

    const selects = document.querySelectorAll('.pattern-cell');
    selects.forEach(sel => {
        const group = sel.dataset.group;
        const day = parseInt(sel.dataset.day);
        const val = sel.value;
        if (!patterns[group]) patterns[group] = [];
        patterns[group][day] = val;
    });

    data.groupPatterns[monthKey] = patterns;
    saveData(data);
    alert('Pola shift grup berhasil disimpan!');
}

function triggerPatternImport() {
    document.getElementById('patternImportInput').click();
}

function handlePatternImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) return alert('Format file tidak valid');

        const monthKey = document.getElementById('patternMonth').value;
        const appData = getData();
        const patterns = {};

        // Assume row 0 is header (Grup/Tanggal, 1, 2, 3...)
        // Start from row 1
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const groupName = row[0];
            if (!groupName) continue;

            // Clean group name (sometimes Excel adds spaces)
            const matchedGroup = (appData.employeeGroups || []).find(g => g.toLowerCase().includes(groupName.toString().toLowerCase()));
            if (!matchedGroup) continue;

            const daysData = row.slice(1).map(v => (v || 'L').toString().trim());
            patterns[matchedGroup] = daysData;
        }

        appData.groupPatterns[monthKey] = patterns;
        saveData(appData);
        renderPatternGrid();
        alert('Data pola shift berhasil diimpor!');
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

function downloadPatternTemplate() {
    const monthKey = document.getElementById('patternMonth').value;
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = getData();
    const groups = data.employeeGroups || ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D'];

    // Header
    const header = ['Grup / Tanggal'];
    for (let i = 1; i <= daysInMonth; i++) header.push(i);

    const rows = [header];
    groups.forEach(g => {
        const row = [g];
        const existing = (data.groupPatterns[monthKey] || {})[g] || [];
        for (let i = 0; i < daysInMonth; i++) {
            row.push(existing[i] || 'L');
        }
        rows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pola Shift");
    XLSX.writeFile(workbook, `Pola_Shift_${monthKey}.xlsx`);
}

/**
 * Shift Definitions (Jam Kerja)
 */
function renderShiftDefinitions() {
    const data = getData();
    const tbody = document.getElementById('shiftDefTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    shifts.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control shift-code" value="${s.code}" placeholder="Kode" style="font-weight:700; text-align:center;"></td>
            <td><input type="text" class="form-control shift-name" value="${s.name}" placeholder="Deskripsi (misal: Shift Pagi)"></td>
            <td><input type="time" class="form-control shift-in" value="${s.clockIn}"></td>
            <td><input type="time" class="form-control shift-out" value="${s.clockOut}"></td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteShiftRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addShiftDefinitionRow() {
    const tbody = document.getElementById('shiftDefTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control shift-code" placeholder="Kode"></td>
        <td><input type="text" class="form-control shift-name" placeholder="Deskripsi"></td>
        <td><input type="time" class="form-control shift-in"></td>
        <td><input type="time" class="form-control shift-out"></td>
        <td style="text-align:center;">
            <button class="btn btn-sm btn-outline-danger" onclick="deleteShiftRow(this)"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

function deleteShiftRow(btn) {
    btn.closest('tr').remove();
}

function saveShiftDefinitions() {
    const data = getData();
    const rows = document.querySelectorAll('#shiftDefTableBody tr');
    const newShifts = [];

    rows.forEach(row => {
        const code = row.querySelector('.shift-code').value.trim().toUpperCase();
        const name = row.querySelector('.shift-name').value.trim() || code;
        const clockIn = row.querySelector('.shift-in').value;
        const clockOut = row.querySelector('.shift-out').value;

        if (code) {
            newShifts.push({
                code,
                name,
                clockIn,
                clockOut
            });
        }
    });

    data.shiftDefinitions = newShifts;
    saveData(data);
    alert('Jam kerja berhasil dikonfigurasi!');
}
