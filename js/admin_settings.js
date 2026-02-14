document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    loadUsers();
    loadMasterData();
    populateDropdown('uDept', getData().departments);
});

function switchTab(tab) {
    document.getElementById('tab-users').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('tab-master').style.display = tab === 'master' ? 'block' : 'none';
    document.getElementById('tab-payroll').style.display = tab === 'payroll' ? 'block' : 'none';

    // Update button styles
    const buttons = document.querySelectorAll('.tabs button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (tab === 'users') buttons[0].classList.add('active');
    else if (tab === 'master') buttons[1].classList.add('active');
    else if (tab === 'payroll') {
        buttons[2].classList.add('active');
        loadPayrollSettings();
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
