/**
 * Employee Management Logic
 * Handles comprehensive employee CRUD via PostgreSQL API.
 */

// All field IDs mapped to their data keys (snake_case = DB column names)
const FIELD_MAP = {
    // Personal
    empNID: 'nid', empName: 'name', empBirthPlace: 'birth_place',
    empBirthDate: 'birth_date', empGender: 'gender', empMarital: 'marital_status',
    empReligion: 'religion', empCitizenship: 'citizenship',
    empKTP: 'ktp_number', empNPWP: 'npwp',
    empAddressDom: 'address_domicile', empAddressKTP: 'address_ktp',
    empPhone: 'phone', empPhoneEmergency: 'phone_emergency',
    empEmailPersonal: 'email_personal', empEmailCompany: 'email',
    // Employment
    empJoinDate: 'join_date', empStatus: 'employee_status', empContractPeriod: 'contract_period',
    empPosition: 'position', empDept: 'department', empSupervisor: 'supervisor_name',
    empSupervisorJob: 'supervisor_job', empSupervisorEmail: 'supervisor_email',
    empFinalApproverName: 'final_approver_name', empFinalApproverJob: 'final_approver_job',
    empFinalApproverEmail: 'final_approver_email',
    empLocation: 'location', empShift: 'shift_code',
    empGrade: 'grade', empLevel: 'level', empActiveStatus: 'status',
    empGroup: 'group',
    empBPJSHealth: 'bpjs_health', empBPJSLabor: 'bpjs_labor',
    // Pay & Education
    empBaseSalary: 'basic_salary', empFixedAllowance: 'fixed_allowance', empTransportAllowance: 'transport_allowance',
    empBankName: 'bank_name', empBankAccount: 'bank_account', empBankHolder: 'bank_holder',
    empEducation: 'education', empMajor: 'major', empGradYear: 'grad_year',
    empSkills: 'skills', empCertifications: 'certifications',
    empTrainingHistory: 'training_history', empCompetencyLevel: 'competency_level',
    // History
    empPositionHistory: 'position_history', empPromotionHistory: 'promotion_history',
    empMutationHistory: 'mutation_history', empPreviousCompany: 'previous_company',
    empKPI: 'kpi_score', empEvalHistory: 'eval_history',
    empDiscipline: 'discipline_status', empHRNotes: 'hr_notes'
};

// Cache approvers from settings
let _approvers = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);
    renderModernHeader();
    renderModernFooter();
    initUserProfile();
    loadEmployees();
    populateDeptAndLocation();
});

async function populateDeptAndLocation() {
    try {
        // Ambil settings dari API (Object format)
        const settings = await fetch(`${API_BASE_URL}/settings`).then(r => r.json());

        const departments = settings.departments || [];
        const locations = settings.locations || [];
        const groups = settings.employee_groups || ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D'];

        // Use Master Data Approvers (External/Managed in Settings)
        _approvers = settings.companyApprovers || [];
        if (typeof _approvers === 'string') {
            try { _approvers = JSON.parse(_approvers); } catch { _approvers = []; }
        }

        populateDropdown('empDept', departments, 'Department');
        populateDropdown('empLocation', locations, 'Location');
        populateDropdown('empGroup', groups, 'Group');

        // Filter Group dropdown
        const filterSelect = document.getElementById('filterGroup');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">-- Semua Grup --</option>';
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                filterSelect.appendChild(opt);
            });
        }

        // Supervisor & Final Approver dropdowns
        const supSelect = document.getElementById('empSupervisor');
        const finalSelect = document.getElementById('empFinalApproverName');

        if (supSelect) {
            supSelect.innerHTML = '<option value="">-- Pilih Approver --</option>';
            _approvers.forEach(app => {
                const opt = document.createElement('option');
                opt.value = app.name;
                opt.textContent = app.name;
                supSelect.appendChild(opt);
            });
            supSelect.onchange = (e) => {
                const selected = _approvers.find(a => a.name === e.target.value);
                document.getElementById('empSupervisorJob').value = selected ? (selected.position || '') : '';
                document.getElementById('empSupervisorEmail').value = selected ? (selected.email || '') : '';
            };
        }

        if (finalSelect) {
            finalSelect.innerHTML = '<option value="">-- Pilih Approver --</option>';
            _approvers.forEach(app => {
                const opt = document.createElement('option');
                opt.value = app.name;
                opt.textContent = app.name;
                finalSelect.appendChild(opt);
            });
            finalSelect.onchange = (e) => {
                const selected = _approvers.find(a => a.name === e.target.value);
                document.getElementById('empFinalApproverJob').value = selected ? (selected.position || '') : '';
                document.getElementById('empFinalApproverEmail').value = selected ? (selected.email || '') : '';
            };
        }

    } catch (err) {
        console.warn('populateDeptAndLocation: Failed to load from API', err.message);
        // Provide empty defaults if API fails
        populateDropdown('empDept', [], 'Department');
        populateDropdown('empLocation', [], 'Location');
        populateDropdown('empGroup', [], 'Group');
    }
}

