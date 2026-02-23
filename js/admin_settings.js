/**
 * Admin Settings — PostgreSQL API Version
 * Handles: User Management, Master Data (via localStorage), Payroll Settings, Shift Patterns & Definitions
 */

const API = 'http://localhost:3001';

// ── In-memory cache ──────────────────────────────────────────
let _shifts = [];   // shift definitions (polled from /api/settings key='shiftDefinitions')
let _patterns = {};   // group patterns   (polled from /api/settings key='groupPatterns')
let _groups = [];   // employee groups  (polled from /api/settings key='employeeGroups')

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth(['admin']);
    await loadStaticSettings();
    loadUsers();
    loadMasterData();
    initUserProfile();
    populatePatternMonths();
    populateDeptDropdown();
});

// ── Load static settings from /api/settings ─────────────────
async function loadStaticSettings() {
    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        // Store parsed JSON values
        _shifts = tryParse(data['shiftDefinitions'], defaultShifts());
        _patterns = tryParse(data['groupPatterns'], {});
        _groups = tryParse(data['employeeGroups'], ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D']);
    } catch (e) {
        console.warn('loadStaticSettings:', e.message);
        _shifts = defaultShifts();
        _patterns = {};
        _groups = ['Grup Daytime', 'Grup A', 'Grup B', 'Grup C', 'Grup D'];
    }
}

function tryParse(val, fallback) {
    if (val === undefined || val === null) return fallback;
    if (typeof val !== 'string') return val; // Already parsed
    try { return JSON.parse(val); } catch { return fallback; }
}

function defaultShifts() {
    return [
        { code: 'DT', name: 'Daytime', clockIn: '08:00', clockOut: '17:00' },
        { code: 'P', name: 'Pagi', clockIn: '07:00', clockOut: '15:00' },
        { code: 'S', name: 'Siang', clockIn: '15:00', clockOut: '23:00' },
        { code: 'M', name: 'Malam', clockIn: '23:00', clockOut: '07:00' },
        { code: 'L', name: 'Libur', clockIn: '', clockOut: '' }
    ];
}

async function populateDeptDropdown() {
    try {
        const res = await fetch(`${API}/api/employees`);
        const emps = await res.json();
        const depts = [...new Set(emps.map(e => e.department).filter(Boolean))];
        const sel = document.getElementById('uDept');
        if (sel) {
            sel.innerHTML = '<option value="">-- Pilih Dept --</option>' +
                depts.map(d => `<option value="${d}">${d}</option>`).join('');
        }
    } catch { }
}

// ── Tab Management ───────────────────────────────────────────
function switchTab(tab) {
    document.getElementById('tab-users').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('tab-master').style.display = tab === 'master' ? 'block' : 'none';
    document.getElementById('tab-payroll').style.display = tab === 'payroll' ? 'block' : 'none';
    document.getElementById('tab-attendance').style.display = tab === 'attendance' ? 'block' : 'none';
    document.getElementById('tab-patterns').style.display = tab === 'patterns' ? 'block' : 'none';
    document.getElementById('tab-shifts').style.display = tab === 'shifts' ? 'block' : 'none';

    const buttons = document.querySelectorAll('.tabs button');
    buttons.forEach(btn => btn.classList.remove('active'));
    const idx = ['users', 'master', 'payroll', 'attendance', 'patterns', 'shifts'].indexOf(tab);
    if (buttons[idx]) buttons[idx].classList.add('active');

    if (tab === 'payroll') loadPayrollSettings();
    if (tab === 'attendance') loadAttendanceSettings();
    if (tab === 'patterns') renderPatternGrid();
    if (tab === 'shifts') renderShiftDefinitions();
}

// ── Payroll Settings Tab ─────────────────────────────────────
async function loadPayrollSettings() {
    try {
        const res = await fetch(`${API}/api/payroll/settings`);
        const settings = await res.json();
        document.getElementById('set_bpjs_jht').value = settings.bpjs_jht_emp ?? 2;
        document.getElementById('set_bpjs_jp').value = settings.bpjs_jp_emp ?? 1;
        document.getElementById('set_bpjs_kes').value = settings.bpjs_kes_emp ?? 1;
        document.getElementById('set_ot_index').value = settings.ot_index ?? 173;
        document.getElementById('set_tax_limit').value = settings.tax_office_limit ?? 500000;
        document.getElementById('set_ptkp0').value = settings.ptkp0 ?? 54000000;
    } catch (e) { console.error('loadPayrollSettings:', e.message); }
}

