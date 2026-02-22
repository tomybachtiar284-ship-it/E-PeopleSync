/**
 * Learning Management System (LMS) Logic
 * Handles Course Listing, Content Viewing, Quizzes, and Certificates.
 */

const API = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('learning/index.html')) {
        // Handled in index.html inline script for now
    } else if (path.includes('learning/course.html')) {
        checkAuth(['employee', 'manager', 'admin', 'candidate']);
        loadCourseDetail();
    }
});

let currentCourseId = null;

async function loadCourseDetail() {
    const params = new URLSearchParams(window.location.search);
    currentCourseId = parseInt(params.get('id')); // Ensure number
    const user = JSON.parse(localStorage.getItem('currentUser'));

    try {
        const [courseRes, modRes, enrRes, quizRes, attemptsRes] = await Promise.all([
            fetch(`${API}/api/learning/courses`),
            fetch(`${API}/api/learning/courses/${currentCourseId}/modules`),
            fetch(`${API}/api/learning/enrollments?courseId=${currentCourseId}&userId=${user.id}`),
            fetch(`${API}/api/learning/quizzes?courseId=${currentCourseId}`),
            fetch(`${API}/api/learning/quiz-attempts?userId=${user.id}`)
        ]);

        const courses = await courseRes.json();
        const modules = await modRes.json();
        const enrollments = await enrRes.json();
        const quizzes = await quizRes.json();
        const allAttempts = attemptsRes.ok ? await attemptsRes.json() : [];

        const course = courses.find(c => c.id === currentCourseId);

        if (!course) {
            alert('Course not found');
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('courseTitle').textContent = course.title;

        const enrollment = enrollments[0];
        const quiz = quizzes[0];
        const attempts = quiz ? allAttempts.filter(a => a.quiz_id === quiz.id) : [];
        const latestAttempt = attempts.sort((a, b) => b.id - a.id)[0]; // Get newest based on ID

        const materialContainer = document.getElementById('materialContainer');
        materialContainer.innerHTML = '';

        // Check if completed (Enrollment status)
        if (enrollment && enrollment.status === 'completed') {
            const score = latestAttempt ? latestAttempt.score : 100; // Fallback
            showCertificate(course, score);
            return;
        }

        // Check if Pending Review
        if (latestAttempt && latestAttempt.status === 'pending_review') {
            document.querySelector('button[onclick="startQuiz()"]').style.display = 'none';
            materialContainer.innerHTML = `
                <div class="alert alert-warning text-center">
                    <h4><i class="fas fa-clock"></i> Submission Under Review</h4>
                    <p>Your quiz is currently being graded by an instructor.</p>
                    <p>Your provisional score: ${parseFloat(latestAttempt.score).toFixed(0)} (Essay pending)</p>
                </div>
            `;
        }
        // Check if Failed but Graded
        else if (latestAttempt && latestAttempt.status === 'graded' && quiz && latestAttempt.score < quiz.passing_score) {
            materialContainer.innerHTML += `
                <div class="alert alert-danger text-center mb-4">
                    <h4><i class="fas fa-times-circle"></i> Quiz Failed</h4>
                    <p>You scored <strong>${parseFloat(latestAttempt.score).toFixed(0)}</strong>. Passing score is ${quiz.passing_score}.</p>
                    <p>Please review the materials and try again.</p>
                </div>
            `;
        }

        if (modules.length === 0) {
            materialContainer.innerHTML += '<p>No modules available for this course yet.</p>';
            return;
        }

        modules.forEach((mod, index) => {
            const div = document.createElement('div');
            div.className = 'mb-3 p-3 border rounded';

            let contentHtml = '';
            if (mod.type === 'video') {
                if (mod.url && (mod.url.includes('youtube.com') || mod.url.includes('youtu.be'))) {
                    // YouTube Embed
                    const videoId = mod.url.split('v=')[1] ? mod.url.split('v=')[1].split('&')[0] : mod.url.split('/').pop();
                    contentHtml = `<div class="embed-responsive embed-responsive-16by9 mb-2">
                                    <iframe class="embed-responsive-item" src="https://www.youtube.com/embed/${videoId}" allowfullscreen style="width:100%; height:400px; border:none;"></iframe>
                                   </div>`;
                } else {
                    // Standard MP4
                    contentHtml = `<div class="embed-responsive embed-responsive-16by9 mb-2">
                                    <video controls class="embed-responsive-item" style="width:100%">
                                        <source src="${mod.url}" type="video/mp4">
                                        Your browser does not support the video tag.
                                    </video>
                                   </div>`;
                }
            } else if (mod.type === 'pdf') {
                // PDF Embed
                contentHtml = `<div class="embed-responsive mb-2" style="height: 500px;">
                                <iframe src="${mod.url}" style="width:100%; height:100%; border:none;">
                                    This browser does not support PDFs. Please download the PDF to view it: <a href="${mod.url}">Download PDF</a>.
                                </iframe>
                               </div>`;
            } else {
                // Text or HTML content
                contentHtml = `<div class="alert alert-secondary" style="white-space: pre-wrap;">${mod.content || 'No content available.'}</div>`;
            }

            div.innerHTML = `
                <h4>Module ${index + 1}: ${mod.title}</h4>
                <span class="badge badge-info mb-2">${mod.duration}</span>
                ${contentHtml}
            `;
            materialContainer.appendChild(div);
        });
    } catch (err) {
        console.error('Error loading course details:', err);
        alert('Failed to load course details.');
    }
}

async function startQuiz() {
    try {
        const res = await fetch(`${API}/api/learning/quizzes?courseId=${currentCourseId}`);
        const quizzes = await res.json();
        const quiz = quizzes[0];

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            alert('No quiz available for this course.');
            return;
        }

        // Hide materials, show quiz
        document.getElementById('materialContainer').style.display = 'none';
        document.querySelector('button[onclick="startQuiz()"]').style.display = 'none';

        const quizArea = document.getElementById('quizArea');
        quizArea.style.display = 'block';

        let html = `<h3>${quiz.title}</h3><form id="quizForm">`;
        quiz.questions.forEach((q, index) => {
            html += `<div class="mb-4">
                        <p><strong>${index + 1}. ${q.text}</strong></p>`;

            if (q.type === 'essay') {
                html += `<textarea class="form-control" name="q${q.id}" rows="4" placeholder="Type your answer here..." required></textarea>`;
            } else {
                // Default to multiple choice
                if (q.options) {
                    q.options.forEach((opt, optIndex) => {
                        html += `<div class="form-check">
                                    <input class="form-check-input" type="radio" name="q${q.id}" value="${optIndex}" required>
                                    <label class="form-check-label">${opt}</label>
                                 </div>`;
                    });
                }
            }
            html += `</div>`;
        });
        html += `<button type="submit" class="btn btn-primary">Submit Quiz</button></form>`;

        quizArea.innerHTML = html;

        document.getElementById('quizForm').addEventListener('submit', (e) => {
            e.preventDefault();
            calculateScore(quiz);
        });
    } catch (err) {
        console.error('Error starting quiz:', err);
    }
}