async function loadEmployees() {
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#999;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/employees`);
        const employees = await response.json();

        // Filter hanya employee & manager
        const filtered = employees.filter(u => ['employee', 'manager'].includes(u.role));

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#999;">No employees found. Click "Add Employee" to get started.</td></tr>';
            return;
        }

        filtered.forEach(e => {
            const tr = document.createElement('tr');
            const statusBadge = getStatusBadge(e.status || 'Aktif');
            tr.innerHTML = `
                <td><code>${e.nid || '-'}</code></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div style="width:32px; height:32px; border-radius:50%; background:${e.avatar ? 'none' : '#e0e0e0'}; display:flex; align-items:center; justify-content:center; margin-right:10px; overflow:hidden;">
                            ${e.avatar ? `<img src="${e.avatar}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:12px; color:#888;">${getInitials(e.name)}</span>`}
                        </div>
                        <div>
                            <div style="font-weight:500;">${e.name}</div>
                            <small style="color:#999;">${e.email || e.username || ''}</small>
                        </div>
                    </div>
                </td>
                <td>${e.department || '-'}</td>
                <td>${e.position || '-'}</td>
                <td>${statusBadge}</td>
                <td>${e.group || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewEmp(${e.id})" title="View/Edit"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEmp(${e.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('loadEmployees error:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data. Pastikan server berjalan.</td></tr>';
    }
}

function getStatusBadge(status) {
    const colors = { 'Aktif': 'badge-success', 'active': 'badge-success', 'Resign': 'badge-warning', 'PHK': 'badge-danger', 'Pensiun': 'badge-secondary' };
    return `<span class="badge ${colors[status] || 'badge-secondary'}">${status}</span>`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function filterEmployees() {
    const searchText = (document.getElementById('searchEmployee').value || "").toUpperCase().trim();
    const groupFilter = (document.getElementById('filterGroup').value || "").toUpperCase().trim();
    const rows = document.querySelectorAll('#employeeTableBody tr');

    rows.forEach(row => {
        const rowText = row.textContent.toUpperCase();
        const textMatch = rowText.indexOf(searchText) > -1;
        const cells = row.getElementsByTagName('td');
        const groupCell = cells[5];
        const groupText = groupCell ? groupCell.textContent.toUpperCase().trim() : '';
        const groupMatch = groupFilter === "" || groupText === groupFilter;
        row.style.display = (textMatch && groupMatch) ? '' : 'none';
    });
}

// === Tab Logic ===
function showEmpTab(tabName) {
    document.querySelectorAll('.emp-tab-content').forEach(t => t.classList.remove('active'));
    // Nonaktifkan semua tab button
    document.querySelectorAll('.emp-tab').forEach(t => t.classList.remove('active'));

    // Aktifkan konten tab yang dipilih
    const contentEl = document.getElementById('tab-' + tabName);
    if (contentEl) contentEl.classList.add('active');

    // Aktifkan button tab yang sesuai (berdasarkan teks atau index jika perlu, tapi paling aman cari yang punya onclick dengan tabName ini)
    const tabButtons = document.querySelectorAll('.emp-tab');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
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
    showEmpTabDirect('personal');
}

function showEmpTabDirect(tabName) {
    document.querySelectorAll('.emp-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.emp-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelector('.emp-tab').classList.add('active');
}

async function openCreateEmp() {
    resetForm();
    document.getElementById('empModalTitle').textContent = 'Add New Employee';

    // Auto-generate NID dari jumlah karyawan di DB
    try {
        const employees = await fetch(`${API_BASE_URL}/employees`).then(r => r.json());
        const empCount = employees.filter(u => ['employee', 'manager'].includes(u.role)).length;
        document.getElementById('empNID').value = 'EMP-' + String(empCount + 1).padStart(4, '0');
    } catch {
        document.getElementById('empNID').value = 'EMP-' + String(Date.now()).slice(-4);
    }

    await populateDeptAndLocation();
    openEmpModal();
}

async function viewEmp(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/employees/${id}`);
        if (!response.ok) throw new Error('Employee not found');
        const user = await response.json();

        resetForm();
        document.getElementById('empModalTitle').textContent = 'Edit Employee: ' + user.name;
        document.getElementById('empId').value = user.id;

        // Populate semua field dari FIELD_MAP
        for (const [elemId, key] of Object.entries(FIELD_MAP)) {
            const el = document.getElementById(elemId);
            if (el && user[key] !== undefined && user[key] !== null) {
                el.value = user[key];
            }
        }

        // Photo preview (avatar dari DB)
        if (user.avatar) {
            document.getElementById('photoPreview').innerHTML = `<img src="${user.avatar}">`;
        }

        // Dokumen tersimpan (dari DB documents jika ada)
        renderSavedDocs(user);

        await populateDeptAndLocation();

        // Re-set dropdown values setelah repopulate
        setTimeout(() => {
            if (user.department) document.getElementById('empDept').value = user.department;
            if (user.location) document.getElementById('empLocation').value = user.location;
            if (user.group) document.getElementById('empGroup').value = user.group;
            if (user.supervisor_name) document.getElementById('empSupervisor').value = user.supervisor_name;
            if (user.final_approver_name) document.getElementById('empFinalApproverName').value = user.final_approver_name;
        }, 150);

        openEmpModal();
    } catch (err) {
        console.error('viewEmp error:', err);
        alert('Gagal memuat data karyawan.');
    }
}

