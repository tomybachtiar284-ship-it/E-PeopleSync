/**
 * Approvers View Logic (Simplified)
 * Fetches and displays Admins and Managers for employees.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Approvers View: Initializing (Simplified UI)...');

    const user = checkAuth(['admin', 'manager', 'employee']);
    if (user) {
        initUserProfile();
        if (user.role === 'admin' || user.role === 'manager') {
            const addBtn = document.getElementById('addApproverBtn');
            if (addBtn) addBtn.style.display = 'block';
        }
    }

    renderApprovers();
    renderModernHeader();
});

function renderApprovers(filterName = '') {
    const data = getData();
    const grid = document.getElementById('approverGrid');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!grid) return;

    // Pull from Company Approvers bucket
    let approvers = data.companyApprovers || [];

    // Apply Search Filter
    if (filterName) {
        approvers = approvers.filter(u => u.name.toLowerCase().includes(filterName.toLowerCase()));
    }

    // Sort by name
    approvers.sort((a, b) => a.name.localeCompare(b.name));

    if (approvers.length === 0) {
        grid.innerHTML = `
            <div class="text-center w-100 py-5">
                <i class="fas fa-user-slash fa-3x" style="color: #cbd5e1; margin-bottom: 20px;"></i>
                <h3>Data Not Found</h3>
                <p style="color: #64748b;">No approver matches your search criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = approvers.map(app => {
        const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

        return `
            <div class="approver-card" style="position: relative;">
                <div class="approver-avatar-placeholder" style="width: 80px; height: 80px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border: 2px solid var(--premium-silver); color: #94a3b8;">
                    <i class="fas fa-user-tie fa-2x"></i>
                </div>
                <h3 class="approver-name">${app.name}</h3>
                <div class="approver-info">
                    <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">
                        ${app.position || 'Approver'}
                    </div>
                </div>
                
                <div class="d-flex w-100 gap-2 mt-3">
                    ${canEdit ? `
                        <button onclick="openEditModal(${app.id})" class="approver-contact" 
                            style="flex: 1; padding: 10px; background: #f1f5f9; color: #1e293b; border: none; cursor: pointer;" 
                            title="Edit Profile">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : `
                        <a href="mailto:${app.email || 'hr@company.com'}" class="approver-contact" style="flex: 1; padding: 10px;">
                            <i class="fas fa-envelope"></i>
                        </a>
                    `}
                    
                    <button onclick="openInquiryModal(${app.id}, '${app.name}')" 
                        class="approver-contact" style="flex: 3; padding: 10px; border: none; cursor: pointer;">
                        <i class="fas fa-paper-plane"></i> Send Inquiry
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterApprovers() {
    const name = document.getElementById('searchApprover').value;
    renderApprovers(name);
}

// Modal: Inquiry Logic
function openInquiryModal(id, name) {
    const modal = document.getElementById('inquiryModal');
    document.getElementById('atasanId').value = id;
    document.getElementById('atasanName').value = name;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeInquiryModal() {
    const modal = document.getElementById('inquiryModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function submitInquiry(event) {
    event.preventDefault();
    const name = document.getElementById('atasanName').value;
    const subject = document.getElementById('subject').value;

    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    setTimeout(() => {
        alert(`Inquiry sent to ${name} successfully!\nSubject: ${subject}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
        closeInquiryModal();
        document.getElementById('inquiryForm').reset();
    }, 1500);
}

// Modal: Create/Edit Approver Logic
function openCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        document.getElementById('createForm').reset();
        document.getElementById('editApproverId').value = '';
        document.getElementById('createModalTitle').textContent = 'Register New Approver';

        const submitBtn = document.querySelector('#createForm button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register Approver';

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function openEditModal(id) {
    const modal = document.getElementById('createModal');
    const data = getData();
    const user = (data.companyApprovers || []).find(u => u.id === id);

    if (modal && user) {
        document.getElementById('createModalTitle').textContent = 'Edit Profile: ' + user.name;
        document.getElementById('editApproverId').value = user.id;
        document.getElementById('newApproverName').value = user.name;
        document.getElementById('newApproverPosition').value = user.position || '';
        document.getElementById('newApproverEmail').value = user.email || '';

        const submitBtn = document.querySelector('#createForm button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function submitCreateApprover(event) {
    event.preventDefault();
    const editId = document.getElementById('editApproverId').value;
    const name = document.getElementById('newApproverName').value;
    const pos = document.getElementById('newApproverPosition').value;
    const email = document.getElementById('newApproverEmail').value;

    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${editId ? 'Saving...' : 'Registering...'}`;
    btn.disabled = true;

    setTimeout(() => {
        const data = getData();

        if (editId) {
            // Update existing in Company Approvers bucket
            const index = (data.companyApprovers || []).findIndex(u => u.id == editId);
            if (index !== -1) {
                data.companyApprovers[index].name = name;
                data.companyApprovers[index].position = pos;
                data.companyApprovers[index].email = email;
            }
        } else {
            // Create new in Company Approvers bucket
            const existingIds = (data.companyApprovers || []).map(u => u.id);
            const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1001;
            const newApprover = {
                id: newId,
                name: name,
                position: pos,
                email: email
            };
            if (!data.companyApprovers) data.companyApprovers = [];
            data.companyApprovers.push(newApprover);
        }

        saveData(data);
        alert(editId ? `Success: Changes saved for ${name}` : `Success: Registered ${name} as Approver`);

        btn.innerHTML = originalText;
        btn.disabled = false;
        closeCreateModal();
        document.getElementById('createForm').reset();
        renderApprovers(); // Refresh the list
    }, 1200);
}

// Global scope attachment
window.filterApprovers = filterApprovers;
window.openInquiryModal = openInquiryModal;
window.closeInquiryModal = closeInquiryModal;
window.submitInquiry = submitInquiry;
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeCreateModal = closeCreateModal;
window.submitCreateApprover = submitCreateApprover;

window.onclick = function (event) {
    const inqModal = document.getElementById('inquiryModal');
    const createModal = document.getElementById('createModal');
    if (event.target == inqModal) closeInquiryModal();
    if (event.target == createModal) closeCreateModal();
}