async function resetPayrollSettings() {
    if (!confirm('Reset to default settings?')) return;
    const defaults = {
        bpjs_jht_emp: 2, bpjs_jp_emp: 1, bpjs_kes_emp: 1,
        ot_index: 173, tax_office_limit: 500000, ptkp0: 54000000
    };
    await fetch(`${API}/api/payroll/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
    });
    loadPayrollSettings();
    alert('Settings reset to default.');
}

document.getElementById('payrollSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        bpjs_jht_emp: parseFloat(document.getElementById('set_bpjs_jht').value),
        bpjs_jp_emp: parseFloat(document.getElementById('set_bpjs_jp').value),
        bpjs_kes_emp: parseFloat(document.getElementById('set_bpjs_kes').value),
        ot_index: parseInt(document.getElementById('set_ot_index').value),
        tax_office_limit: parseInt(document.getElementById('set_tax_limit').value),
        ptkp0: parseInt(document.getElementById('set_ptkp0').value)
    };
    try {
        await fetch(`${API}/api/payroll/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        alert('Payroll settings updated successfully!');
    } catch { alert('Gagal menyimpan setelan payroll.'); }
});

// ── Attendance GPS Settings Tab ────────────────────────────────
let gpsMap = null;
let gpsMarker = null;
let gpsCircle = null;

async function loadAttendanceSettings() {
    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        const config = tryParse(data['attendanceConfig'], {
            officeLat: -6.1753924,
            officeLon: 106.8271528,
            maxRadius: 100
        });

        const latInput = document.getElementById('set_office_lat');
        const lonInput = document.getElementById('set_office_lon');
        const radInput = document.getElementById('set_max_radius');

        latInput.value = config.officeLat;
        lonInput.value = config.officeLon;
        radInput.value = config.maxRadius;

        // Leaflet Map Initialization
        setTimeout(() => {
            if (!gpsMap) {
                gpsMap = L.map('gpsMap').setView([config.officeLat, config.officeLon], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(gpsMap);

                gpsMarker = L.marker([config.officeLat, config.officeLon]).addTo(gpsMap);
                gpsCircle = L.circle([config.officeLat, config.officeLon], {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.2,
                    radius: config.maxRadius
                }).addTo(gpsMap);

                // Map Click Event
                gpsMap.on('click', function (e) {
                    const lat = e.latlng.lat;
                    const lon = e.latlng.lng;
                    latInput.value = lat.toFixed(7);
                    lonInput.value = lon.toFixed(7);
                    updateMapVisuals();
                });

                // Input Changes Event
                [latInput, lonInput, radInput].forEach(input => {
                    input.addEventListener('input', updateMapVisuals);
                });
            } else {
                gpsMap.invalidateSize();
                updateMapVisuals();
            }
        }, 300); // Slight delay to ensure tab is visible and map calculates size correctly
    } catch (e) { console.error('loadAttendanceSettings:', e.message); }
}

function updateMapVisuals() {
    if (!gpsMap || !gpsMarker || !gpsCircle) return;
    const lat = parseFloat(document.getElementById('set_office_lat').value) || 0;
    const lon = parseFloat(document.getElementById('set_office_lon').value) || 0;
    const rad = parseInt(document.getElementById('set_max_radius').value) || 0;

    const newLatLng = new L.LatLng(lat, lon);
    gpsMarker.setLatLng(newLatLng);
    gpsCircle.setLatLng(newLatLng);
    gpsCircle.setRadius(rad);
    gpsMap.panTo(newLatLng);
}

document.getElementById('attendanceSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
        officeLat: parseFloat(document.getElementById('set_office_lat').value),
        officeLon: parseFloat(document.getElementById('set_office_lon').value),
        maxRadius: parseInt(document.getElementById('set_max_radius').value)
    };
    try {
        await fetch(`${API}/api/settings/attendanceConfig`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: config })
        });
        alert('Attendance GPS Configuration updated successfully!');
    } catch { alert('Gagal menyimpan konfigurasi absensi.'); }
});

// ── User Management Tab ──────────────────────────────────────
async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    try {
        const res = await fetch(`${API}/api/employees`);
        const users = await res.json();
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.username || u.nid || '-'}</td>
                <td><span class="badge badge-info">${u.role}</span></td>
                <td>${u.department || '-'}</td>
                <td>${u.position || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('loadUsers:', e.message); }
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