async function calculateScore(quiz) {
    const formData = new FormData(document.getElementById('quizForm'));
    let score = 0;
    let earnedScore = 0;
    let totalMaxScore = 0;
    let hasEssay = false;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const attemptAnswers = [];

    quiz.questions.forEach(q => {
        const val = formData.get(`q${q.id}`);
        const maxPoints = 10; // Fixed points per question for simplicity
        totalMaxScore += maxPoints;

        let questionScore = 0;

        if (q.type === 'essay') {
            hasEssay = true;
            // Keyword Matching Logic (Hybrid Approach)
            if (val && val.trim().length > 0) {
                if (q.keywords && q.keywords.length > 0) {
                    const lowerVal = val.toLowerCase();
                    const matches = q.keywords.filter(k => lowerVal.includes(k.toLowerCase()));
                    // Simple heuristic: 1 keyword = 50%, 2+ keywords = 100%
                    if (matches.length >= 2) questionScore = maxPoints;
                    else if (matches.length === 1) questionScore = maxPoints / 2;
                    else questionScore = 0;
                } else {
                    // No keywords? Give full points for effort if not empty (Pending Review)
                    questionScore = maxPoints;
                }
            }
        } else {
            // Multiple Choice
            const answer = parseInt(val);
            if (answer === q.answer) questionScore = maxPoints;
        }

        earnedScore += questionScore;
        attemptAnswers.push({
            questionId: q.id,
            answer: val,
            score: questionScore,
            maxScore: maxPoints,
            type: q.type
        });
    });

    const finalScore = totalMaxScore > 0 ? (earnedScore / totalMaxScore) * 100 : 0;
    const status = hasEssay ? 'pending_review' : 'graded';

    try {
        // Save Attempt
        await fetch(`${API}/api/learning/quiz-attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                quiz_id: quiz.id,
                score: finalScore,
                passed: finalScore >= (quiz.passing_score || 70),
                answers: attemptAnswers
            })
        });

        // Update Enrollment Status if Essay
        if (hasEssay) {
            // Fetch first to see if enrollment exists
            const enrRes = await fetch(`${API}/api/learning/enrollments?courseId=${quiz.course_id}&userId=${user.id}`);
            const enrollments = await enrRes.json();

            if (enrollments.length === 0) {
                // Post new enrollment
                await fetch(`${API}/api/learning/enrollments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id, course_id: quiz.course_id })
                });
            } else {
                // Update
                await fetch(`${API}/api/learning/enrollments/${enrollments[0].id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ progress: 99, status: 'submitted' })
                });
            }

            alert(`Quiz Submitted! Your provisional score is ${finalScore.toFixed(0)}. An admin will review your essay answers for final grading.`);
            document.getElementById('quizArea').innerHTML = `
                <div class="text-center p-5">
                    <i class="fas fa-clock text-warning" style="font-size:48px; margin-bottom:20px;"></i>
                    <h3>Submission Received</h3>
                    <p>Your answers have been recorded. Your current provisional score is <strong>${finalScore.toFixed(0)}</strong>.</p>
                    <p>Please wait for an instructor to review your essay questions.</p>
                    <a href="index.html" class="btn btn-primary mt-3">Back to Learning Hub</a>
                </div>
            `;
        } else {
            if (finalScore >= (quiz.passing_score || 70)) {
                alert(`Congratulations! You passed with score: ${finalScore.toFixed(0)}`);
                await completeCourse(finalScore);
            } else {
                alert(`You scored ${finalScore.toFixed(0)}. Passing score is ${quiz.passing_score || 70}. Please try again.`);
                location.reload();
            }
        }
    } catch (err) {
        console.error('Quiz submission error:', err);
        alert('Failed to submit quiz.');
    }
}

async function completeCourse(score) {
    const user = JSON.parse(localStorage.getItem('currentUser'));

    try {
        const [courseRes, enrRes] = await Promise.all([
            fetch(`${API}/api/learning/courses`),
            fetch(`${API}/api/learning/enrollments?courseId=${currentCourseId}&userId=${user.id}`)
        ]);

        const courses = await courseRes.json();
        const course = courses.find(c => c.id === currentCourseId);
        const enrollments = await enrRes.json();

        // Update Enrollment
        let enrollmentId;
        if (enrollments.length === 0) {
            const res = await fetch(`${API}/api/learning/enrollments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, course_id: currentCourseId })
            });
            const newEnr = await res.json();
            enrollmentId = newEnr.id;
        } else {
            enrollmentId = enrollments[0].id;
        }

        const compDate = new Date().toISOString().split('T')[0];
        await fetch(`${API}/api/learning/enrollments/${enrollmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: 100, status: 'completed', completed_at: compDate })
        });

        // Generate Certificate
        const setRes = await fetch(`${API}/api/settings`);
        const settings = await setRes.json();
        const certificates = settings.certificates || [];

        const existingCert = certificates.find(c => c.enrollmentId === enrollmentId || (c.userId === user.id && c.courseName === course.title));

        if (!existingCert) {
            const certCode = `CERT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            certificates.push({
                id: Date.now(),
                enrollmentId: enrollmentId,
                userId: user.id,
                courseName: course.title,
                date: compDate,
                code: certCode
            });

            await fetch(`${API}/api/settings/certificates`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: certificates })
            });
        }

        // UI Update
        if (document.getElementById('quizArea')) document.getElementById('quizArea').style.display = 'none';
        showCertificate(course);
    } catch (err) {
        console.error('Completion error:', err);
    }
}

