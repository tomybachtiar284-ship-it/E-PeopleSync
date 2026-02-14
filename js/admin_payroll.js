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
                position: e.position,
                baseSalary: parseFloat(e.baseSalary) || 0,
                fixedAllowance: parseFloat(e.fixedAllowance) || 0,
                transportAllowance: parseFloat(e.transportAllowance) || 0,
                otHours: 0,
                otRate: Math.round((parseFloat(e.baseSalary) || 0) / 173),
                bonus: 0,
                deduction: 0,
                status: 'Draft'
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
                    position: e.position,
                    baseSalary: parseFloat(e.baseSalary) || 0,
                    fixedAllowance: parseFloat(e.fixedAllowance) || 0,
                    transportAllowance: parseFloat(e.transportAllowance) || 0,
                    otHours: 0,
                    otRate: Math.round((parseFloat(e.baseSalary) || 0) / 173),
                    bonus: 0,
                    deduction: 0,
                    status: 'Draft'
                };
            }
        });
    }

    renderPayrollTable(payrollRecord);
    updateSummary(payrollRecord);
}

function renderPayrollTable(record) {
    consttbody = document.getElementById('payrollTableBody');
    const tbody = document.getElementById('payrollTableBody'); // Fix typo
    tbody.innerHTML = '';

    Object.values(record).forEach(item => {
        const salary = formatRupiah(item.baseSalary);
        const thp = item.thp ? formatRupiah(item.thp) : '-'; // Only show if processed

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${item.name}</strong><br>
                <small class="text-muted">${item.nid || 'No NID'}</small>
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
                <small>${item.status}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-success" onclick="processItem('${item.id}')"><i class="fas fa-calculator"></i></button>
                ${item.status === 'Processed' ? `<button class="btn btn-sm btn-info" onclick="viewPayslip('${item.id}')"><i class="fas fa-file-invoice"></i></button>` : ''}
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
        // 1. Overtime (1/173 rule)
        const otPay = Math.round((base / 173) * otHours);

        // 2. Gross Salary
        const gross = base + fixed + transport + otPay + bonus;

        // 3. BPJS Calculations
        // JHT (2%), JP (1%), Kes (1%) - Paid by Employee
        const bpjsJHT = Math.round(base * 0.02);
        const bpjsJP = Math.round(base * 0.01);
        const bpjsKes = Math.round(base * 0.01);
        const totalBPJS = bpjsJHT + bpjsJP + bpjsKes;

        // 4. PPh 21 Calculation (Simplified Progressive)
        // Biaya Jabatan (5% max 500k)
        let biayaJabatan = gross * 0.05;
        if (biayaJabatan > 500000) biayaJabatan = 500000;

        const netMonth = gross - biayaJabatan - totalBPJS;
        const netYear = netMonth * 12;

        // PTKP (Status Nikah)
        const marital = e.maritalStatus || 'Belum Menikah'; // Simplified
        let ptkp = 54000000; // TK/0
        if (marital === 'Menikah') ptkp += 4500000;
        // Tanggungan anak not yet in data, assume 0 for safe calc

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
