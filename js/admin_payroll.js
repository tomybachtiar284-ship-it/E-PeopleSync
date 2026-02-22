/**
 * Payroll Management Logic — PostgreSQL API Version
 */

const API = 'http://localhost:3001';

// ── In-memory state ───────────────────────────────────────────
let _employees = [];   // [{id, name, nid, position, department, base_salary, ...}]
let _payrollMap = {};   // { userId: recordObj }  (current period)
let _settings = {};   // payroll settings from DB

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth(['admin']);
    const now = new Date();
    document.getElementById('payrollMonth').value = now.getMonth();
    document.getElementById('payrollYear').value = now.getFullYear();
    await loadPayrollData();
    initUserProfile();
});

// ── Helpers ───────────────────────────────────────────────────
function getPeriod() {
    return {
        month: parseInt(document.getElementById('payrollMonth').value),
        year: parseInt(document.getElementById('payrollYear').value),
        label: document.getElementById('payrollMonth').options[
            document.getElementById('payrollMonth').selectedIndex
        ].text + ' ' + document.getElementById('payrollYear').value
    };
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount || 0);
}

// ── Load / Sync ───────────────────────────────────────────────
async function loadPayrollData() {
    const { month, year } = getPeriod();
    try {
        const [empRes, recRes, settRes] = await Promise.all([
            fetch(`${API}/api/employees`),
            fetch(`${API}/api/payroll/records?month=${month}&year=${year}`),
            fetch(`${API}/api/payroll/settings`)
        ]);
        const emps = await empRes.json();
        const records = await recRes.json();
        const settings = await settRes.json();

        _employees = emps.filter(u =>
            ['employee', 'manager'].includes(u.role) &&
            u.status !== 'Resign' && u.status !== 'PHK' && u.status !== 'Pensiun'
        );

        _settings = {
            bpjs_jht_emp: parseFloat(settings.bpjs_jht_emp) || 2,
            bpjs_jp_emp: parseFloat(settings.bpjs_jp_emp) || 1,
            bpjs_kes_emp: parseFloat(settings.bpjs_kes_emp) || 1,
            ot_index: parseFloat(settings.ot_index) || 173,
            tax_office_limit: parseFloat(settings.tax_office_limit) || 500000,
            ptkp0: parseFloat(settings.ptkp0) || 54000000,
        };

        // Build payrollMap — merge DB records with employees
        _payrollMap = {};
        _employees.forEach(e => {
            const rec = records.find(r => r.user_id == e.id || r.id == e.id);
            _payrollMap[e.id] = {
                id: e.id,
                name: e.name,
                nid: e.nid,
                email: e.email_company || e.email_personal || e.email || '-',
                position: e.position || '-',
                department: e.department || '-',
                baseSalary: parseFloat(e.base_salary || e.baseSalary) || 0,
                fixedAllowance: parseFloat(e.fixed_allowance || e.fixedAllowance) || 0,
                transportAllowance: parseFloat(e.transport_allowance || e.transportAllowance) || 0,
                otHours: rec ? parseFloat(rec.ot_hours || 0) : 0,
                bonus: rec ? parseFloat(rec.bonus || 0) : 0,
                deduction: rec ? parseFloat(rec.manual_deduction || 0) : 0,
                emailStatus: rec ? (rec.email_status || 'Not Sent') : 'Not Sent',
                // Calculated fields (from DB if processed)
                otPay: rec ? parseFloat(rec.total_ot || 0) : 0,
                gross: rec ? parseFloat(rec.gross_salary || 0) : 0,
                bpjsJHT: rec ? parseFloat(rec.bpjs_jht || 0) : 0,
                bpjsJP: rec ? parseFloat(rec.bpjs_jp || 0) : 0,
                bpjsKes: rec ? parseFloat(rec.bpjs_kes || 0) : 0,
                pph21: rec ? parseFloat(rec.pph21 || 0) : 0,
                thp: rec ? parseFloat(rec.net_salary || 0) : null,
                status: rec ? (rec.status === 'processed' ? 'Processed' : rec.status || 'Draft') : 'Draft',
                dbId: rec ? rec.id : null
            };
        });

    } catch (e) {
        console.error('loadPayrollData error:', e.message);
    }

    renderPayrollTable(_payrollMap);
    updateSummary(_payrollMap);
}

