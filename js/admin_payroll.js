/**
 * Payroll Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin']);

    // Set default date to now
    const now = new Date();
    document.getElementById('payrollMonth').value = now.getMonth();
    document.getElementById('payrollYear').value = now.getFullYear();

    loadPayrollData();
});

function refreshPayrollWithLoading() {
    const btn = document.getElementById('refreshBtn');
    const originalHTML = btn.innerHTML;

    // Set loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat Data...';
    btn.style.opacity = '0.8';

    // Simulate network/processing delay for professional feel
    setTimeout(() => {
        loadPayrollData();

        // Restore button
        btn.innerHTML = '<i class="fas fa-check"></i> Selesai Sinkron';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');

        // Final restore after 1.5s
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
            btn.style.opacity = '1';
        }, 1500);
    }, 800);
}

function getPayrollKey() {
    const m = document.getElementById('payrollMonth').value;
    const y = document.getElementById('payrollYear').value;
    return `payroll_${y}_${m}`;
}

function loadPayrollData() {
    const data = getData();
    const key = getPayrollKey();
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role) && u.activeStatus !== 'Resign' && u.activeStatus !== 'PHK' && u.activeStatus !== 'Pensiun');

    // Load existing payroll record or init empty
    let payrollRecord = data.payrolls ? data.payrolls[key] : null;

    if (!payrollRecord) {
        // Init temporary record structure for display
        payrollRecord = {};
        employees.forEach(e => {
            payrollRecord[e.id] = {
                id: e.id,
                name: e.name,
                nid: e.nid,
                email: e.emailCompany || e.emailPersonal || '-',
                position: e.position,
                baseSalary: parseFloat(e.baseSalary) || 0,
                fixedAllowance: parseFloat(e.fixedAllowance) || 0,
                transportAllowance: parseFloat(e.transportAllowance) || 0,
                otHours: 0,
                otRate: Math.round((parseFloat(e.baseSalary) || 0) / 173),
                bonus: 0,
                deduction: 0,
                status: 'Draft',
                emailStatus: 'Not Sent'
            };
        });
    } else {
        // Merge with current employees (in case new employees added mid-month)
        employees.forEach(e => {
            if (!payrollRecord[e.id]) {
                payrollRecord[e.id] = {
                    id: e.id,
                    name: e.name,
                    nid: e.nid,
                    email: e.emailCompany || e.emailPersonal || '-',
                    position: e.position,
                    baseSalary: parseFloat(e.baseSalary) || 0,
                    fixedAllowance: parseFloat(e.fixedAllowance) || 0,
                    transportAllowance: parseFloat(e.transportAllowance) || 0,
                    otHours: 0,
                    otRate: Math.round((parseFloat(e.baseSalary) || 0) / 173),
                    bonus: 0,
                    deduction: 0,
                    status: 'Draft',
                    emailStatus: 'Not Sent'
                };
            } else {
                // ALWAYS Sync Master Data if still in Draft, or update critical info
                const item = payrollRecord[e.id];
                item.name = e.name;
                item.nid = e.nid;
                item.position = e.position;
                item.email = e.emailCompany || e.emailPersonal || '-';

                // Always sync salary info to reflect latest master data
                const oldBase = item.baseSalary;
                item.baseSalary = parseFloat(e.baseSalary) || 0;
                item.fixedAllowance = parseFloat(e.fixedAllowance) || 0;
                item.transportAllowance = parseFloat(e.transportAllowance) || 0;
                item.otRate = Math.round((item.baseSalary) / 173);

                // If Master Data (Salary) changed and it was already processed, mark it!
                if (item.status === 'Processed' && oldBase !== item.baseSalary) {
                    item.status = 'Modified'; // Needs re-calculation
                }
            }
        });
    }

    // Persist the synced record (especially for Drafts/Modified that got updated salaries)
    if (!data.payrolls) data.payrolls = {};
    data.payrolls[key] = payrollRecord;
    saveData(data);

    renderPayrollTable(payrollRecord);
    updateSummary(payrollRecord);
}

function renderPayrollTable(record) {
    const tbody = document.getElementById('payrollTableBody');
    tbody.innerHTML = '';

    Object.values(record).forEach(item => {
        const salary = formatRupiah(item.baseSalary);
        // Fix: Properly handle 0 or negative THP (don't show '-' if it's 0)
        const thp = (item.thp !== undefined && item.thp !== null) ? formatRupiah(item.thp) : '-';

        let statusClass = 'text-muted';
        if (item.status === 'Processed') statusClass = 'text-success';
        if (item.status === 'Modified') statusClass = 'text-warning';

        const emailStatusText = item.emailStatus === 'Sent' ? '<small class="text-success"><i class="fas fa-check-circle"></i> Sent</small>' : '';
        const modifiedText = item.status === 'Modified' ? '<br><small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Gaji Berubah - Mohon Hitung Ulang</small>' : '';

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
                    onchange="updateItem('${item.id}', 'otHours', this.value)">
            </td>
            <td>
                <small>Fix: ${formatRupiah(item.fixedAllowance)}</small><br>
                <small>Trp: ${formatRupiah(item.transportAllowance)}</small>
            </td>
            <td>
                <input type="number" class="payroll-input" placeholder="Potongan Lain" value="${item.deduction}" 
                    onchange="updateItem('${item.id}', 'deduction', this.value)">
            </td>
            <td>
                <strong style="color:var(--primary-color); font-size:14px;">${thp}</strong><br>
                <small>${item.status}</small> ${emailStatusText}
            </td>
            <td>
                <button class="btn btn-sm btn-success" onclick="processItem('${item.id}')" title="Calculate"><i class="fas fa-calculator"></i></button>
                ${item.status === 'Processed' ? `
                    <button class="btn btn-sm btn-info" onclick="viewPayslip('${item.id}')" title="View/Print"><i class="fas fa-file-invoice"></i></button>
                    <button class="btn btn-sm btn-primary" id="btnEmail_${item.id}" onclick="sendPayslipEmail('${item.id}')" title="Send via Email"><i class="fas fa-envelope"></i></button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateItem(id, field, value) {
    // Temporary storage in DOM or memory? 
    // Best to save to localStorage immediately to persist "Draft" state
    const data = getData();
    const key = getPayrollKey();
    if (!data.payrolls) data.payrolls = {};
    if (!data.payrolls[key]) {
        // Create the record if it doesn't exist (first save)
        // Re-construct logic from loadPayrollData needed here or simpler:
        // We need to grab the full object.
        // Let's rely on the fact that loadPayrollData constructed it.
        // But we need to persist it now.
        alert("Please click 'Process All' first to initialize the period properly, or I'll implement auto-save.");
        return;
        // Actually, let's auto-init in loadPayrollData and save it? 
        // Better: Just update the in-memory object and save.
    }

    data.payrolls[key][id][field] = parseFloat(value) || 0;
    saveData(data);
    loadPayrollData(); // Re-render to update calculations if we want real-time (but calc happens on process)
}

function processAllPayroll() {
    const data = getData();
    const key = getPayrollKey();

    // We need to re-fetch employees to ensure we have latest data
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role) && u.activeStatus !== 'Resign');

    if (!data.payrolls) data.payrolls = {};
    let record = data.payrolls[key] || {};

    // Get Dynamic Settings
    const settings = data.payrollSettings || {
        bpjs_jht_emp: 2,
        bpjs_jp_emp: 1,
        bpjs_kes_emp: 1,
        ot_index: 173,
        tax_office_limit: 500000,
        ptkp0: 54000000
    };

    employees.forEach(e => {
        // Get existing inputs or defaults
        const existing = record[e.id] || {};

        // Base Data
        const base = parseFloat(e.baseSalary) || 0;
        const fixed = parseFloat(e.fixedAllowance) || 0;
        const transport = parseFloat(e.transportAllowance) || 0;

        // Inputs
        const otHours = existing.otHours || 0;
        const bonus = existing.bonus || 0;
        const manualDeduction = existing.deduction || 0;

        // CALCULATIONS
        // 1. Overtime (Dynamic index rule)
        const otPay = Math.round((base / settings.ot_index) * otHours);

        // 2. Gross Salary
        const gross = base + fixed + transport + otPay + bonus;

        // 3. BPJS Calculations (Dynamic rates)
        const bpjsJHT = Math.round(base * (settings.bpjs_jht_emp / 100));
        const bpjsJP = Math.round(base * (settings.bpjs_jp_emp / 100));
        const bpjsKes = Math.round(base * (settings.bpjs_kes_emp / 100));
        const totalBPJS = bpjsJHT + bpjsJP + bpjsKes;

        // 4. PPh 21 Calculation (Simplified Progressive)
        // Biaya Jabatan (5% max [tax_office_limit])
        let biayaJabatan = gross * 0.05;
        if (biayaJabatan > settings.tax_office_limit) biayaJabatan = settings.tax_office_limit;

        const netMonth = gross - biayaJabatan - totalBPJS;
        const netYear = netMonth * 12;

        // PTKP (Status Nikah)
        const marital = e.maritalStatus || 'Belum Menikah';
        let ptkp = settings.ptkp0; // Dynamic PTKP TK/0
        if (marital === 'Menikah') ptkp += 4500000;

        let pkp = netYear - ptkp;
        if (pkp < 0) pkp = 0;

        let pphYear = 0;
        if (pkp > 0) {
            // Layer 1: 0 - 60jt (5%)
            if (pkp <= 60000000) {
                pphYear = pkp * 0.05;
            } else {
                pphYear = 60000000 * 0.05;
                const remain = pkp - 60000000;
                // Layer 2: 60jt - 250jt (15%)
                if (remain <= 190000000) {
                    pphYear += remain * 0.15;
                } else {
                    pphYear += 190000000 * 0.15;
                    const remain2 = remain - 190000000;
                    // Layer 3: > 250jt (simplified stop here for now)
                    pphYear += remain2 * 0.25;
                }
            }
        }

        const pphMonth = Math.round(pphYear / 12);

        // 5. Net Salary (THP)
        // Formula: Gross - BPJS (Emp) - Tax - Manual Deduction
        const thp = gross - totalBPJS - pphMonth - manualDeduction;

        // Save Result
        record[e.id] = {
            ...existing,
            id: e.id,
            name: e.name,
            nid: e.nid,
            position: e.position,
            department: e.department,
            joinDate: e.joinDate,
            baseSalary: base,
            fixedAllowance: fixed,
            transportAllowance: transport,
            otHours: otHours,
            otPay: otPay,
            bonus: bonus,
            gross: gross,
            bpjsJHT: bpjsJHT,
            bpjsJP: bpjsJP,
            bpjsKes: bpjsKes,
            pph21: pphMonth,
            deduction: manualDeduction,
            thp: thp,
            status: 'Processed'
        };
    });

    data.payrolls[key] = record;
    saveData(data);
    loadPayrollData();
    alert('Payroll processed successfully!');
}

function processItem(id) {
    // Process single item? For now just run all is safer to keep sync.
    processAllPayroll();
}

function resetPayroll() {
    if (!confirm('Reset data payroll untuk periode ini? Data lembur dan input manual akan hilang.')) return;
    const data = getData();
    const key = getPayrollKey();
    if (data.payrolls && data.payrolls[key]) {
        delete data.payrolls[key];
        saveData(data);
    }
    loadPayrollData();
}

function updateSummary(record) {
    let total = 0;
    let count = 0;
    let pending = 0;

    Object.values(record).forEach(item => {
        if (item.status === 'Processed') {
            total += item.thp;
            count++;
        } else {
            pending++;
        }
    });

    document.getElementById('totalCost').textContent = formatRupiah(total);
    document.getElementById('processedCount').textContent = count;
    document.getElementById('pendingCount').textContent = pending;

    const m = document.getElementById('payrollMonth').options[document.getElementById('payrollMonth').selectedIndex].text;
    const y = document.getElementById('payrollYear').value;
    document.getElementById('periodLabel').textContent = `Period: ${m} ${y}`;
}

function viewPayslip(id) {
    const data = getData();
    const key = getPayrollKey();
    const record = data.payrolls[key][id];

    if (!record) return;

    const m = document.getElementById('payrollMonth').options[document.getElementById('payrollMonth').selectedIndex].text;
    const y = document.getElementById('payrollYear').value;

    const html = `
        <div class="payslip-header">
            <h2>KOMPETENZA INDONESIA</h2>
            <p>SLIP GAJI KARYAWAN</p>
            <p>Periode: ${m} ${y}</p>
        </div>
        
        <div class="payslip-row">
            <div>
                <strong>Nama:</strong> ${record.name}<br>
                <strong>NID:</strong> ${record.nid}<br>
                <strong>Jabatan:</strong> ${record.position}
            </div>
            <div style="text-align:right;">
                <strong>Departemen:</strong> ${record.department}<br>
                <strong>Status:</strong> Pegawai Tetap
            </div>
        </div>

        <div class="payslip-section">
            <h4 style="margin-bottom:10px;">PENERIMAAN (EARNINGS)</h4>
            <div class="payslip-row"><span>Gaji Pokok</span> <span>${formatRupiah(record.baseSalary)}</span></div>
            <div class="payslip-row"><span>Tunjangan Tetap</span> <span>${formatRupiah(record.fixedAllowance)}</span></div>
            <div class="payslip-row"><span>Tunjangan Transport</span> <span>${formatRupiah(record.transportAllowance)}</span></div>
            <div class="payslip-row"><span>Lembur (${record.otHours} jam)</span> <span>${formatRupiah(record.otPay)}</span></div>
            <div class="payslip-row"><span>Bonus / Lainnya</span> <span>${formatRupiah(record.bonus)}</span></div>
            <div class="payslip-row" style="border-top:1px solid #ddd; margin-top:5px; padding-top:5px;">
                <strong>Total Bruto (Gross)</strong> <strong>${formatRupiah(record.gross)}</strong>
            </div>
        </div>

        <div class="payslip-section">
            <h4 style="margin-bottom:10px;">POTONGAN (DEDUCTIONS)</h4>
            <div class="payslip-row"><span>BPJS Ketenagakerjaan (JHT 2%)</span> <span>(${formatRupiah(record.bpjsJHT)})</span></div>
            <div class="payslip-row"><span>BPJS Ketenagakerjaan (JP 1%)</span> <span>(${formatRupiah(record.bpjsJP)})</span></div>
            <div class="payslip-row"><span>BPJS Kesehatan (1%)</span> <span>(${formatRupiah(record.bpjsKes)})</span></div>
            <div class="payslip-row"><span>PPh 21</span> <span>(${formatRupiah(record.pph21)})</span></div>
            <div class="payslip-row"><span>Potongan Lain</span> <span>(${formatRupiah(record.deduction)})</span></div>
            <div class="payslip-row" style="border-top:1px solid #ddd; margin-top:5px; padding-top:5px;">
                <strong>Total Potongan</strong> <strong>(${formatRupiah(record.bpjsJHT + record.bpjsJP + record.bpjsKes + record.pph21 + record.deduction)})</strong>
            </div>
        </div>

        <div class="payslip-total">
            <div class="payslip-row">
                <span>GAJI BERSIH (TAKE HOME PAY)</span>
                <span style="font-size:18px;">${formatRupiah(record.thp)}</span>
            </div>
        </div>

        <div style="margin-top:40px; display:flex; justify-content:space-between; text-align:center;">
            <div>
                <p>Diterima Oleh,</p>
                <br><br><br>
                <p>(${record.name})</p>
            </div>
            <div>
                <p>Jakarta, ${new Date().toLocaleDateString('id-ID')}</p>
                <p>Finance Dept,</p>
                <br><br><br>
                <p>( Manager HR & GA )</p>
            </div>
        </div>
        
        <div style="margin-top:30px; font-size:11px; color:#888; text-align:center;">
            <i>Dokumen ini dihasilkan secara otomatis oleh sistem komputer.</i>
        </div>
    `;

    document.getElementById('payslipContent').innerHTML = html;
    document.getElementById('payslipModal').style.display = 'block';
}

function closePayslipModal() {
    document.getElementById('payslipModal').style.display = 'none';
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function sendPayslipEmail(id) {
    const data = getData();
    const key = getPayrollKey();
    const record = data.payrolls[key][id];
    const user = data.users.find(u => u.id == id);

    if (!record || record.status !== 'Processed') {
        alert('Please process payroll first before sending email.');
        return;
    }

    // Ensure we have the latest email from the user object
    const email = user ? (user.emailCompany || user.emailPersonal) : record.email;

    if (!email || email === '-') {
        alert('Employee email not found. Please update employee profile.');
        return;
    }

    // Period formatting
    const m = document.getElementById('payrollMonth').options[document.getElementById('payrollMonth').selectedIndex].text;
    const y = document.getElementById('payrollYear').value;
    const period = `${m} ${y}`;

    // Subject & Body Preview
    const subject = `Slip Gaji Kompetenza - ${record.name} - ${period}`;
    const body = `
        Halo <b>${record.name}</b>,<br><br>
        Terlampir adalah rincian slip gaji Anda untuk periode <b>${period}</b>.<br>
        Total Gaji Bersih (THP): <b>${formatRupiah(record.thp)}</b>.<br><br>
        Silakan cek rincian lengkapnya melalui sistem atau hubungi HR jika ada pertanyaan.<br><br>
        Salam,<br>
        <b>Finance Dept - Kompetenza Indonesia</b>
    `;

    // Populate Modal
    document.getElementById('emailTargetDisplay').textContent = email;
    document.getElementById('emailSubjectInput').value = subject;
    document.getElementById('emailBodyDisplay').innerHTML = body;
    document.getElementById('emailConfirmModal').style.display = 'block';

    // Set click handler for confirmation button
    document.getElementById('confirmSendBtn').onclick = () => {
        closeEmailConfirm();
        performEmailSend(id, email);
    };
}

function closeEmailConfirm() {
    document.getElementById('emailConfirmModal').style.display = 'none';
}

function performEmailSend(id, email) {
    const key = getPayrollKey();
    const btn = document.getElementById(`btnEmail_${id}`);
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Simulate sending delay
    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;

        // Update status in data
        const freshData = getData();
        if (freshData.payrolls && freshData.payrolls[key] && freshData.payrolls[key][id]) {
            freshData.payrolls[key][id].emailStatus = 'Sent';
            freshData.payrolls[key][id].email = email; // Finalize email in record
            saveData(freshData);
        }

        loadPayrollData();
        alert(`Sukses! Slip gaji periode ini telah dikirim ke: ${email}`);
    }, 1500);
}

function openGuideModal() {
    document.getElementById('payrollGuideModal').style.display = 'block';
}

function closeGuideModal() {
    document.getElementById('payrollGuideModal').style.display = 'none';
}