async function editUser(id) {
    try {
        const res = await fetch(`${API}/api/employees/${id}`);
        const user = await res.json();
        document.getElementById('userModal').style.display = 'block';
        document.getElementById('userModalTitle').innerText = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('uName').value = user.name;
        document.getElementById('uUsername').value = user.username || '';
        document.getElementById('uRole').value = user.role;
        document.getElementById('uDept').value = user.department || '';
        document.getElementById('uPosition').value = user.position || '';
        document.getElementById('uPassword').value = '';
    } catch (e) { console.error('editUser:', e.message); }
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
        await fetch(`${API}/api/employees/${id}`, { method: 'DELETE' });
        loadUsers();
    } catch { alert('Gagal menghapus user.'); }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('uName').value;
    const username = document.getElementById('uUsername').value;
    const password = document.getElementById('uPassword').value;
    const role = document.getElementById('uRole').value;
    const dept = document.getElementById('uDept').value;
    const pos = document.getElementById('uPosition').value;
    const payload = { name, username, role, department: dept, position: pos };
    if (password) payload.password = password;

    try {
        if (id) {
            await fetch(`${API}/api/employees/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            if (!password) payload.password = '123456';
            payload.status = 'active';
            await fetch(`${API}/api/employees`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        closeUserModal();
        loadUsers();
        alert('User saved successfully');
    } catch { alert('Gagal menyimpan user.'); }
});

// ── Master Data Tab ────────────────────────────────────────────
async function loadMasterData() {
    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        renderList('deptList', data.departments || [], 'departments');
        renderList('locList', data.locations || [], 'locations');
        renderList('typeList', data.job_types || [], 'job_types');
    } catch (e) {
        console.error('loadMasterData:', e.message);
    }
}

function renderList(elementId, items, type) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = '';
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${item}<button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('${type}',${index})">&times;</button>`;
        list.appendChild(li);
    });
}

async function addMasterData(type) {
    const value = prompt(`Enter new entry:`);
    if (!value) return;

    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        const list = data[type] || [];
        list.push(value);

        await fetch(`${API}/api/settings/${type}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: list })
        });
        await loadMasterData();
    } catch (e) {
        console.error('addMasterData:', e.message);
        alert('Failed to add master data.');
    }
}

async function deleteMasterData(type, index) {
    if (!confirm('Delete this item?')) return;

    try {
        const res = await fetch(`${API}/api/settings`);
        const data = await res.json();
        const list = data[type] || [];
        list.splice(index, 1);

        await fetch(`${API}/api/settings/${type}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: list })
        });
        await loadMasterData();
    } catch (e) {
        console.error('deleteMasterData:', e.message);
        alert('Failed to delete master data.');
    }
}

// ── Shift Patterns Tab ───────────────────────────────────────
function populatePatternMonths() {
    const select = document.getElementById('patternMonth');
    if (!select) return;
    select.innerHTML = '';
    const now = new Date();
    for (let i = -1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (i === 0) opt.selected = true;
        select.appendChild(opt);
    }
}

function renderPatternGrid() {
    const monthKey = document.getElementById('patternMonth').value;
    if (!monthKey) return;
    const header = document.getElementById('patternTableHeader');
    const body = document.getElementById('patternTableBody');
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Header
    let headHtml = '<tr><th style="width:150px;background:#f8f9fa;vertical-align:middle;text-align:center;">Grup / Tanggal</th>';
    for (let i = 1; i <= daysInMonth; i++) {
        headHtml += `<th style="text-align:center;min-width:45px;background:#007bff;color:white;font-size:12px;padding:8px 2px;">${i}</th>`;
    }
    headHtml += '</tr>';
    header.innerHTML = headHtml;

    body.innerHTML = '';
    const patterns = (_patterns[monthKey] || {});

    _groups.forEach(group => {
        const tr = document.createElement('tr');
        const groupPatt = patterns[group] || [];
        let rowHtml = `<td style="font-weight:700;background:#f8f9fa;font-size:13px;padding-left:15px;vertical-align:middle;">${group}</td>`;
        for (let i = 0; i < daysInMonth; i++) {
            const currentVal = groupPatt[i] || 'L';
            rowHtml += `
                <td class="pattern-cell-container ${currentVal.toLowerCase()}" style="padding:0;text-align:center;vertical-align:middle;width:45px;height:40px;">
                    <select class="pattern-cell" data-group="${group}" data-day="${i}"
                        onchange="this.parentElement.className='pattern-cell-container '+this.value.toLowerCase()"
                        style="width:100%;height:100%;border:none;background:transparent;font-size:11px;font-weight:800;text-align:center;cursor:pointer;color:inherit;appearance:none;">
                        ${_shifts.map(s => `<option value="${s.code}" ${currentVal === s.code ? 'selected' : ''} style="background:white;color:black;">${s.code}</option>`).join('')}
                    </select>
                </td>`;
        }
        tr.innerHTML = rowHtml;
        body.appendChild(tr);
    });
}

