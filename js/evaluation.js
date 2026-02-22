/**
 * Evaluation Module Logic
 * Handles KPI Charts and Manager Evaluations.
 */

const API = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['employee', 'manager', 'admin']);
    loadEvaluationData();

    // Check if user is manager to show add evaluation button
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.role === 'manager' || user.role === 'admin') {
        const adminControls = document.getElementById('adminControls');
        if (adminControls) adminControls.style.display = 'block';
    }

    initEvalForm();
});

async function loadEvaluationData() {
    const ctx = document.getElementById('kpiChart');
    if (!ctx) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));

    // In a real app, we would fetch specific history for the user
    // Here we use dummy data for visualization
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Communication', 'Teamwork', 'Technical Skill', 'Punctuality', 'Initiative'],
            datasets: [{
                label: 'Competency Score (0-100)',
                data: [85, 90, 75, 95, 80],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    try {
        // Load Evaluation History List
        let url = `${API}/api/evaluations`;
        if (user.role === 'employee') {
            url += `?userId=${user.id}`;
        }

        const [evalsRes, empRes] = await Promise.all([
            fetch(url),
            fetch(`${API}/api/employees`)
        ]);

        const userEvals = await evalsRes.json();
        const allEmployees = await empRes.json(); // Needed to fallback for manager names if not joined properly

        const historyList = document.getElementById('historyList');
        if (historyList) {
            historyList.innerHTML = '';
            if (userEvals.length === 0) {
                historyList.innerHTML = '<p>No evaluations found.</p>';
            } else {
                userEvals.forEach(ev => {
                    const employee = allEmployees.find(u => u.id === ev.user_id) || { name: ev.name }; // .name comes from JOIN in backend

                    const div = document.createElement('div');
                    div.className = 'card mb-3';

                    // Simple logic to extract score from history data to emulate KPI Score if it was stored directly
                    let kpiScore = 'N/A';
                    if (ev.history_data && ev.history_data.length > 0) {
                        kpiScore = (ev.history_data[ev.history_data.length - 1] * 20).toFixed(0);
                    }

                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <h4>Date: ${formatDate(ev.feedback_date || ev.created_at)}</h4>
                            <span class="badge badge-info">Score: ${kpiScore}</span>
                        </div>
                        ${user.role !== 'employee' ? `<p><strong>Employee:</strong> ${employee.name || 'Unknown'}</p>` : ''}
                        <p><strong>Evaluator:</strong> ${ev.feedback_by || 'Unknown'}</p>
                        <p><strong>Comments:</strong> ${ev.feedback_message}</p>
                    `;
                    historyList.appendChild(div);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load evaluation data:', err);
    }
}

// Function to handle new evaluation submission
async function submitEvaluation(e) {
    if (e) e.preventDefault();

    const employeeId = document.getElementById('employeeSelect').value;
    const score = document.getElementById('scoreInput').value;
    const comments = document.getElementById('commentsInput').value;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const newEval = {
        user_id: parseInt(employeeId),
        radar_data: [80, 80, 80, 80, 80, 80],
        history_data: [3.5, 3.6, 3.7, 3.8, 3.9, parseFloat(score) / 20], // Map 0-100 to 0-5
        objectives: [
            { title: 'Goal 1', status: 'On Track', progress: 50, color: '#00796b' }
        ],
        feedback_message: comments,
        feedback_date: new Date().toISOString(),
        feedback_by: currentUser.name,
        period: new Date().getFullYear().toString()
    };

    try {
        const response = await fetch(`${API}/api/evaluations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEval)
        });

        if (response.ok) {
            // NOTIFIKASI KARYAWAN (Assuming createNotification is handled via DB now or still local? In a real app we'd trigger a backend notification here. For now keep frontend function if it exists)
            if (typeof createNotification === 'function') {
                createNotification(parseInt(employeeId), "Feedback Performa Baru", `Manajer ${currentUser.name} telah mengirimkan evaluasi terbaru untuk Anda.`, "performance");
            }
            alert('Evaluation Submitted!');
            window.location.reload();
        } else {
            alert('Failed to submit evaluation.');
        }
    } catch (err) {
        console.error('Evaluation submission error:', err);
        alert('An error occurred submitting the evaluation.');
    }
}

// Initialize Add Evaluation Form
async function initEvalForm() {
    const evalForm = document.getElementById('evaluationForm');
    if (evalForm) {
        evalForm.addEventListener('submit', submitEvaluation);

        try {
            // Populate Employee Select
            const response = await fetch(`${API} / api / employees ? role = employee`);
            const employees = await response.json();
            const select = document.getElementById('employeeSelect');

            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = emp.name;
                select.appendChild(opt);
            });
        } catch (err) {
            console.error('Failed to load employees for select:', err);
        }
    }
}

