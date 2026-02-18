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
    empPosition: 'position', empDept: 'department', empSupervisor: 'supervisorName',
    empSupervisorJob: 'supervisorJob', empSupervisorEmail: 'supervisorEmail',
    empFinalApproverName: 'finalApproverName', empFinalApproverJob: 'finalApproverJob',
    empFinalApproverEmail: 'finalApproverEmail',
    empLocation: 'location', empShift: 'shift',
    empGrade: 'grade', empLevel: 'level', empActiveStatus: 'activeStatus',
    empGroup: 'group',
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
    renderModernHeader();
    renderModernFooter();
    initUserProfile();
    loadEmployees();
    populateDeptAndLocation();
});

function populateDeptAndLocation() {
    const data = getData();
    populateDropdown('empDept', data.departments || [], 'Department');
    populateDropdown('empLocation', data.locations || [], 'Location');
    populateDropdown('empGroup', data.employeeGroups || [], 'Group');

    // Filter Group specifically (No "Add New" and include "Semua Grup")
    const filterSelect = document.getElementById('filterGroup');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">-- Semua Grup --</option>';
        (data.employeeGroups || []).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            filterSelect.appendChild(opt);
        });
    }

    // Populate Supervisor & Final Approver dropdowns
    const approvers = data.companyApprovers || [];
    const supSelect = document.getElementById('empSupervisor');
    const finalSelect = document.getElementById('empFinalApproverName');

    if (supSelect) {
        // Clear and add default
        supSelect.innerHTML = '<option value="">-- Pilih Approver --</option>';
        approvers.forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.name;
            opt.textContent = app.name;
            supSelect.appendChild(opt);
        });

        // Add change listener for auto-fill
        supSelect.onchange = (e) => {
            const selected = approvers.find(a => a.name === e.target.value);
            document.getElementById('empSupervisorJob').value = selected ? (selected.position || '') : '';
            document.getElementById('empSupervisorEmail').value = selected ? (selected.email || '') : '';
        };
    }

    if (finalSelect) {
        // Clear and add default
        finalSelect.innerHTML = '<option value="">-- Pilih Approver --</option>';
        approvers.forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.name;
            opt.textContent = app.name;
            finalSelect.appendChild(opt);
        });

        // Add change listener for auto-fill
        finalSelect.onchange = (e) => {
            const selected = approvers.find(a => a.name === e.target.value);
            document.getElementById('empFinalApproverJob').value = selected ? (selected.position || '') : '';
            document.getElementById('empFinalApproverEmail').value = selected ? (selected.email || '') : '';
        };
    }
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
            <td>${e.group || '-'}</td>
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
    const searchText = (document.getElementById('searchEmployee').value || "").toUpperCase().trim();
    const groupFilter = (document.getElementById('filterGroup').value || "").toUpperCase().trim();
    const rows = document.querySelectorAll('#employeeTableBody tr');

    rows.forEach(row => {
        const rowText = row.textContent.toUpperCase();
        const textMatch = rowText.indexOf(searchText) > -1;

        // Detect group column (index 5)
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
        if (user.group) document.getElementById('empGroup').value = user.group;
        if (user.supervisorName) document.getElementById('empSupervisor').value = user.supervisorName;
        if (user.finalApproverName) document.getElementById('empFinalApproverName').value = user.finalApproverName;
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
            order: data.users.length, // Add order for new employees
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

// === Excel Import/Export Logic ===

function downloadTemplate() {
    console.log("downloadTemplate called");
    if (typeof XLSX === 'undefined') {
        alert("Library Excel (SheetJS) belum dimuat dengan sempurna. Silakan periksa koneksi internet Anda atau coba refresh halaman (Ctrl+R).");
        return;
    }
    try {
        // 1. Prepare Headers (Human Readable)
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

        // 2. Create Sheet
        const ws = XLSX.utils.aoa_to_sheet([headers]);

        // Add some sample data for guidance
        XLSX.utils.sheet_add_aoa(ws, [[
            "EMP-0001", "John Doe", "Jakarta", "1990-01-01", "Male", "Single",
            "Islam", "WNI", "1234567890", "09.123.456.7", "St. Example 1", "St. Example 1",
            "08123456789", "08123456780", "john@personal.com", "john@company.com", "2024-01-01",
            "Tetap", "Permanent", "Developer", "IT", "Jane Manager",
            "Jakarta", "Shift A", "Grup A", "G3", "Staff", "Aktif", "12345", "67890",
            "5000000", "500000", "300000", "BCA", "987654321", "John Doe",
            "S1", "Informatics", "2012", "JS, Python", "AWS Certified",
            "Basic Training", "High", "Junior", "Mid", "None", "Company A", "4.5", "Good", "None", "Great employee"
        ]], { origin: "A2" });

        // Formatting: Adjust column widths
        const wscols = headers.map(h => ({ wch: h.length + 5 }));
        ws['!cols'] = wscols;

        // 3. Create Workbook and Download
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, "E-PeopleSync_Employee_Template.xlsx");
        console.log("Template download initiated");
    } catch (error) {
        console.error("Error generating Excel template:", error);
        alert("Terjadi kesalahan saat membuat template Excel: " + error.message);
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
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert("File Excel kosong atau tidak terbaca.");
                return;
            }

            importJSONToDatabase(jsonData);
            input.value = ''; // Reset input
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("Gagal membaca file Excel: " + error.message);
    }
}

