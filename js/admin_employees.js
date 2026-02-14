/**
 * Employee Management Logic
 * Handles comprehensive employee CRUD with ~50 fields.
 */

// All field IDs mapped to their data keys
const FIELD_MAP = {
    // Personal
    empNID: 'nid', empName: 'name', empBirthPlace: 'birthPlace',
    empBirthDate: 'birthDate', empGender: 'gender', empMarital: 'maritalStatus',
    empReligion: 'religion', empCitizenship: 'citizenship',
    empKTP: 'ktpNumber', empNPWP: 'npwp',
    empAddressDom: 'addressDomicile', empAddressKTP: 'addressKTP',
    empPhone: 'phone', empPhoneEmergency: 'phoneEmergency',
    empEmailPersonal: 'emailPersonal', empEmailCompany: 'emailCompany',
    // Employment
    empJoinDate: 'joinDate', empStatus: 'employeeStatus', empContractPeriod: 'contractPeriod',
    empPosition: 'position', empDept: 'department', empSupervisor: 'supervisor',
    empLocation: 'location', empShift: 'shift',
    empGrade: 'grade', empLevel: 'level', empActiveStatus: 'activeStatus',
    empBPJSHealth: 'bpjsHealth', empBPJSLabor: 'bpjsLabor',
    // Pay & Education
    empBaseSalary: 'baseSalary', empFixedAllowance: 'fixedAllowance', empTransportAllowance: 'transportAllowance',
    empBankName: 'bankName', empBankAccount: 'bankAccount', empBankHolder: 'bankHolder',
    empEducation: 'education', empMajor: 'major', empGradYear: 'gradYear',
    empSkills: 'skills', empCertifications: 'certifications',
    empTrainingHistory: 'trainingHistory', empCompetencyLevel: 'competencyLevel',
    // History
    empPositionHistory: 'positionHistory', empPromotionHistory: 'promotionHistory',
    empMutationHistory: 'mutationHistory', empPreviousCompany: 'previousCompany',
    empKPI: 'kpiScore', empEvalHistory: 'evalHistory',
    empDiscipline: 'disciplineStatus', empHRNotes: 'hrNotes'
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    initUserProfile();
    loadEmployees();
    populateDeptAndLocation();
});

function populateDeptAndLocation() {
    const data = getData();
    populateDropdown('empDept', data.departments || [], 'Department');
    populateDropdown('empLocation', data.locations || [], 'Location');
}

