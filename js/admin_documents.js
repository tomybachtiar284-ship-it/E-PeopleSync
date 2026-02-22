/**
 * Admin Documents Logic
 */

const API = 'http://localhost:3001';
let allDocuments = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initDocCategories();
    renderDocuments();

    // Search listeners
    const headerSearch = document.getElementById('docSearch');
    const contentSearch = document.getElementById('contentDocSearch');

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        // Sync values
        if (headerSearch) headerSearch.value = e.target.value;
        if (contentSearch) contentSearch.value = e.target.value;
        filterDocsBySearch(query);
    };

    if (headerSearch) headerSearch.addEventListener('input', handleSearch);
    if (contentSearch) contentSearch.addEventListener('input', handleSearch);
});

async function loadData() {
    try {
        const [docRes, setRes] = await Promise.all([
            fetch(`${API}/api/documents`),
            fetch(`${API}/api/settings`)
        ]);
        allDocuments = await docRes.json();
        const settings = await setRes.json();
        allCategories = settings.doc_categories || [];
    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

function initDocCategories() {
    const container = document.getElementById('categoryFilterContainer');
    const select = document.getElementById('docCategory');
    if (!container || !select) return;

    // Select dropdown in modal
    select.innerHTML = '';

    // Clear tabs except the 'All' and '+ Add' if they exist, or just completely rebuild tabs
    // The original appends to container, meaning 'All' is hardcoded in HTML or we just clear and add.
    // Original HTML had: <button class="btn btn-sm btn-primary active-tab">All</button>
    container.innerHTML = '<button class="btn btn-sm btn-primary active-tab" onclick="filterDocsByCategory(\'all\', this)">All</button>';

    allCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);

        // Sidebar tabs
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-secondary';
        btn.textContent = cat;
        btn.onclick = () => filterDocsByCategory(cat, btn);
        container.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm btn-outline-primary';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
    addBtn.onclick = addNewCategory;
    container.appendChild(addBtn);
}

function renderDocuments(filteredDocs = null) {
    const docs = filteredDocs || allDocuments;
    const grid = document.getElementById('docGrid');
    const countSpan = document.getElementById('searchResultCount');
    if (!grid) return;

    grid.innerHTML = '';
    if (countSpan) countSpan.textContent = `Showing ${docs.length} document${docs.length !== 1 ? 's' : ''}`;

    if (docs.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">No documents found.</div>';
        return;
    }

    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'doc-item card';

        div.innerHTML = `
            <i class="fas ${getFileIcon(doc.type)} file-icon ${getFileIconClass(doc.type)}"></i>
            <div class="doc-info">
                <span class="doc-name" title="${doc.name}">${doc.name}</span>
                <div class="doc-meta">${doc.version || 'v1.0'} • ${doc.size || 'Unknown'}</div>
                <div class="doc-meta">${doc.category}</div>
                ${doc.expiry_date ? `<div class="expiry-badge"><i class="fas fa-clock"></i> Expires: ${formatDate(doc.expiry_date)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger doc-delete-btn" style="position: absolute; top: 10px; right: 10px; padding: 2px 5px;" onclick="event.stopPropagation(); deleteDocument('${doc.id}')"><i class="fas fa-trash"></i></button>
        `;

        div.onclick = () => alert('Previewing: ' + doc.name);
        grid.appendChild(div);
    });
}

function getFileIcon(type) {
    switch (type) {
        case 'pdf': return 'fa-file-pdf';
        case 'jpg':
        case 'png': return 'fa-file-image';
        case 'docx':
        case 'doc': return 'fa-file-word';
        default: return 'fa-file-alt';
    }
}

function getFileIconClass(type) {
    switch (type) {
        case 'pdf': return 'file-pdf';
        case 'jpg':
        case 'png': return 'file-img';
        default: return 'file-doc';
    }
}

function filterDocsByCategory(category, btn) {
    // UI update
    const btns = document.querySelectorAll('#categoryFilterContainer button');
    btns.forEach(b => b.classList.remove('active-tab', 'btn-primary'));
    btns.forEach(b => {
        if (!b.classList.contains('btn-outline-primary')) {
            b.classList.add('btn-secondary');
        }
    });

    btn.classList.add('active-tab', 'btn-primary');
    btn.classList.remove('btn-secondary');

    if (category === 'all') {
        renderDocuments();
    } else {
        const filtered = allDocuments.filter(d => d.category === category);
        renderDocuments(filtered);
    }
}

function filterDocsBySearch(query) {
    const filtered = allDocuments.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.owner && d.owner.toLowerCase().includes(query)) ||
        d.id.toLowerCase().includes(query)
    );
    renderDocuments(filtered);
}

// Category Management
async function addNewCategory() {
    const newCat = prompt("Enter new document category name:");
    if (newCat && newCat.trim() !== "") {
        if (!allCategories.includes(newCat)) {
            allCategories.push(newCat);

            try {
                await fetch(`${API}/api/settings/doc_categories`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: allCategories })
                });
                initDocCategories(); // Refresh buttons & dropdown
                alert(`Category "${newCat}" added successfully!`);
            } catch (err) {
                console.error(err);
                alert('Failed to add category');
            }
        } else {
            alert("Category already exists!");
        }
    }
}

async function deleteDocument(id) {
    if (confirm('Are you sure you want to delete this document?')) {
        try {
            const res = await fetch(`${API}/api/documents/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadData();
                renderDocuments();
            } else {
                alert('Failed to delete document');
            }
        } catch (err) {
            console.error('Delete error', err);
        }
    }
}