function importJSONToDatabase(rows) {
    const data = getData();
    let importedCount = 0;
    let skippedCount = 0;

    // Map Excel Headers back to internal keys
    const headerMap = {
        "NID": "nid", "Name": "name", "Birth Place": "birthPlace", "Birth Date (YYYY-MM-DD)": "birthDate",
        "Gender": "gender", "Marital Status": "maritalStatus", "Religion": "religion",
        "Citizenship": "citizenship", "KTP Number": "ktpNumber", "NPWP": "npwp",
        "Address Domicile": "addressDomicile", "Address KTP": "addressKTP",
        "Phone": "phone", "Phone Emergency": "phoneEmergency", "Email Personal": "emailPersonal",
        "Email Company": "emailCompany", "Join Date (YYYY-MM-DD)": "joinDate",
        "Employee Status": "employeeStatus", "Contract Period": "contractPeriod",
        "Position": "position", "Department": "department", "Supervisor": "supervisor",
        "Location": "location", "Shift": "shift", "Group": "group", "Grade": "grade", "Level": "level",
        "Active Status": "activeStatus", "BPJS Health": "bpjsHealth", "BPJS Labor": "bpjsLabor",
        "Base Salary": "baseSalary", "Fixed Allowance": "fixedAllowance", "Transport Allowance": "transportAllowance",
        "Bank Name": "bankName", "Bank Account": "bankAccount", "Bank Holder": "bankHolder",
        "Education": "education", "Major": "major", "Graduation Year": "gradYear",
        "Skills": "skills", "Certifications": "certifications", "Training History": "trainingHistory",
        "Competency Level": "competencyLevel", "Position History": "positionHistory",
        "Promotion History": "promotionHistory", "Mutation History": "mutationHistory",
        "Previous Company": "previousCompany", "KPI Score": "kpiScore", "Eval History": "evalHistory",
        "Discipline Status": "disciplineStatus", "HR Notes": "hrNotes"
    };

    rows.forEach(row => {
        const nid = row["NID"] ? row["NID"].toString().trim() : null;
        const name = row["Name"] ? row["Name"].toString().trim() : null;

        if (!nid || !name) {
            skippedCount++;
            return;
        }

        // Check for duplicates
        if (data.users.some(u => u.nid === nid)) {
            skippedCount++;
            return;
        }

        // Build User Object
        let newUser = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            password: 'password', // Default password
            role: (row["Level"] === 'Manager' || row["Level"] === 'Director') ? 'manager' : 'employee',
            source: 'excel_import'
        };

        // Map all fields from row
        for (const [excelHeader, internalKey] of Object.entries(headerMap)) {
            if (row[excelHeader] !== undefined) {
                newUser[internalKey] = row[excelHeader].toString().trim();
            }
        }

        // Fallback for username
        if (!newUser.username) {
            newUser.username = newUser.emailCompany || newUser.emailPersonal || nid.toLowerCase().replace(/-/g, '_');
        }

        data.users.push(newUser);
        importedCount++;
    });

    if (importedCount > 0) {
        saveData(data);
        alert(`Impor Selesai!\n\n${importedCount} karyawan berhasil ditambahkan.\n${skippedCount} baris dilewati (duplikat atau data tidak lengkap).`);
        loadEmployees();
    } else {
        alert("Tidak ada data baru yang diimpor. Pastikan NID belum terdaftar dan format sudah sesuai.");
    }
}