async function savePatternGrid() {
    const monthKey = document.getElementById('patternMonth').value;
    const patterns = {};
    document.querySelectorAll('.pattern-cell').forEach(sel => {
        const group = sel.dataset.group;
        const day = parseInt(sel.dataset.day);
        if (!patterns[group]) patterns[group] = [];
        patterns[group][day] = sel.value;
    });
    _patterns[monthKey] = patterns;

    try {
        await fetch(`${API}/api/settings/groupPatterns`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: _patterns })
        });
        alert('Pola shift grup berhasil disimpan!');
    } catch { alert('Gagal menyimpan pola shift.'); }
}

function triggerPatternImport() { document.getElementById('patternImportInput').click(); }

function handlePatternImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) return alert('Format file tidak valid');
        const monthKey = document.getElementById('patternMonth').value;
        const patterns = {};
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const gName = row[0];
            if (!gName) continue;
            const matched = _groups.find(g => g.toLowerCase().includes(gName.toString().toLowerCase()));
            if (!matched) continue;
            patterns[matched] = row.slice(1).map(v => (v || 'L').toString().trim());
        }
        _patterns[monthKey] = patterns;
        await fetch(`${API}/api/settings/groupPatterns`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: _patterns })
        });
        renderPatternGrid();
        alert('Data pola shift berhasil diimpor!');
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

function downloadPatternTemplate() {
    const monthKey = document.getElementById('patternMonth').value;
    const [year, mon] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const header = ['Grup / Tanggal'];
    for (let i = 1; i <= daysInMonth; i++) header.push(i);
    const rowsData = [header];
    _groups.forEach(g => {
        const row = [g];
        const existing = (_patterns[monthKey] || {})[g] || [];
        for (let i = 0; i < daysInMonth; i++) row.push(existing[i] || 'L');
        rowsData.push(row);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(rowsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pola Shift");
    XLSX.writeFile(workbook, `Pola_Shift_${monthKey}.xlsx`);
}

// ── Shift Definitions Tab ─────────────────────────────────────
function renderShiftDefinitions() {
    const tbody = document.getElementById('shiftDefTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    _shifts.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control shift-code" value="${s.code}" style="font-weight:700;text-align:center;"></td>
            <td><input type="text" class="form-control shift-name" value="${s.name}"></td>
            <td><input type="time" class="form-control shift-in"   value="${s.clockIn}"></td>
            <td><input type="time" class="form-control shift-out"  value="${s.clockOut}"></td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteShiftRow(this)"><i class="fas fa-trash"></i></button>
            </td>`;
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
        <td style="text-align:center;"><button class="btn btn-sm btn-outline-danger" onclick="deleteShiftRow(this)"><i class="fas fa-trash"></i></button></td>`;
    tbody.appendChild(tr);
}

function deleteShiftRow(btn) { btn.closest('tr').remove(); }

async function saveShiftDefinitions() {
    const rows = document.querySelectorAll('#shiftDefTableBody tr');
    const newShifts = [];
    rows.forEach(row => {
        const code = row.querySelector('.shift-code').value.trim().toUpperCase();
        const name = row.querySelector('.shift-name').value.trim() || code;
        const clockIn = row.querySelector('.shift-in').value;
        const clockOut = row.querySelector('.shift-out').value;
        if (code) newShifts.push({ code, name, clockIn, clockOut });
    });
    _shifts = newShifts;
    try {
        await fetch(`${API}/api/settings/shiftDefinitions`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: _shifts })
        });
        alert('Jam kerja berhasil dikonfigurasi!');
    } catch { alert('Gagal menyimpan shift.'); }
}
