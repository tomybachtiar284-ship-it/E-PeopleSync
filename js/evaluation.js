/**
 * Evaluation Module Logic
 * Handles KPI Charts and Manager Evaluations.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['employee', 'manager', 'admin']);
    loadEvaluationData();

    // Check if user is manager to show add evaluation button
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.role === 'manager' || user.role === 'admin') {
        const adminControls = document.getElementById('adminControls');
        if (adminControls) adminControls.style.display = 'block';
    }
});

function loadEvaluationData() {
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

    // Load Evaluation History List
    const historyList = document.getElementById('evaluationHistory');
    const data = getData();
    // Filter evaluations for this user (or all if manager/admin - simplified for demo)
    const userEvals = data.evaluations.filter(e => e.employeeId === user.id || user.role !== 'employee');

    if (historyList) {
        historyList.innerHTML = '';
        if (userEvals.length === 0) {
            historyList.innerHTML = '<p>No evaluations found.</p>';
        } else {
            userEvals.forEach(ev => {
                const employee = data.users.find(u => u.id === ev.employeeId);
                const manager = data.users.find(u => u.id === ev.managerId);

                const div = document.createElement('div');
                div.className = 'card mb-3';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <h4>Date: ${formatDate(ev.date)}</h4>
                        <span class="badge badge-info">Score: ${ev.kpiScore}</span>
                    </div>
                    ${user.role !== 'employee' ? `<p><strong>Employee:</strong> ${employee ? employee.name : 'Unknown'}</p>` : ''}
                    <p><strong>Evaluator:</strong> ${manager ? manager.name : 'Unknown'}</p>
                    <p><strong>Comments:</strong> ${ev.comments}</p>
                `;
                historyList.appendChild(div);
            });
        }
    }
}

// Function to handle new evaluation submission
function submitEvaluation(e) {
    if (e) e.preventDefault();

    const employeeId = document.getElementById('employeeSelect').value;
    const score = document.getElementById('scoreInput').value;
    const comments = document.getElementById('commentsInput').value;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const data = getData();
    const newEval = {
        id: Date.now(),
        employeeId: parseInt(employeeId),
        managerId: currentUser.id,
        kpiScore: parseInt(score),
        comments: comments,
        date: new Date().toISOString()
    };

    data.evaluations.push(newEval);
    saveData(data);

    alert('Evaluation Submitted!');
    window.location.reload();
}

// Initialize Add Evaluation Form
const evalForm = document.getElementById('evaluationForm');
if (evalForm) {
    evalForm.addEventListener('submit', submitEvaluation);

    // Populate Employee Select
    const select = document.getElementById('employeeSelect');
    const data = getData();
    const employees = data.users.filter(u => u.role === 'employee');

    employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.name;
        select.appendChild(opt);
    });
}
