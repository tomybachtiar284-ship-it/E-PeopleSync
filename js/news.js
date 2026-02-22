// Public News Logic
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(['employee', 'manager', 'admin', 'candidate']);
    if (!user) return;

    renderModernHeader();
    renderPublicNews();
});

async function renderPublicNews() {
    const container = document.getElementById('news-grid-container');
    if (!container) return;

    try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error('Failed to fetch news');
        let news = await response.json();

        // Sort by date descending
        news = news.sort((a, b) => new Date(b.published_at || b.date) - new Date(a.published_at || a.date));

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
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(item.published_at || item.date)}</span>
                        <span><i class="far fa-user"></i> ${item.author}</span>
                    </div>
                    <p class="news-excerpt-public">${item.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
                    <div style="margin-top: 15px; color: var(--premium-blue); font-weight: 700; font-size: 13px;">
                        Read More <i class="fas fa-arrow-right ml-1"></i>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching news:', err);
        container.innerHTML = `<div class="alert alert-danger">Error loading news data.</div>`;
    }
}

async function openReadModal(id) {
    const modal = document.getElementById('readNewsModal');
    if (!modal) return;

    try {
        const response = await fetch(`/api/news/${id}`);
        if (!response.ok) throw new Error('Failed to fetch news details');
        const newsItem = await response.json();

        document.getElementById('readImage').src = newsItem.image || 'https://via.placeholder.com/600x400?text=Company+News';
        document.getElementById('readTitle').textContent = newsItem.title;
        document.getElementById('readDate').textContent = formatDate(newsItem.published_at || newsItem.date);
        document.getElementById('readAuthor').textContent = newsItem.author;
        document.getElementById('readContent').textContent = newsItem.content;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('Error opening news item:', err);
        alert('Failed to load news details.');
    }
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