// ── Render ─────────────────────────────────────────────────────
function renderPayrollTable(record) {
    const tbody = document.getElementById('payrollTableBody');
    tbody.innerHTML = '';

    Object.values(record).forEach(item => {
        const salary = formatRupiah(item.baseSalary);
        const thp = item.thp !== null ? formatRupiah(item.thp) : '-';

        let statusClass = 'text-muted';
        if (item.status === 'Processed') statusClass = 'text-success';
        if (item.status === 'Modified') statusClass = 'text-warning';

        const emailBadge = item.emailStatus === 'Sent'
            ? '<small class="text-success"><i class="fas fa-check-circle"></i> Sent</small>' : '';
        const modifiedText = item.status === 'Modified'
            ? '<br><small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Gaji Berubah - Mohon Hitung Ulang</small>' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong><br>
                <small class="text-muted">${item.nid || 'No NID'}</small><br>
                <small class="text-muted" style="font-size:11px;">${item.email}</small>
            </td>
            <td>${item.position || '-'}</td>
            <td>${salary}</td>
            <td>
                <input type="number" class="payroll-input" value="${item.otHours}"
                    onchange="updateItem(${item.id}, 'otHours', this.value)">
            </td>
            <td>
                <small>Fix: ${formatRupiah(item.fixedAllowance)}</small><br>
                <small>Trp: ${formatRupiah(item.transportAllowance)}</small>
            </td>
            <td>
                <input type="number" class="payroll-input" placeholder="Potongan Lain" value="${item.deduction}"
                    onchange="updateItem(${item.id}, 'deduction', this.value)">
            </td>
            <td>
                <strong style="color:var(--primary-color);font-size:14px;">${thp}</strong><br>
                <small class="${statusClass}">${item.status}</small> ${emailBadge}${modifiedText}
            </td>
            <td>
                <button class="btn btn-sm btn-success" onclick="processItem(${item.id})" title="Calculate">
                    <i class="fas fa-calculator"></i>
                </button>
                ${item.status === 'Processed' ? `
                    <button class="btn btn-sm btn-info" onclick="viewPayslip(${item.id})" title="View/Print">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" id="btnEmail_${item.id}"
                        onclick="sendPayslipEmail(${item.id})" title="Send via Email">
                        <i class="fas fa-envelope"></i>
                    </button>
                ` : ''}
            </td>`;
        tbody.appendChild(tr);
    });
}

// ── Update item input ─────────────────────────────────────────
function updateItem(id, field, value) {
    if (!_payrollMap[id]) return;
    _payrollMap[id][field] = parseFloat(value) || 0;
    // Mark as Draft if changed after Processed
    if (_payrollMap[id].status === 'Processed') _payrollMap[id].status = 'Modified';
    renderPayrollTable(_payrollMap);
    updateSummary(_payrollMap);
}

// ── Calculate ─────────────────────────────────────────────────
function calcOne(item) {
    const base = item.baseSalary;
    const fixed = item.fixedAllowance;
    const transport = item.transportAllowance;
    const otHours = item.otHours || 0;
    const bonus = item.bonus || 0;
    const manDed = item.deduction || 0;

    const otPay = Math.round((base / _settings.ot_index) * otHours);
    const gross = base + fixed + transport + otPay + bonus;

    const bpjsJHT = Math.round(base * (_settings.bpjs_jht_emp / 100));
    const bpjsJP = Math.round(base * (_settings.bpjs_jp_emp / 100));
    const bpjsKes = Math.round(base * (_settings.bpjs_kes_emp / 100));
    const totalBPJS = bpjsJHT + bpjsJP + bpjsKes;

    let biayaJabatan = gross * 0.05;
    if (biayaJabatan > _settings.tax_office_limit) biayaJabatan = _settings.tax_office_limit;

    const netMonth = gross - biayaJabatan - totalBPJS;
    let pkp = (netMonth * 12) - _settings.ptkp0;
    if (pkp < 0) pkp = 0;

    let pphYear = 0;
    if (pkp > 0) {
        if (pkp <= 60000000) {
            pphYear = pkp * 0.05;
        } else {
            pphYear = 60000000 * 0.05;
            const r1 = pkp - 60000000;
            if (r1 <= 190000000) {
                pphYear += r1 * 0.15;
            } else {
                pphYear += 190000000 * 0.15;
                pphYear += (r1 - 190000000) * 0.25;
            }
        }
    }
    const pph21 = Math.round(pphYear / 12);
    const thp = gross - totalBPJS - pph21 - manDed;

    return { otPay, gross, bpjsJHT, bpjsJP, bpjsKes, pph21, thp };
}

async function processItem(id) {
    const item = _payrollMap[id];
    if (!item) return;
    const { month, year } = getPeriod();
    const calc = calcOne(item);
    Object.assign(item, calc, { status: 'Processed' });

    try {
        await fetch(`${API}/api/payroll/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: id,
                period_month: month,
                period_year: year,
                basic_salary: item.baseSalary,
                fixed_allowance: item.fixedAllowance,
                transport_allowance: item.transportAllowance,
                ot_hours: item.otHours,
                total_ot: calc.otPay,
                bonus: item.bonus,
                gross_salary: calc.gross,
                bpjs_jht: calc.bpjsJHT,
                bpjs_jp: calc.bpjsJP,
                bpjs_kes: calc.bpjsKes,
                pph21: calc.pph21,
                manual_deduction: item.deduction,
                total_deductions: calc.bpjsJHT + calc.bpjsJP + calc.bpjsKes + calc.pph21 + item.deduction,
                net_salary: calc.thp,
                status: 'processed'
            })
        });
    } catch (e) { console.error('processItem save error:', e.message); }

    renderPayrollTable(_payrollMap);
    updateSummary(_payrollMap);
}

