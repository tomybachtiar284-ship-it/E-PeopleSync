// Public News Logic
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(['employee', 'manager', 'admin', 'candidate']);
    if (!user) return;

    renderModernHeader();
    renderPublicNews();
});

function renderPublicNews() {
    const data = getData();
    const container = document.getElementById('news-grid-container');
    if (!container) return;

    const news = (data.news || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (news.length === 0) {
        container.innerHTML = `
            <div class="glass-card text-center p-5" style="grid-column: 1 / -1;">
                <i class="fas fa-newspaper fa-3x mb-3" style="color: #cbd5e0;"></i>
                <h3>No news yet</h3>
                <p>Check back later for more updates.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = news.map(item => `
        <div class="news-card-public" onclick="openReadModal(${item.id})">
            <div class="news-img-container">
                <img src="${item.image || 'https://via.placeholder.com/400x200?text=Company+News'}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/400x200?text=No+Image';">
            </div>
            <div class="news-body-public">
                <div class="news-badge-public">CORPORATE</div>
                <h3 class="news-title-public">${item.title}</h3>
                <div class="news-meta-public">
                    <span><i class="far fa-calendar-alt"></i> ${formatDate(item.date)}</span>
                    <span><i class="far fa-user"></i> ${item.author}</span>
                </div>
                <p class="news-excerpt-public">${item.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
                <div style="margin-top: 15px; color: var(--premium-blue); font-weight: 700; font-size: 13px;">
                    Read More <i class="fas fa-arrow-right ml-1"></i>
                </div>
            </div>
        </div>
    `).join('');
}

function openReadModal(id) {
    const data = getData();
    const newsItem = data.news.find(n => n.id == id);
    if (!newsItem) return;

    const modal = document.getElementById('readNewsModal');
    if (!modal) return;

    document.getElementById('readImage').src = newsItem.image || 'https://via.placeholder.com/600x400?text=Company+News';
    document.getElementById('readTitle').textContent = newsItem.title;
    document.getElementById('readDate').textContent = formatDate(newsItem.date);
    document.getElementById('readAuthor').textContent = newsItem.author;
    document.getElementById('readContent').textContent = newsItem.content;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeReadModal() {
    const modal = document.getElementById('readNewsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Global scope
window.openReadModal = openReadModal;
window.closeReadModal = closeReadModal;
window.onclick = function (event) {
    const modal = document.getElementById('readNewsModal');
    if (event.target == modal) {
        closeReadModal();
    }
}