// Modal Logic
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadForm');

function showUploadModal() {
    if (uploadForm) uploadForm.reset();
    const dt = document.getElementById('dropzoneText');
    const dz = document.getElementById('dropzone');
    if (dt) dt.textContent = 'Drag and drop or click to choose';
    if (dz) {
        dz.style.borderColor = '#ddd';
        dz.style.background = 'transparent';
    }
    if (uploadModal) uploadModal.style.display = 'block';
}

function handleFileSelection(input) {
    const file = input.files[0];
    if (file) {
        document.getElementById('dropzoneText').innerHTML = `<strong>Selected:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        document.getElementById('dropzone').style.borderColor = 'var(--primary-color)';
        document.getElementById('dropzone').style.background = '#f0f7ff';
    }
}

// Drag and Drop Logic
const dropzone = document.getElementById('dropzone');
if (dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.style.borderColor = 'var(--primary-color)';
            dropzone.style.background = '#f0f7ff';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            // Only revert if no file is selected
            if (!document.getElementById('docFile').files.length) {
                dropzone.style.borderColor = '#ddd';
                dropzone.style.background = 'transparent';
            }
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('docFile').files = files;
        handleFileSelection(document.getElementById('docFile'));
    }, false);
}

function closeUploadModal() {
    if (uploadModal) uploadModal.style.display = 'none';
}

if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file first.');
            return;
        }

        const newDoc = {
            id: 'DOC-' + String(allDocuments.length + 1).padStart(3, '0'),
            name: document.getElementById('docName').value,
            category: document.getElementById('docCategory').value,
            version: 'v1.0',
            owner: document.getElementById('docOwner').value,
            expiry_date: null,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            type: file.name.split('.').pop().toLowerCase(),
            file_url: null // Local placeholder for now
        };

        try {
            const res = await fetch(`${API}/api/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDoc)
            });

            if (res.ok) {
                await loadData();
                renderDocuments();
                closeUploadModal();
                alert('Document uploaded successfully!');
            } else {
                const errData = await res.json();
                alert('Upload failed: ' + (errData.error || 'Server error'));
            }
        } catch (err) {
            console.error('Document upload error:', err);
            alert('Failed to upload document.');
        }
    });
}

window.onclick = function (event) {
    if (event.target == uploadModal) {
        closeUploadModal();
    }
}
