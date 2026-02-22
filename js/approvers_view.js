// API_BASE_URL is inherited from utils.js (includes JWT auto-inject via monkey-patched fetch)
let _approvers = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth(['admin', 'manager', 'employee']);
    if (user) {
        if (user.role === 'admin' || user.role === 'manager') {
            const addBtn = document.getElementById('addApproverBtn');
            if (addBtn) addBtn.style.display = 'block';
        }
    }

    await loadApprovers();
    renderApprovers();
    if (typeof renderModernHeader === 'function') renderModernHeader();
});

async function loadApprovers() {
    try {
        const settings = await fetch(`${API_BASE_URL}/settings`).then(r => r.json());
        _approvers = settings.companyApprovers || [];
        if (typeof _approvers === 'string') {
            try { _approvers = JSON.parse(_approvers); } catch { _approvers = []; }
        }
    } catch (e) {
        console.error('loadApprovers error:', e.message);
    }
}

function renderApprovers(filterName = '') {
    const grid = document.getElementById('approverGrid');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!grid) return;

    let list = [..._approvers];
    if (filterName) {
        list = list.filter(u => u.name.toLowerCase().includes(filterName.toLowerCase()));
    }
    list.sort((a, b) => a.name.localeCompare(b.name));

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="text-center w-100 py-5">
                <i class="fas fa-user-slash fa-3x" style="color:#cbd5e1;margin-bottom:20px;"></i>
                <h3>Data Not Found</h3>
                <p style="color:#64748b;">No approver registered in Master Data.</p>
            </div>`;
        return;
    }

    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
    grid.innerHTML = list.map((app, index) => `
        <div class="approver-card" style="position:relative;">
            <div class="approver-avatar-placeholder" style="width:80px;height:80px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid var(--premium-silver);color:#94a3b8;">
                <i class="fas fa-user-tie fa-2x"></i>
            </div>
            <h3 class="approver-name">${app.name}</h3>
            <div class="approver-info">
                <div style="font-weight:600;color:#475569;margin-bottom:3px;">${app.position || 'External Approver'}</div>
                <div style="font-size:12px;color:#94a3b8;">${app.email || ''}</div>
            </div>
            <div class="d-flex w-100 gap-2 mt-3">
                ${isAdmin ? `
                    <button onclick="openEditModal(${index})" class="approver-contact"
                        style="flex:1;padding:10px;background:#f1f5f9;color:#1e293b;border:none;cursor:pointer;" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteApprover(${index})" class="approver-contact"
                        style="flex:1;padding:10px;background:#fee2e2;color:#991b1b;border:none;cursor:pointer;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>` : `
                    <a href="mailto:${app.email || '#'}" class="approver-contact" style="flex:1;padding:10px;">
                        <i class="fas fa-envelope"></i>
                    </a>`
        }
                <button onclick="openInquiryModal(${index},'${app.name}')"
                    class="approver-contact" style="flex:3;padding:10px;border:none;cursor:pointer;">
                    <i class="fas fa-paper-plane"></i> Send Inquiry
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteApprover(index) {
    if (!confirm(`Hapus ${_approvers[index].name} dari daftar Atasan?`)) return;

    const newList = [..._approvers];
    newList.splice(index, 1);

    try {
        const res = await fetch(`${API_BASE_URL}/settings/companyApprovers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: newList })
        });

        if (res.ok) {
            _approvers = newList;
            renderApprovers();
            alert('Data atasan berhasil dihapus.');
        } else {
            throw new Error('Gagal update settings');
        }
    } catch (e) {
        alert('Gagal menghapus: ' + e.message);
    }
}

function openEditModal(index) {
    const modal = document.getElementById('createModal');
    const app = _approvers[index];
    if (!modal || !app) return;
    document.getElementById('createModalTitle').textContent = 'Edit Profile: ' + app.name;
    document.getElementById('editApproverId').value = index; // Use index as ID for Master Data
    document.getElementById('newApproverName').value = app.name;
    document.getElementById('newApproverPosition').value = app.position || '';
    document.getElementById('newApproverEmail').value = app.email || '';
    const btn = document.getElementById('createFormBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function submitCreateApprover(event) {
    event.preventDefault();
    const editIndex = document.getElementById('editApproverId').value;
    const name = document.getElementById('newApproverName').value;
    const pos = document.getElementById('newApproverPosition').value;
    const email = document.getElementById('newApproverEmail').value;
    const btn = document.getElementById('createFormBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    btn.disabled = true;

    try {
        let newList = [..._approvers];
        if (editIndex !== "") {
            newList[parseInt(editIndex)] = { name, position: pos, email };
        } else {
            newList.push({ name, position: pos, email });
        }

        const res = await fetch(`${API_BASE_URL}/settings/companyApprovers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: newList })
        });

        if (!res.ok) throw new Error('Gagal menyimpan ke server');

        _approvers = newList;
        alert(editIndex !== "" ? `Perubahan untuk ${name} disimpan.` : `Berhasil mendaftarkan ${name}.`);

        btn.innerHTML = orig; btn.disabled = false;
        closeCreateModal();
        document.getElementById('createForm').reset();
        renderApprovers();
    } catch (e) {
        alert('Gagal: ' + e.message);
        btn.innerHTML = orig; btn.disabled = false;
    }
}
function filterApprovers() {
    renderApprovers(document.getElementById('searchApprover').value);
}

// ── Inquiry Modal ─────────────────────────────────────────────
function openInquiryModal(index, name) {
    document.getElementById('atasanId').value = index;
    document.getElementById('atasanName').value = name;
    document.getElementById('inquiryModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeInquiryModal() {
    document.getElementById('inquiryModal').style.display = 'none';
    document.body.style.overflow = '';
}

function submitInquiry(event) {
    event.preventDefault();
    const name = document.getElementById('atasanName').value;
    const subject = document.getElementById('subject').value;
    const btn = event.target.querySelector('button');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    setTimeout(() => {
        alert(`Inquiry sent to ${name} successfully!\nSubject: ${subject}`);
        btn.innerHTML = orig; btn.disabled = false;
        closeInquiryModal();
        document.getElementById('inquiryForm').reset();
    }, 1500);
}

// ── Create / Edit Approver Modal ──────────────────────────────
function openCreateModal() {
    const modal = document.getElementById('createModal');
    if (!modal) return;
    document.getElementById('createForm').reset();
    document.getElementById('editApproverId').value = '';
    document.getElementById('createModalTitle').textContent = 'Register New Approver';
    const btn = document.getElementById('createFormBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-user-plus"></i> Register Approver';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

window.deleteApprover = deleteApprover; // Ensure this is global

// ── Global Scope ──────────────────────────────────────────────
window.filterApprovers = filterApprovers;
window.openInquiryModal = openInquiryModal;
window.closeInquiryModal = closeInquiryModal;
window.submitInquiry = submitInquiry;
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeCreateModal = closeCreateModal;
window.submitCreateApprover = submitCreateApprover;

window.onclick = function (event) {
    if (event.target == document.getElementById('inquiryModal')) closeInquiryModal();
    if (event.target == document.getElementById('createModal')) closeCreateModal();
};
