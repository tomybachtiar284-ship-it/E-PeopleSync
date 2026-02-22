/**
 * Admin Org Chart Logic
 */

const API = 'http://localhost:3001';
let allEmployees = [];
let allDepartments = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initDeptFilter();
    renderOrgChart();

    // Search listener
    document.getElementById('chartSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchChart(query);
    });
});

async function loadData() {
    try {
        const [empRes, setRes] = await Promise.all([
            fetch(`${API}/api/employees`),
            fetch(`${API}/api/settings`)
        ]);
        allEmployees = await empRes.json();
        const settings = await setRes.json();
        allDepartments = settings.departments || [];
    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

function initDeptFilter() {
    const select = document.getElementById('deptFilter');
    if (!select) return;

    select.innerHTML = '<option value="all">All Departments</option>';
    allDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
}

function renderOrgChart(filteredDept = 'all') {
    const employees = allEmployees.filter(u => ['employee', 'manager', 'admin'].includes(u.role));
    const treeContainer = document.getElementById('orgTree');
    if (!treeContainer) return;

    // Root = those with no manager_id AND no supervisor_name (or is admin)
    const roots = employees.filter(e =>
        (!e.manager_id && (!e.supervisor_name || e.supervisor_name === '')) ||
        e.role === 'admin'
    );

    // Deduplicate roots
    const seen = new Set();
    const uniqueRoots = roots.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

    if (uniqueRoots.length === 0 && employees.length > 0) {
        const adminRoot = employees.find(e => e.role === 'admin');
        if (adminRoot) uniqueRoots.push(adminRoot);
    }

    if (uniqueRoots.length === 0) {
        treeContainer.innerHTML = '<div class="alert alert-warning">No root employees found.</div>';
        return;
    }

    treeContainer.innerHTML = '';
    const rootUl = document.createElement('ul');

    uniqueRoots.forEach(root => {
        const node = buildNode(root, employees, filteredDept);
        if (node) rootUl.appendChild(node);
    });

    if (rootUl.childNodes.length === 0) {
        treeContainer.innerHTML = `<div style="text-align:center;color:#888;padding:40px;">No employees for "${filteredDept}".</div>`;
    } else {
        treeContainer.appendChild(rootUl);
    }
}

function buildNode(emp, employees, filterDept) {
    const li = document.createElement('li');

    const descendants = getDescendants(emp, employees);
    const matchesFilter = filterDept === 'all' || emp.department === filterDept || descendants.some(d => d.department === filterDept);
    if (!matchesFilter) return null;

    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node' + (emp.status === 'Vacancy' ? ' vacancy' : '');
    nodeDiv.id = `node-${emp.id}`;

    // Use manager_id (primary) OR supervisor_name (fallback) to find direct reports
    const directReports = employees.filter(e =>
        (e.manager_id && e.manager_id == emp.id) ||
        (!e.manager_id && e.supervisor_name && (e.supervisor_name == emp.id || e.supervisor_name == emp.name))
    );

    nodeDiv.innerHTML = `
        <img src="${emp.avatar || 'https://i.pravatar.cc/150?u=' + emp.id}" class="node-img">
        <span class="node-name">${emp.name}</span>
        <span class="node-role">${emp.position || 'Staff'}</span>
        <span class="node-dept">${emp.department || 'General'}</span>
        <div class="node-reports">${directReports.length} Direct Reports</div>
    `;

    nodeDiv.onclick = (e) => {
        e.stopPropagation();
        showProfileModal(emp, directReports.length);
    };

    li.appendChild(nodeDiv);

    if (directReports.length > 0) {
        const ul = document.createElement('ul');
        directReports.forEach(child => {
            const childNode = buildNode(child, employees, filterDept);
            if (childNode) ul.appendChild(childNode);
        });
        if (ul.childNodes.length > 0) li.appendChild(ul);
    }

    return li;
}

function getDescendants(emp, employees) {
    let list = [];
    const children = employees.filter(e => e.supervisor_name == emp.id || e.supervisor_name == emp.name);
    list = list.concat(children);
    children.forEach(child => {
        list = list.concat(getDescendants(child, employees));
    });
    return list;
}

function filterChartByDept() {
    const dept = document.getElementById('deptFilter').value;
    renderOrgChart(dept);
}

function searchChart(query) {
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(n => {
        n.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        n.style.borderColor = '#ddd';
    });

    if (query.trim() === '') return;

    const match = Array.from(nodes).find(n => n.innerText.toLowerCase().includes(query));
    if (match) {
        match.style.borderColor = 'var(--premium-blue)';
        match.style.boxShadow = '0 0 15px rgba(75, 108, 183, 0.5)';
        match.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

// Modal Logic
function showProfileModal(emp, reportCount) {
    document.getElementById('modalImg').src = emp.avatar || 'https://i.pravatar.cc/150?u=' + emp.id;
    document.getElementById('modalName').textContent = emp.name;
    document.getElementById('modalRole').textContent = emp.position || 'Staff';
    document.getElementById('modalEmail').textContent = emp.email || emp.username || 'n/a';
    document.getElementById('modalDept').textContent = emp.department || 'General';
    document.getElementById('modalReports').textContent = reportCount;
    document.getElementById('modalEmpId').value = emp.id;

    document.getElementById('profileModal').style.display = 'block';
}

function goToFullProfile() {
    const empId = document.getElementById('modalEmpId').value;
    if (empId) {
        window.location.href = `employees.html?id=${empId}`;
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Global functions for buttons
function exportChart() {
    const tree = document.getElementById('orgTree');
    if (!tree) return;

    // Show loading state (optional, but good for UX)
    const btn = document.querySelector('button[onclick="exportChart()"]');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    html2canvas(tree, {
        backgroundColor: '#f8f9fa',
        scale: 2, // Higher quality
        useCORS: true, // In case of external images
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `E-PeopleSync_OrgChart_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore button
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }).catch(err => {
        console.error('Export failed:', err);
        alert('Gagal mengekspor bagan. Silakan coba lagi.');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    });
}

function recenterChart() {
    const container = document.getElementById('zoomContainer');
    const rootNode = container.querySelector('.node'); // Target the top node
    if (!container || !rootNode) return;

    // Visual feedback
    const btn = document.querySelector('button[title="Recenter"]');
    if (btn) {
        btn.style.background = '#e0f2f1';
        setTimeout(() => btn.style.background = '', 300);
    }

    const containerRect = container.getBoundingClientRect();
    const nodeRect = rootNode.getBoundingClientRect();

    // The scroll position that centers the node in the container
    const relativeLeft = nodeRect.left - containerRect.left + container.scrollLeft;
    const centerOffset = (container.clientWidth / 2) - (nodeRect.width / 2);
    const targetX = relativeLeft - centerOffset;

    container.scrollTo({
        left: targetX,
        top: 0,
        behavior: 'smooth'
    });
}

// Add Position Logic
function addNewNode() {
    const deptSelect = document.getElementById('newNodeDept');
    const supervisorSelect = document.getElementById('newNodeSupervisor');

    // Populate Departments
    deptSelect.innerHTML = '';
    allDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
    });

    // Populate Supervisors (Filter for potential managers/supervisors)
    supervisorSelect.innerHTML = '<option value="">-- No Supervisor (Root) --</option>';
    const supervisors = allEmployees.filter(u => ['admin', 'manager', 'employee'].includes(u.role) && u.status !== 'Vacancy');
    supervisors.forEach(s => {
        const option = document.createElement('option');
        option.value = s.name; // Keep name to link back using supervisor_name
        option.textContent = `${s.name} (${s.position || s.role})`;
        supervisorSelect.appendChild(option);
    });

    document.getElementById('addNodeModal').style.display = 'block';
}

function closeAddNodeModal() {
    document.getElementById('addNodeModal').style.display = 'none';
    document.getElementById('addNodeForm').reset();
}

// Handle Add Node Form
document.getElementById('addNodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('newNodeName').value;
    const role = document.getElementById('newNodeRole').value;
    const dept = document.getElementById('newNodeDept').value;
    const supervisor = document.getElementById('newNodeSupervisor').value;

    const newNode = {
        name: name || 'Vacant Position',
        position: role,
        department: dept,
        supervisor_name: supervisor || null,
        status: name ? 'Active' : 'Vacancy',
        role: 'employee',
        // default password if creating an actual user
        password: 'password123',
        username: name ? name.toLowerCase().replace(/\\s+/g, '') + Date.now().toString().slice(-4) : 'vacant' + Date.now().toString().slice(-4)
    };

    try {
        const res = await fetch(`${API}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNode)
        });

        if (res.ok) {
            closeAddNodeModal();
            await loadData(); // refresh
            renderOrgChart(); // render
            alert('New position successfully added to the hierarchy!');
        } else {
            const errorData = await res.json();
            alert('Failed to add position: ' + (errorData.error || 'Server error'));
        }
    } catch (err) {
        console.error('Failed to add position:', err);
        alert('Failed to add position.');
    }
});

window.onclick = function (event) {
    if (event.target == document.getElementById('profileModal')) {
        closeProfileModal();
    }
    if (event.target == document.getElementById('addNodeModal')) {
        closeAddNodeModal();
    }
}