function renderSavedDocs(user) {
    // Dokumen di-handle terpisah via documents table di DB
    // Untuk sementara tampilkan placeholder yang informatif
    const html = '<p style="color:#999;"><i class="fas fa-info-circle"></i> Manajemen dokumen tersedia setelah data tersimpan.</p>';
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
        if (input && input.files && input.files[0]) {
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

async function deleteEmp(id) {
    if (!confirm('Yakin ingin menghapus data karyawan ini?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/employees/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        await loadEmployees();
    } catch (err) {
        console.error('deleteEmp error:', err);
        alert('Gagal menghapus karyawan. Silakan coba lagi.');
    }
}

// === Form Submit ===
document.getElementById('empForm').addEventListener('submit', async (e) => {
    try {
        e.preventDefault();
        console.log("DEBUG: Submit triggered");
        const empIdVal = document.getElementById('empId').value;
        const isEdit = !!empIdVal;

        // --- Manual Validation for Required Fields ---
        const requiredFields = [
            { id: 'empName', label: 'Nama Lengkap', tab: 'personal' },
            { id: 'empSupervisor', label: 'Nama Supervisor', tab: 'employment' },
            { id: 'empFinalApproverName', label: 'Nama Final Approver', tab: 'employment' }
        ];

        for (const field of requiredFields) {
            const el = document.getElementById(field.id);
            if (el && !el.value.trim()) {
                alert(`Field "${field.label}" wajib diisi!`);
                showEmpTab(field.tab);
                el.focus();
                return;
            }
        }

        // Kumpulkan data dari semua field (sesuai FIELD_MAP → snake_case)
        let empData = {};
        for (const [elemId, key] of Object.entries(FIELD_MAP)) {
            const el = document.getElementById(elemId);
            if (el) empData[key] = el.value || null;
        }

        // Tentukan username & role
        empData.username = empData.email || empData.nid || 'emp_' + Date.now();
        empData.role = (empData.level === 'Manager' || empData.level === 'Director') ? 'manager' : 'employee';

        // Handle foto → simpan sebagai avatar (base64)
        const photoInput = document.getElementById('empPhoto');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            const photoBase64 = await readFileAsBase64('empPhoto');
            if (photoBase64) empData.avatar = photoBase64;
        }

        // Mapping alias untuk fields yang nama di DB berbeda
        empData.email = empData.email_personal || empData.email;

        let response;
        if (isEdit) {
            response = await fetch(`${API_BASE_URL}/employees/${empIdVal}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(empData)
            });
        } else {
            empData.password = 'password'; // Default password
            empData.source = 'admin_created';
            response = await fetch(`${API_BASE_URL}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(empData)
            });
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server error');
        }

        alert(isEdit ? 'Data karyawan berhasil diperbarui!' : 'Karyawan baru berhasil ditambahkan!');
        closeEmpModal();
        await loadEmployees();

    } catch (err) {
        console.error('Form submit error:', err);
        alert('Gagal menyimpan data: ' + err.message);
    }
});

// === Excel Import/Export Logic ===

function downloadTemplate() {
    console.log("downloadTemplate called");
    if (typeof XLSX === 'undefined') {
        alert("Library Excel (SheetJS) belum dimuat. Silakan refresh halaman.");
        return;
    }
    try {
        const headers = [
            "NID", "Name", "Birth Place", "Birth Date (YYYY-MM-DD)", "Gender", "Marital Status",
            "Religion", "Citizenship", "KTP Number", "NPWP", "Address Domicile", "Address KTP",
            "Phone", "Phone Emergency", "Email Personal", "Email Company", "Join Date (YYYY-MM-DD)",
            "Employee Status", "Contract Period", "Position", "Department", "Supervisor",
            "Location", "Shift", "Group", "Grade", "Level", "Active Status", "BPJS Health", "BPJS Labor",
            "Base Salary", "Fixed Allowance", "Transport Allowance", "Bank Name", "Bank Account",
            "Bank Holder", "Education", "Major", "Graduation Year", "Skills", "Certifications",
            "Training History", "Competency Level", "Position History", "Promotion History",
            "Mutation History", "Previous Company", "KPI Score", "Eval History", "Discipline Status", "HR Notes"
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.sheet_add_aoa(ws, [[
            "EMP-0001", "John Doe", "Jakarta", "1990-01-01", "Male", "Single",
            "Islam", "WNI", "1234567890", "09.123.456.7", "St. Example 1", "St. Example 1",
            "08123456789", "08123456780", "john@personal.com", "john@company.com", "2024-01-01",
            "Tetap", "Permanent", "Developer", "IT", "Jane Manager",
            "Jakarta", "P", "Group A", "G3", "Staff", "active", "12345", "67890",
            "5000000", "500000", "300000", "BCA", "987654321", "John Doe",
            "S1", "Informatics", "2012", "JS, Python", "AWS Certified",
            "Basic Training", "High", "Junior", "Mid", "None", "Company A", "4.5", "Good", "None", "Great employee"
        ]], { origin: "A2" });

        const wscols = headers.map(h => ({ wch: h.length + 5 }));
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, "E-PeopleSync_Employee_Template.xlsx");
    } catch (error) {
        console.error("Error generating Excel template:", error);
        alert("Terjadi kesalahan saat membuat template: " + error.message);
    }
}

function triggerImport() {
    document.getElementById('importExcelInput').click();
}

async function handleImportExcel(input) {
    if (typeof XLSX === 'undefined') {
        alert("Library Excel belum siap.");
        input.value = '';
        return;
    }
    const file = input.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert("File Excel kosong atau tidak terbaca.");
                return;
            }

            await importJSONToDatabase(jsonData);
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("Gagal membaca file Excel: " + error.message);
    }
}

