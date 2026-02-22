/**
 * Admin News Management — PostgreSQL API Version
 */

const API = 'http://localhost:3001';
let newsModal, newsForm;
let _newsList = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin', 'manager']);
    newsModal = document.getElementById('newsModal');
    newsForm = document.getElementById('newsForm');
    if (newsForm) newsForm.addEventListener('submit', handleFormSubmit);
    initUserProfile();
    loadNews();
});

// ── Load & Render ─────────────────────────────────────────────
async function loadNews() {
    try {
        const res = await fetch(`${API}/api/news`);
        _newsList = await res.json();
    } catch { _newsList = []; }
    renderNewsTable();
}

function renderNewsTable() {
    const tableBody = document.getElementById('newsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (_newsList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No news available.</td></tr>';
        return;
    }
    const sorted = [..._newsList].sort((a, b) => new Date(b.published_at || b.date) - new Date(a.published_at || a.date));
    sorted.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding:15px;"><img src="${item.image || ''}" alt="Cover" style="width:80px;height:50px;object-fit:cover;border-radius:8px;" onerror="this.src='https://via.placeholder.com/80x50?text=News';"></td>
            <td style="padding:15px;font-weight:600;color:#2D3436;">${item.title}</td>
            <td style="padding:15px;color:#636E72;">${formatDate(item.published_at || item.date)}</td>
            <td style="padding:15px;color:#636E72;">${item.author || '-'}</td>
            <td style="padding:15px;text-align:right;">
                <button onclick="editNews(${item.id})" style="background:none;border:none;color:#0984E3;cursor:pointer;margin-right:10px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteNews(${item.id})" style="background:none;border:none;color:#D63031;cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>`;
        tableBody.appendChild(row);
    });
}

// ── Modal ─────────────────────────────────────────────────────
function openNewsModal() {
    if (!newsModal || !newsForm) return;
    newsModal.style.display = 'block';
    newsForm.reset();
    document.getElementById('newsId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('newsImageData').value = '';
    const modalTitle = newsModal.querySelector('.modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Create News';
}
window.openNewsModal = openNewsModal;

function closeNewsModal() { if (newsModal) newsModal.style.display = 'none'; }
window.closeNewsModal = closeNewsModal;

window.onclick = e => { if (e.target == newsModal) closeNewsModal(); };

function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('newsImageData').value = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}
window.handleImageUpload = handleImageUpload;

// ── CRUD ──────────────────────────────────────────────────────
window.editNews = async function (id) {
    const item = _newsList.find(n => n.id == id);
    if (!item || !newsModal) return;
    openNewsModal();
    const modalTitle = newsModal.querySelector('.modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Edit News';
    document.getElementById('newsId').value = item.id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('newsDate').value = (item.published_at || item.date || '').split('T')[0];
    document.getElementById('newsContent').value = item.content;
    if (item.image) {
        document.getElementById('imagePreview').src = item.image;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('newsImageData').value = item.image;
    }
};

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const date = document.getElementById('newsDate').value;
    const content = document.getElementById('newsContent').value;
    const image = document.getElementById('newsImageData').value;
    if (!title || !date || !content) { alert('Please fill in all required fields.'); return; }
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const author = user ? user.name : 'Admin';
    const payload = { title, content, image, author, published_at: date };
    try {
        if (id) {
            await fetch(`${API}/api/news/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            alert('News updated successfully!');
        } else {
            await fetch(`${API}/api/news`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            alert('News published successfully!');
        }
        closeNewsModal();
        loadNews();
    } catch { alert('Gagal menyimpan berita.'); }
}

window.deleteNews = async function (id) {
    if (!confirm('Are you sure you want to delete this news?')) return;
    try {
        await fetch(`${API}/api/news/${id}`, { method: 'DELETE' });
        loadNews();
    } catch { alert('Gagal menghapus berita.'); }
};

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
