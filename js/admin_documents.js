/**
 * Admin Documents Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initDocCategories();
    renderDocuments();

    // Search listeners
    const headerSearch = document.getElementById('docSearch');
    const contentSearch = document.getElementById('contentDocSearch');

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        // Sync values
        headerSearch.value = e.target.value;
        contentSearch.value = e.target.value;
        filterDocsBySearch(query);
    };

    headerSearch.addEventListener('input', handleSearch);
    contentSearch.addEventListener('input', handleSearch);
});

function initDocCategories() {
    const data = getData();
    const container = document.getElementById('categoryFilterContainer');
    const select = document.getElementById('docCategory');

    // Select dropdown in modal
    select.innerHTML = '';
    data.docCategories.forEach(cat => {
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
}

function renderDocuments(filteredDocs = null) {
    const data = getData();
    const docs = filteredDocs || data.documents;
    const grid = document.getElementById('docGrid');
    const countSpan = document.getElementById('searchResultCount');

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
                <div class="doc-meta">${doc.version} • ${doc.size}</div>
                <div class="doc-meta">${doc.category}</div>
                ${doc.expiryDate ? `<div class="expiry-badge"><i class="fas fa-clock"></i> Expires: ${formatDate(doc.expiryDate)}</div>` : ''}
            </div>
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
    btns.forEach(b => b.classList.add('btn-secondary'));

    btn.classList.add('active-tab', 'btn-primary');
    btn.classList.remove('btn-secondary');

    const data = getData();
    if (category === 'all') {
        renderDocuments();
    } else {
        const filtered = data.documents.filter(d => d.category === category);
        renderDocuments(filtered);
    }
}

function filterDocsBySearch(query) {
    const data = getData();
    const filtered = data.documents.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.owner.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query)
    );
    renderDocuments(filtered);
}

// Category Management
function addNewCategory() {
    const newCat = prompt("Enter new document category name:");
    if (newCat && newCat.trim() !== "") {
        const data = getData();
        if (!data.docCategories.includes(newCat)) {
            data.docCategories.push(newCat);
            saveData(data);
            initDocCategories(); // Refresh buttons & dropdown
            alert(`Category "${newCat}" added successfully!`);
        } else {
            alert("Category already exists!");
        }
    }
}

// Modal Logic
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadForm');

function showUploadModal() {
    uploadForm.reset();
    document.getElementById('dropzoneText').textContent = 'Drag and drop or click to choose';
    document.getElementById('dropzone').style.borderColor = '#ddd';
    document.getElementById('dropzone').style.background = 'transparent';
    uploadModal.style.display = 'block';
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
    uploadModal.style.display = 'none';
}

uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getData();

    const fileInput = document.getElementById('docFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file first.');
        return;
    }

    const newDoc = {
        id: 'DOC-' + String(data.documents.length + 1).padStart(3, '0'),
        name: document.getElementById('docName').value,
        category: document.getElementById('docCategory').value,
        version: 'v1.0',
        owner: document.getElementById('docOwner').value,
        expiryDate: null,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        type: file.name.split('.').pop().toLowerCase()
    };

    data.documents.push(newDoc);
    saveData(data);
    renderDocuments();
    closeUploadModal();
});

window.onclick = function (event) {
    if (event.target == uploadModal) {
        closeUploadModal();
    }
}
