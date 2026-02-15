/**
 * Admin Assets Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    renderAssets();

    // Search listener
    document.getElementById('assetSearch').addEventListener('input', (e) => {
        filterAssets(e.target.value, document.getElementById('categoryFilter').value);
    });

    // Filter listener
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        filterAssets(document.getElementById('assetSearch').value, e.target.value);
    });
});

function renderAssets(filteredData = null) {
    const data = getData();
    const assets = filteredData || data.assets;
    const tableBody = document.getElementById('assetTableBody');

    tableBody.innerHTML = '';

    assets.forEach(asset => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${asset.id}</strong></td>
            <td>${asset.name}</td>
            <td>${asset.category}</td>
            <td><span class="badge ${getStatusBadgeClass(asset.status)}">${asset.status}</span></td>
            <td>${asset.assignedTo || '-'}</td>
            <td>${asset.dateAssigned ? formatDate(asset.dateAssigned) : '-'}</td>
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
    updateStats(data.assets);
}

function updateStats(assets) {
    document.getElementById('totalAssets').textContent = assets.length;
    document.getElementById('assignedAssets').textContent = assets.filter(a => a.status === 'Assigned').length;
    document.getElementById('availableAssets').textContent = assets.filter(a => a.status === 'Available').length;
    document.getElementById('repairAssets').textContent = assets.filter(a => a.status === 'Repair').length;
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
    const data = getData();
    let filtered = data.assets;

    if (category !== 'all') {
        filtered = filtered.filter(a => a.category === category);
    }

    if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(a =>
            a.name.toLowerCase().includes(query) ||
            a.id.toLowerCase().includes(query) ||
            (a.assignedTo && a.assignedTo.toLowerCase().includes(query))
        );
    }

    renderAssets(filtered);
}

function deleteAsset(id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        const data = getData();
        data.assets = data.assets.filter(a => a.id !== id);
        saveData(data);
        renderAssets();
    }
}

// Modal & Form Logic
const assetModal = document.getElementById('assetModal');
const assetForm = document.getElementById('assetForm');

function showAddAssetModal() {
    initEmployeeDropdown();
    document.getElementById('modalTitle').textContent = 'Add New Asset';
    document.getElementById('editId').value = '';
    assetForm.reset();
    assetModal.style.display = 'block';
}

function initEmployeeDropdown(selectedName = '') {
    const data = getData();
    const select = document.getElementById('assetAssignedTo');
    select.innerHTML = '<option value="">- Unassigned -</option>';

    // Filter active employees
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role) && u.activeStatus !== 'Resign');

    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.name;
        option.textContent = emp.name;
        if (emp.name === selectedName) option.selected = true;
        select.appendChild(option);
    });
}

function editAsset(id) {
    const data = getData();
    const asset = data.assets.find(a => a.id === id);
    if (!asset) return;

    initEmployeeDropdown(asset.assignedTo);
    document.getElementById('modalTitle').textContent = 'Edit Asset: ' + id;
    document.getElementById('editId').value = asset.id;
    document.getElementById('assetName').value = asset.name;
    document.getElementById('assetCategory').value = asset.category;
    document.getElementById('assetStatus').value = asset.status;
    document.getElementById('assetAssignedTo').value = asset.assignedTo || '';

    assetModal.style.display = 'block';
}

function closeAssetModal() {
    assetModal.style.display = 'none';
}

assetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getData();
    const editId = document.getElementById('editId').value;

    const assetData = {
        name: document.getElementById('assetName').value,
        category: document.getElementById('assetCategory').value,
        status: document.getElementById('assetStatus').value,
        assignedTo: document.getElementById('assetAssignedTo').value || null,
        dateAssigned: document.getElementById('assetAssignedTo').value ? new Date().toISOString().split('T')[0] : null
    };

    if (editId) {
        // Edit
        const index = data.assets.findIndex(a => a.id === editId);
        data.assets[index] = { ...data.assets[index], ...assetData };
    } else {
        // Add
        const newId = 'AST-' + String(data.assets.length + 1).padStart(3, '0');
        data.assets.push({ id: newId, ...assetData });
    }

    saveData(data);
    renderAssets();
    closeAssetModal();
});

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == assetModal) {
        closeAssetModal();
    }
}