function showCertificate(course, score = 100) {
    document.getElementById('materialContainer').style.display = 'none';
    const startBtn = document.querySelector('button[onclick="startQuiz()"]');
    if (startBtn) startBtn.style.display = 'none';

    const certArea = document.getElementById('certificateArea');
    certArea.style.display = 'block';

    // Inject score display
    const existingMsg = certArea.querySelector('p');
    if (existingMsg) existingMsg.innerHTML = `Congratulations, you have successfully passed this course.<br><strong>Your Score: ${parseFloat(score).toFixed(0)}</strong>`;
}

async function downloadCertificate() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const user = JSON.parse(localStorage.getItem('currentUser'));

    try {
        const [courseRes, setRes] = await Promise.all([
            fetch(`${API}/api/learning/courses`),
            fetch(`${API}/api/settings`)
        ]);

        const courses = await courseRes.json();
        const course = courses.find(c => c.id === currentCourseId);
        const settings = await setRes.json();
        const certs = settings.certificates || [];
        const cert = certs.find(c => c.userId === user.id && c.courseName === course.title);

        // Border
        doc.setLineWidth(2);
        doc.rect(10, 10, 277, 190);

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(30);
        doc.setTextColor(0, 128, 128); // Teal
        doc.text("CERTIFICATE OF COMPLETION", 148.5, 40, null, null, "center");

        // Body
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("This is to certify that", 148.5, 70, null, null, "center");

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(user.name, 148.5, 90, null, null, "center");

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text("has successfully completed the course", 148.5, 110, null, null, "center");

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(course.title, 148.5, 130, null, null, "center");

        // Footer
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${cert ? cert.date : new Date().toLocaleDateString()}`, 50, 170);
        doc.text(`Certificate ID: ${cert ? cert.code : 'PENDING'}`, 200, 170);

        doc.save(`Certificate-${course.title}.pdf`);
    } catch (err) {
        console.error('Download certificate error:', err);
        alert('Failed to generate certificate document.');
    }
}

// Global scope
window.startQuiz = startQuiz;
window.downloadCertificate = downloadCertificate;