async function importJSONToDatabase(rows) {
    const headerMap = {
        "NID": "nid", "Name": "name", "Birth Place": "birth_place", "Birth Date (YYYY-MM-DD)": "birth_date",
        "Gender": "gender", "Marital Status": "marital_status", "Religion": "religion",
        "Citizenship": "citizenship", "KTP Number": "ktp_number", "NPWP": "npwp",
        "Address Domicile": "address_domicile", "Address KTP": "address_ktp",
        "Phone": "phone", "Phone Emergency": "phone_emergency", "Email Personal": "email_personal",
        "Email Company": "email", "Join Date (YYYY-MM-DD)": "join_date",
        "Employee Status": "employee_status", "Contract Period": "contract_period",
        "Position": "position", "Department": "department", "Supervisor": "supervisor_name",
        "Location": "location", "Shift": "shift_code", "Group": "group", "Grade": "grade", "Level": "level",
        "Active Status": "status", "BPJS Health": "bpjs_health", "BPJS Labor": "bpjs_labor",
        "Base Salary": "basic_salary", "Fixed Allowance": "fixed_allowance", "Transport Allowance": "transport_allowance",
        "Bank Name": "bank_name", "Bank Account": "bank_account", "Bank Holder": "bank_holder",
        "Education": "education", "Major": "major", "Graduation Year": "grad_year",
        "Skills": "skills", "Certifications": "certifications", "Training History": "training_history",
        "Competency Level": "competency_level", "Position History": "position_history",
        "Promotion History": "promotion_history", "Mutation History": "mutation_history",
        "Previous Company": "previous_company", "KPI Score": "kpi_score", "Eval History": "eval_history",
        "Discipline Status": "discipline_status", "HR Notes": "hr_notes"
    };

    // Ambil NID yang sudah ada untuk cek duplikat
    let existingNIDs = new Set();
    try {
        const existing = await fetch(`${API_BASE_URL}/employees`).then(r => r.json());
        existing.forEach(u => { if (u.nid) existingNIDs.add(u.nid); });
    } catch { /* ignore, will try to import anyway */ }

    let importedCount = 0;
    let skippedCount = 0;
    const promises = [];

    rows.forEach(row => {
        const nid = row["NID"] ? row["NID"].toString().trim() : null;
        const name = row["Name"] ? row["Name"].toString().trim() : null;

        if (!nid || !name) { skippedCount++; return; }
        if (existingNIDs.has(nid)) { skippedCount++; return; }

        // Build payload
        let payload = { password: 'password', source: 'excel_import' };
        payload.role = (row["Level"] === 'Manager' || row["Level"] === 'Director') ? 'manager' : 'employee';

        for (const [excelHeader, internalKey] of Object.entries(headerMap)) {
            if (row[excelHeader] !== undefined) {
                payload[internalKey] = row[excelHeader].toString().trim();
            }
        }

        // Fallback username
        if (!payload.username) {
            payload.username = payload.email || payload.email_personal || (nid || '').toLowerCase().replace(/-/g, '_');
        }

        promises.push(
            fetch(`${API_BASE_URL}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => {
                if (r.ok) importedCount++;
                else skippedCount++;
            }).catch(() => { skippedCount++; })
        );
    });

    await Promise.all(promises);

    if (importedCount > 0) {
        alert(`Impor Selesai!\n\n${importedCount} karyawan berhasil ditambahkan.\n${skippedCount} baris dilewati (duplikat atau data tidak lengkap).`);
        await loadEmployees();
    } else {
        alert("Tidak ada data baru yang diimpor. Pastikan NID belum terdaftar dan format sudah sesuai.");
    }
}