function loadEmployees() {
    const data = getData();
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '';

    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#999;">No employees found. Click "Add Employee" to get started.</td></tr>';
        return;
    }

    employees.forEach(e => {
        const tr = document.createElement('tr');
        const statusBadge = getStatusBadge(e.activeStatus || 'Aktif');
        tr.innerHTML = `
            <td><code>${e.nid || '-'}</code></td>
            <td>
                <div class="d-flex align-items-center">
                    <div style="width:32px; height:32px; border-radius:50%; background:${e.photoData ? 'none' : '#e0e0e0'}; display:flex; align-items:center; justify-content:center; margin-right:10px; overflow:hidden;">
                        ${e.photoData ? `<img src="${e.photoData}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:12px; color:#888;">${getInitials(e.name)}</span>`}
                    </div>
                    <div>
                        <div style="font-weight:500;">${e.name}</div>
                        <small style="color:#999;">${e.emailCompany || e.username || ''}</small>
                    </div>
                </div>
            </td>
            <td>${e.department || '-'}</td>
            <td>${e.position || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewEmp(${e.id})" title="View/Edit"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEmp(${e.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const colors = { 'Aktif': 'badge-success', 'Resign': 'badge-warning', 'PHK': 'badge-danger', 'Pensiun': 'badge-secondary' };
    return `<span class="badge ${colors[status] || 'badge-secondary'}">${status}</span>`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function filterEmployees() {
    const filter = document.getElementById('searchEmployee').value.toUpperCase();
    const rows = document.getElementById('employeeTableBody').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const text = rows[i].textContent.toUpperCase();
        rows[i].style.display = text.indexOf(filter) > -1 ? '' : 'none';
    }
}

// === Tab Logic ===
function showEmpTab(tabName) {
    document.querySelectorAll('.emp-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.emp-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    event.target.closest('.emp-tab').classList.add('active');
}

// === Modal Logic ===
function openEmpModal() {
    document.getElementById('empModal').style.display = 'block';
}
function closeEmpModal() {
    document.getElementById('empModal').style.display = 'none';
    resetForm();
}

function resetForm() {
    document.getElementById('empForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('photoPreview').innerHTML = '<i class="fas fa-camera" style="color:#bbb; font-size:24px;"></i>';
    document.getElementById('savedDocsList').innerHTML = '<p><i class="fas fa-info-circle"></i> Dokumen akan tampil setelah disimpan.</p>';
    // Reset to first tab
    showEmpTabDirect('personal');
}

function showEmpTabDirect(tabName) {
    document.querySelectorAll('.emp-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.emp-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelector('.emp-tab').classList.add('active'); // First tab button
}

function openCreateEmp() {
    resetForm();
    document.getElementById('empModalTitle').textContent = 'Add New Employee';
    // Auto-generate NID
    const data = getData();
    const empCount = data.users.filter(u => ['employee', 'manager'].includes(u.role)).length;
    document.getElementById('empNID').value = 'EMP-' + String(empCount + 1).padStart(4, '0');
    populateDeptAndLocation();
    openEmpModal();
}

function viewEmp(id) {
    const data = getData();
    const user = data.users.find(u => u.id === id);
    if (!user) return;

    resetForm();
    document.getElementById('empModalTitle').textContent = 'Edit Employee: ' + user.name;
    document.getElementById('empId').value = user.id;

    // Populate all fields from FIELD_MAP
    for (const [elemId, key] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(elemId);
        if (el && user[key] !== undefined && user[key] !== null) {
            el.value = user[key];
        }
    }

    // Photo preview
    if (user.photoData) {
        document.getElementById('photoPreview').innerHTML = `<img src="${user.photoData}">`;
    }

    // Show saved documents
    renderSavedDocs(user);

    populateDeptAndLocation();
    // Re-set values after repopulating dropdowns
    setTimeout(() => {
        if (user.department) document.getElementById('empDept').value = user.department;
        if (user.location) document.getElementById('empLocation').value = user.location;
    }, 100);

    openEmpModal();
}

function renderSavedDocs(user) {
    let html = '';
    if (user.docContract) html += `<p><i class="fas fa-file-pdf text-danger"></i> Kontrak: <a href="${user.docContract}" download="Kontrak_${user.name}.pdf">Download</a></p>`;
    if (user.docDiploma) html += `<p><i class="fas fa-file-pdf text-danger"></i> Ijazah: <a href="${user.docDiploma}" download="Ijazah_${user.name}.pdf">Download</a></p>`;
    if (user.docCert) html += `<p><i class="fas fa-file-pdf text-danger"></i> Sertifikasi: <a href="${user.docCert}" download="Sertifikasi_${user.name}.pdf">Download</a></p>`;
    if (!html) html = '<p style="color:#999;"><i class="fas fa-info-circle"></i> Belum ada dokumen tersimpan.</p>';
    document.getElementById('savedDocsList').innerHTML = html;
}

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran foto maksimal 2MB.');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photoPreview').innerHTML = `<img src="${e.target.result}">`;
        };
        reader.readAsDataURL(file);
    }
}

function readFileAsBase64(fileInputId) {
    return new Promise((resolve) => {
        const input = document.getElementById(fileInputId);
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} terlalu besar (max 5MB).`);
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        } else {
            resolve(null);
        }
    });
}

function deleteEmp(id) {
    if (!confirm('Yakin ingin menghapus data karyawan ini?')) return;
    const data = getData();
    data.users = data.users.filter(u => u.id !== id);
    saveData(data);
    loadEmployees();
}

// === Form Submit ===
document.getElementById('empForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getData();
    const empIdVal = document.getElementById('empId').value;
    const isEdit = !!empIdVal;

    // Build employee object from all fields
    let empData = {};
    for (const [elemId, key] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(elemId);
        if (el) empData[key] = el.value;
    }

    // Handle Photo
    const photoInput = document.getElementById('empPhoto');
    if (photoInput.files && photoInput.files[0]) {
        const photoBase64 = await readFileAsBase64('empPhoto');
        if (photoBase64) empData.photoData = photoBase64;
    }

    // Handle Document uploads
    const contractBase64 = await readFileAsBase64('empDocContract');
    const diplomaBase64 = await readFileAsBase64('empDocDiploma');
    const certBase64 = await readFileAsBase64('empDocCert');

    if (isEdit) {
        const idx = data.users.findIndex(u => u.id === parseInt(empIdVal));
        if (idx > -1) {
            // Merge new data into existing (preserve existing docs if not re-uploaded)
            Object.assign(data.users[idx], empData);
            if (contractBase64) data.users[idx].docContract = contractBase64;
            if (diplomaBase64) data.users[idx].docDiploma = diplomaBase64;
            if (certBase64) data.users[idx].docCert = certBase64;

            saveData(data);
            alert('Data karyawan berhasil diperbarui!');
        }
    } else {
        // Create new employee
        const newUser = {
            id: Date.now(),
            username: empData.emailCompany || empData.emailPersonal || empData.nid || 'emp_' + Date.now(),
            password: 'password',
            role: (empData.level === 'Manager' || empData.level === 'Director') ? 'manager' : 'employee',
            source: 'admin_created',
            ...empData
        };

        if (contractBase64) newUser.docContract = contractBase64;
        if (diplomaBase64) newUser.docDiploma = diplomaBase64;
        if (certBase64) newUser.docCert = certBase64;

        data.users.push(newUser);
        saveData(data);
        alert('Karyawan baru berhasil ditambahkan!');
    }

    closeEmpModal();
    loadEmployees();
});
