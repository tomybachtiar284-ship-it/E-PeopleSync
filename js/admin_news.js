// Admin News Logic
let newsModal, newsForm;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['admin', 'manager']); // Restrict access

    // Initialize Global Elements
    newsModal = document.getElementById('newsModal');
    newsForm = document.getElementById('newsForm');

    if (newsForm) {
        newsForm.addEventListener('submit', handleFormSubmit);
    }

    initNewsPage();
});

function initNewsPage() {
    renderNewsTable();
}

// --------------------------------------------------------------------------------
// Render Table
// --------------------------------------------------------------------------------
function renderNewsTable() {
    const data = getData();
    const tableBody = document.getElementById('newsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!data.news || data.news.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No news available.</td></tr>';
        return;
    }

    // Sort by Date Descending
    const sortedNews = [...data.news].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedNews.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 15px;"><img src="${item.image}" alt="Cover" style="width: 80px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.onerror=null; this.src='https://via.placeholder.com/80x50?text=No+Image';"></td>
            <td style="padding: 15px; font-weight: 600; color: #2D3436;">${item.title}</td>
            <td style="padding: 15px; color: #636E72;">${formatDate(item.date)}</td>
            <td style="padding: 15px; color: #636E72;">${item.author}</td>
            <td style="padding: 15px; text-align: right;">
                <button onclick="editNews(${item.id})" style="background: none; border: none; color: #0984E3; cursor: pointer; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteNews(${item.id})" style="background: none; border: none; color: #D63031; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --------------------------------------------------------------------------------
// Modal & Form Handling
// --------------------------------------------------------------------------------
function openNewsModal() {
    if (!newsModal || !newsForm) return;

    newsModal.style.display = 'block';
    newsForm.reset();
    document.getElementById('newsId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('newsImageData').value = '';

    // Reset modal title
    const modalTitle = newsModal.querySelector('.modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Create News';
}
window.openNewsModal = openNewsModal;

function closeNewsModal() {
    if (newsModal) newsModal.style.display = 'none';
}
window.closeNewsModal = closeNewsModal;

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == newsModal) {
        closeNewsModal();
    }
}

// Handle Image Upload
function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('newsImageData').value = e.target.result; // Store Base64
        }
        reader.readAsDataURL(input.files[0]);
    }
}
window.handleImageUpload = handleImageUpload;

// --------------------------------------------------------------------------------
// CRUD Operations
// --------------------------------------------------------------------------------

// Edit News
window.editNews = function (id) {
    const data = getData();
    const newsItem = data.news.find(n => n.id == id); // Use == for comparison
    if (newsItem && newsModal) {
        openNewsModal(); // Reuse open logic for UI reset

        // Change title to Edit
        const modalTitle = newsModal.querySelector('.modal-header h2');
        if (modalTitle) modalTitle.textContent = 'Edit News';

        document.getElementById('newsId').value = newsItem.id;
        document.getElementById('newsTitle').value = newsItem.title;
        document.getElementById('newsDate').value = newsItem.date;
        document.getElementById('newsContent').value = newsItem.content;

        // Handle Image
        if (newsItem.image) {
            document.getElementById('imagePreview').src = newsItem.image;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('newsImageData').value = newsItem.image;
        }
    }
};

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const date = document.getElementById('newsDate').value;
    const content = document.getElementById('newsContent').value;
    const image = document.getElementById('newsImageData').value;

    if (!title || !date || !content) {
        alert('Please fill in all required fields.');
        return;
    }

    const data = getData();
    if (!data.news) data.news = [];

    // Get Current User for Author
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const author = currentUser ? currentUser.name : 'Admin';

    if (id) {
        // Update
        const index = data.news.findIndex(n => n.id == id);
        if (index !== -1) {
            data.news[index] = {
                ...data.news[index],
                title,
                date,
                content,
                image: image || data.news[index].image, // Keep old image if no new one
                author
            };
            alert('News updated successfully!');
        }
    } else {
        // Create
        const newNews = {
            id: Date.now(),
            title,
            date,
            content,
            image: image || 'https://via.placeholder.com/600x400?text=News+Image',
            author
        };
        data.news.push(newNews);
        alert('News published successfully!');
    }

    saveData(data);
    closeNewsModal();
    renderNewsTable();
}

// Delete News
window.deleteNews = function (id) {
    if (confirm('Are you sure you want to delete this news?')) {
        const data = getData();
        data.news = data.news.filter(n => n.id != id); // Filter out the ID correctly
        saveData(data);
        renderNewsTable();
    }
};
