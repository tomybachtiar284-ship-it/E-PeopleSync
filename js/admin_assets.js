/**
 * Admin Assets Logic
 */

const API = 'http://localhost:3001';
let allAssets = [];

document.addEventListener('DOMContentLoaded', () => {
    loadAssets();

    // Search listener
    document.getElementById('assetSearch').addEventListener('input', (e) => {
        filterAssets(e.target.value, document.getElementById('categoryFilter').value);
    });

    // Filter listener
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        filterAssets(document.getElementById('assetSearch').value, e.target.value);
    });
});

async function loadAssets() {
    try {
        const response = await fetch(`${API}/api/assets`);
        allAssets = await response.json();
        renderAssets();
    } catch (err) {
        console.error('Failed to load assets:', err);
    }
}

function renderAssets(filteredData = null) {
    const assets = filteredData || allAssets;
    const tableBody = document.getElementById('assetTableBody');

    if (!tableBody) return;
    tableBody.innerHTML = '';

    assets.forEach(asset => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${asset.id}</strong></td>
            <td>${asset.name}</td>
            <td>${asset.category}</td>
            <td><span class="badge ${getStatusBadgeClass(asset.status)}">${asset.status}</span></td>
            <td>${asset.assigned_to || '-'}</td>
            <td>${asset.date_assigned ? formatDate(asset.date_assigned) : '-'}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-secondary" onclick="editAsset('${asset.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAsset('${asset.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Update Stats
    updateStats(allAssets); // Stats usually show based on all assets
}

function updateStats(assets) {
    const elTotal = document.getElementById('totalAssets');
    const elAssigned = document.getElementById('assignedAssets');
    const elAvailable = document.getElementById('availableAssets');
    const elRepair = document.getElementById('repairAssets');

    if (elTotal) elTotal.textContent = assets.length;
    if (elAssigned) elAssigned.textContent = assets.filter(a => a.status === 'Assigned').length;
    if (elAvailable) elAvailable.textContent = assets.filter(a => a.status === 'Available').length;
    if (elRepair) elRepair.textContent = assets.filter(a => a.status === 'Repair').length;
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Available': return 'badge-success';
        case 'Assigned': return 'badge-info';
        case 'Repair': return 'badge-warning';
        case 'Retired': return 'badge-secondary';
        default: return 'badge-secondary';
    }
}

function filterAssets(search, category) {
    let filtered = allAssets;

    if (category !== 'all') {
        filtered = filtered.filter(a => a.category === category);
    }

    if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(a =>
            a.name.toLowerCase().includes(query) ||
            a.id.toLowerCase().includes(query) ||
            (a.assigned_to && a.assigned_to.toLowerCase().includes(query))
        );
    }

    renderAssets(filtered);
}

async function deleteAsset(id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        try {
            const res = await fetch(`${API}/api/assets/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadAssets(); // refresh Data
            } else {
                alert('Failed to delete asset');
            }
        } catch (err) {
            console.error('Delete error', err);
        }
    }
}

// Modal & Form Logic
const assetModal = document.getElementById('assetModal');
const assetForm = document.getElementById('assetForm');

function showAddAssetModal() {
    initEmployeeDropdown();
    document.getElementById('modalTitle').textContent = 'Add New Asset';
    document.getElementById('editId').value = '';

    // In PostgreSQL, ID is not auto-incrementing integer, it's string AST-... The backend doesn't seem to generate it, actually let's look at backend POST:
    // It takes `id` from body: `const { id, name, category... } = req.body;`
    // Wait, the backend does not auto-generate the AST-xxx ID, so we must generate it here.
    const newId = 'AST-' + String(allAssets.length + 1).padStart(3, '0');
    // Store in hidden field or just let form submit handle it if editId is empty
    assetForm.reset();
    assetModal.style.display = 'block';
}

async function initEmployeeDropdown(selectedName = '') {
    try {
        const res = await fetch(`${API}/api/employees`);
        const users = await res.json();

        const select = document.getElementById('assetAssignedTo');
        if (!select) return;

        select.innerHTML = '<option value="">- Unassigned -</option>';

        // Filter active employees
        const employees = users.filter(u => ['employee', 'manager'].includes(u.role) && u.status !== 'Resign');

        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            if (emp.name === selectedName) option.selected = true;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load employees:', err);
    }
}

function editAsset(id) {
    const asset = allAssets.find(a => a.id === id);
    if (!asset) return;

    initEmployeeDropdown(asset.assigned_to);
    document.getElementById('modalTitle').textContent = 'Edit Asset: ' + id;
    document.getElementById('editId').value = asset.id;
    document.getElementById('assetName').value = asset.name;
    document.getElementById('assetCategory').value = asset.category;
    document.getElementById('assetStatus').value = asset.status;
    // assetAssignedTo value will be set inside initEmployeeDropdown once it finishes loading...
    // To handle async correctly:
    setTimeout(() => {
        const select = document.getElementById('assetAssignedTo');
        if (select) select.value = asset.assigned_to || '';
    }, 500);

    assetModal.style.display = 'block';
}

function closeAssetModal() {
    assetModal.style.display = 'none';
}

if (assetForm) {
    assetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editId').value;
        const assignedTo = document.getElementById('assetAssignedTo').value;

        const assetData = {
            name: document.getElementById('assetName').value,
            category: document.getElementById('assetCategory').value,
            status: document.getElementById('assetStatus').value,
            assigned_to: assignedTo || null,
            date_assigned: assignedTo ? new Date().toISOString().split('T')[0] : null
        };

        try {
            if (editId) {
                // Edit
                const res = await fetch(`${API}/api/assets/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assetData)
                });
                if (!res.ok) throw new Error('Update failed');
            } else {
                // Add
                assetData.id = 'AST-' + String(allAssets.length + 1).padStart(3, '0');
                const res = await fetch(`${API}/api/assets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assetData)
                });
                if (!res.ok) throw new Error('Add failed');
            }

            await loadAssets();
            closeAssetModal();
        } catch (err) {
            console.error('Asset submit error:', err);
            alert('Failed to save asset.');
        }
    });
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == assetModal) {
        closeAssetModal();
    }
}