async function processAllPayroll() {
    const { month, year } = getPeriod();
    const saves = Object.values(_payrollMap).map(async item => {
        const calc = calcOne(item);
        Object.assign(item, calc, { status: 'Processed' });
        await fetch(`${API}/api/payroll/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: item.id,
                period_month: month,
                period_year: year,
                basic_salary: item.baseSalary,
                fixed_allowance: item.fixedAllowance,
                transport_allowance: item.transportAllowance,
                ot_hours: item.otHours,
                total_ot: calc.otPay,
                bonus: item.bonus,
                gross_salary: calc.gross,
                bpjs_jht: calc.bpjsJHT,
                bpjs_jp: calc.bpjsJP,
                bpjs_kes: calc.bpjsKes,
                pph21: calc.pph21,
                manual_deduction: item.deduction,
                total_deductions: calc.bpjsJHT + calc.bpjsJP + calc.bpjsKes + calc.pph21 + item.deduction,
                net_salary: calc.thp,
                status: 'processed'
            })
        });
    });
    await Promise.all(saves);
    renderPayrollTable(_payrollMap);
    updateSummary(_payrollMap);
    alert('Payroll processed successfully!');
}

async function resetPayroll() {
    if (!confirm('Reset data payroll untuk periode ini? Data lembur dan input manual akan hilang.')) return;
    // Re-load fresh from DB (which will return empty records for this period)
    Object.values(_payrollMap).forEach(item => {
        item.otHours = 0; item.bonus = 0; item.deduction = 0;
        item.otPay = 0; item.gross = 0; item.bpjsJHT = 0;
        item.bpjsJP = 0; item.bpjsKes = 0; item.pph21 = 0;
        item.thp = null; item.status = 'Draft'; item.emailStatus = 'Not Sent';
    });
    renderPayrollTable(_payrollMap);
    updateSummary(_payrollMap);
}

function refreshPayrollWithLoading() {
    const btn = document.getElementById('refreshBtn');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat Data...';
    btn.style.opacity = '0.8';
    setTimeout(async () => {
        await loadPayrollData();
        btn.innerHTML = '<i class="fas fa-check"></i> Selesai Sinkron';
        btn.classList.replace('btn-primary', 'btn-success');
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = orig;
            btn.classList.replace('btn-success', 'btn-primary');
            btn.style.opacity = '1';
        }, 1500);
    }, 800);
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary(record) {
    let total = 0, processed = 0, pending = 0;
    Object.values(record).forEach(item => {
        if (item.status === 'Processed') { total += item.thp || 0; processed++; }
        else pending++;
    });
    document.getElementById('totalCost').textContent = formatRupiah(total);
    document.getElementById('processedCount').textContent = processed;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('periodLabel').textContent = 'Period: ' + getPeriod().label;
}

// ── Payslip Modal ─────────────────────────────────────────────
function viewPayslip(id) {
    const record = _payrollMap[id];
    if (!record) return;
    const { label } = getPeriod();

    document.getElementById('payslipContent').innerHTML = `
        <div class="payslip-header">
            <h2>E-PEOPLESYNC INDONESIA</h2>
            <p>SLIP GAJI KARYAWAN</p>
            <p>Periode: ${label}</p>
        </div>
        <div class="payslip-row">
            <div>
                <strong>Nama:</strong> ${record.name}<br>
                <strong>NID:</strong> ${record.nid || '-'}<br>
                <strong>Jabatan:</strong> ${record.position}
            </div>
            <div style="text-align:right;">
                <strong>Departemen:</strong> ${record.department}<br>
                <strong>Status:</strong> Pegawai Tetap
            </div>
        </div>
        <div class="payslip-section">
            <h4 style="margin-bottom:10px;">PENERIMAAN (EARNINGS)</h4>
            <div class="payslip-row"><span>Gaji Pokok</span><span>${formatRupiah(record.baseSalary)}</span></div>
            <div class="payslip-row"><span>Tunjangan Tetap</span><span>${formatRupiah(record.fixedAllowance)}</span></div>
            <div class="payslip-row"><span>Tunjangan Transport</span><span>${formatRupiah(record.transportAllowance)}</span></div>
            <div class="payslip-row"><span>Lembur (${record.otHours} jam)</span><span>${formatRupiah(record.otPay)}</span></div>
            <div class="payslip-row"><span>Bonus / Lainnya</span><span>${formatRupiah(record.bonus)}</span></div>
            <div class="payslip-row" style="border-top:1px solid #ddd;margin-top:5px;padding-top:5px;">
                <strong>Total Bruto (Gross)</strong><strong>${formatRupiah(record.gross)}</strong>
            </div>
        </div>
        <div class="payslip-section">
            <h4 style="margin-bottom:10px;">POTONGAN (DEDUCTIONS)</h4>
            <div class="payslip-row"><span>BPJS Ketenagakerjaan (JHT ${_settings.bpjs_jht_emp}%)</span><span>(${formatRupiah(record.bpjsJHT)})</span></div>
            <div class="payslip-row"><span>BPJS Ketenagakerjaan (JP ${_settings.bpjs_jp_emp}%)</span><span>(${formatRupiah(record.bpjsJP)})</span></div>
            <div class="payslip-row"><span>BPJS Kesehatan (${_settings.bpjs_kes_emp}%)</span><span>(${formatRupiah(record.bpjsKes)})</span></div>
            <div class="payslip-row"><span>PPh 21</span><span>(${formatRupiah(record.pph21)})</span></div>
            <div class="payslip-row"><span>Potongan Lain</span><span>(${formatRupiah(record.deduction)})</span></div>
            <div class="payslip-row" style="border-top:1px solid #ddd;margin-top:5px;padding-top:5px;">
                <strong>Total Potongan</strong>
                <strong>(${formatRupiah(record.bpjsJHT + record.bpjsJP + record.bpjsKes + record.pph21 + record.deduction)})</strong>
            </div>
        </div>
        <div class="payslip-total">
            <div class="payslip-row">
                <span>GAJI BERSIH (TAKE HOME PAY)</span>
                <span style="font-size:18px;">${formatRupiah(record.thp)}</span>
            </div>
        </div>
        <div style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
            <div><p>Diterima Oleh,</p><br><br><br><p>(${record.name})</p></div>
            <div><p>Jakarta, ${new Date().toLocaleDateString('id-ID')}</p><p>Finance Dept,</p><br><br><br><p>( Manager HR & GA )</p></div>
        </div>
        <div style="margin-top:30px;font-size:11px;color:#888;text-align:center;">
            <i>Dokumen ini dihasilkan secara otomatis oleh sistem komputer.</i>
        </div>`;
    document.getElementById('payslipModal').style.display = 'block';
}

function closePayslipModal() {
    document.getElementById('payslipModal').style.display = 'none';
}

// ── Email (Simulated) ─────────────────────────────────────────
function sendPayslipEmail(id) {
    const record = _payrollMap[id];
    if (!record || record.status !== 'Processed') {
        alert('Please process payroll first before sending email.');
        return;
    }
    const email = record.email && record.email !== '-' ? record.email : null;
    if (!email) { alert('Employee email not found. Please update employee profile.'); return; }

    const { label } = getPeriod();
    document.getElementById('emailTargetDisplay').textContent = email;
    document.getElementById('emailSubjectInput').value = `Slip Gaji E-PeopleSync - ${record.name} - ${label}`;
    document.getElementById('emailBodyDisplay').innerHTML = `
        Halo <b>${record.name}</b>,<br><br>
        Terlampir rincian slip gaji Anda periode <b>${label}</b>.<br>
        Total Gaji Bersih (THP): <b>${formatRupiah(record.thp)}</b>.<br><br>
        Salam,<br><b>Finance Dept - E-PeopleSync Indonesia</b>`;
    document.getElementById('emailConfirmModal').style.display = 'block';
    document.getElementById('confirmSendBtn').onclick = () => { closeEmailConfirm(); performEmailSend(id, email); };
}

function closeEmailConfirm() {
    document.getElementById('emailConfirmModal').style.display = 'none';
}

async function performEmailSend(id, email) {
    const btn = document.getElementById(`btnEmail_${id}`);
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    setTimeout(async () => {
        btn.innerHTML = orig; btn.disabled = false;
        if (_payrollMap[id]) {
            _payrollMap[id].emailStatus = 'Sent';
            // Persist email status via payroll record update
            const { month, year } = getPeriod();
            await fetch(`${API}/api/payroll/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: id,
                    period_month: month,
                    period_year: year,
                    email_status: 'Sent',
                    status: 'processed',
                    // Pass existing fields to avoid overwriting
                    net_salary: _payrollMap[id].thp,
                    basic_salary: _payrollMap[id].baseSalary,
                    total_deductions: _payrollMap[id].bpjsJHT + _payrollMap[id].bpjsJP +
                        _payrollMap[id].bpjsKes + _payrollMap[id].pph21 + _payrollMap[id].deduction
                })
            }).catch(console.error);
        }
        renderPayrollTable(_payrollMap);
        alert(`Sukses! Slip gaji dikirim ke: ${email}`);
    }, 1500);
}

// ── Guide Modal ───────────────────────────────────────────────
function openGuideModal() { document.getElementById('payrollGuideModal').style.display = 'block'; }
function closeGuideModal() { document.getElementById('payrollGuideModal').style.display = 'none'; }
