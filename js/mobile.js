/**
 * Mobile Interface Logic for E-PeopleSync
 */

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(['employee', 'manager', 'admin']);
    if (!user) return;

    // Initialize UI
    initMobileUI(user);
    updateTime();
    setInterval(updateTime, 60000); // Update clock every minute
});

function initMobileUI(user) {
    const data = getData();

    // 1. Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17) greeting = "Good Evening";

    document.querySelector('.greeting-prefix').textContent = greeting;
    document.getElementById('userGreetingName').textContent = user.name;

    // 2. Navigation & Profile Images
    const userAvatar = user.avatar || `https://i.pravatar.cc/150?u=${user.id}`;
    document.getElementById('navAvatar').src = userAvatar;

    // 3. Render Leaderboard (Winners)
    renderWinners(data, user);
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = timeStr;
}

/**
 * Switch between different views (Home, Stats, etc.)
 */
function switchView(viewId, el) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    // Update active view
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(viewId + 'View');
    if (targetView) {
        targetView.classList.add('active');
    } else {
        // Fallback or placeholder for other views
        console.log(`View ${viewId} is under construction`);
        // Just keep Home for now if not implemented
        if (viewId === 'home') document.getElementById('homeView').classList.add('active');
    }
}

/**
 * Feature Navigation
 */
function navigateTo(feature) {
    switch (feature) {
        case 'attendance':
            window.location.href = '../admin/attendance.html'; // In real app, this would be a specialized mobile attendance page
            break;
        case 'leave':
            // Logic to open leave modal or redirect
            alert('Opening Leave Request Form...');
            break;
        case 'learning':
            window.location.href = '../learning/index.html';
            break;
        case 'stats':
            // Move to winners screen manually
            const statsNavItem = document.querySelector('.nav-item:nth-child(4)');
            switchView('stats', statsNavItem);
            break;
        default:
            alert(`${feature.toUpperCase()} feature coming soon!`);
    }
}

/**
 * Render Ranking List
 */
function renderWinners(data, currentUser) {
    const listContainer = document.getElementById('rankingListContainer');
    if (!listContainer) return;

    // Simulate ranking data based on real evaluations or random if empty
    const employees = data.users.filter(u => ['employee', 'manager'].includes(u.role));

    // Mapping evaluations to ranking items
    const rankings = employees.map(emp => {
        const evaluation = data.evaluations ? data.evaluations.find(e => e.userId === emp.id) : null;
        return {
            id: emp.id,
            name: emp.name,
            points: evaluation ? Math.round(evaluation.radarData.reduce((a, b) => a + b, 0) * 10) : Math.floor(Math.random() * 5000) + 1000,
            avatar: emp.avatar || `https://i.pravatar.cc/100?u=${emp.id}`
        };
    }).sort((a, b) => b.points - a.points);

    // Render podium (Top 3)
    const top3 = rankings.slice(0, 3);
    const podiumItems = document.querySelectorAll('.podium-item');

    // Sort podium by second, first, third (matching HTML layout)
    const layoutOrder = [top3[1], top3[0], top3[2]];

    podiumItems.forEach((item, idx) => {
        const pData = layoutOrder[idx];
        if (pData) {
            item.querySelector('img').src = pData.avatar;
            item.querySelector('.podium-name').textContent = pData.name.split(' ')[0];
            item.querySelector('.podium-pts').textContent = `${pData.points} Pts`;
        }
    });

    // Render remaining list (excluding top 3)
    listContainer.innerHTML = rankings.slice(3, 10).map((p, idx) => `
        <div class="rank-item">
            <span class="rank-num">${idx + 4}</span>
            <img src="${p.avatar}" class="rank-avatar">
            <span class="rank-name">${p.name}</span>
            <span class="rank-pts">${p.points} Pts</span>
        </div>
    `).join('');

    // Update current user rank
    const myRank = rankings.findIndex(r => r.id === currentUser.id) + 1;
    const myData = rankings.find(r => r.id === currentUser.id);
    const currUserEl = document.querySelector('.rank-item.current-user');
    if (currUserEl && myData) {
        currUserEl.querySelector('.rank-num').textContent = myRank;
        currUserEl.querySelector('.rank-avatar').src = myData.avatar;
        currUserEl.querySelector('.rank-name').textContent = `${myData.name} (You)`;
        currUserEl.querySelector('.rank-pts').textContent = `${myData.points} Pts`;
    }
}
