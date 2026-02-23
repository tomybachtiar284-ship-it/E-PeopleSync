const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres:Bachtiar@94@localhost:5432/epeoplesync"
});

const fs = require('fs');

async function inspect() {
    try {
        let output = '';
        output += '--- Users ---\n';
        const uRes = await pool.query('SELECT id, name, role FROM users');
        uRes.rows.forEach(u => {
            output += `ID: ${u.id} | Name: ${u.name} | Role: ${u.role}\n`;
        });

        output += '\n--- Enrollments ---\n';
        const eRes = await pool.query('SELECT id, user_id, course_id, status, progress FROM enrollments');
        eRes.rows.forEach(e => {
            output += `ID: ${e.id} | User: ${e.user_id} | Course: ${e.course_id} | Status: ${e.status} | Progress: ${e.progress}\n`;
        });

        output += '\n--- Quizzes ---\n';
        const qRes = await pool.query('SELECT id, title, questions FROM quizzes');
        qRes.rows.forEach(q => {
            output += `ID: ${q.id} | Title: ${q.title}\n`;
            output += `Questions: ${JSON.stringify(q.questions, null, 2)}\n`;
            output += '---\n';
        });

        output += '\n--- Quiz Attempts ---\n';
        const res = await pool.query('SELECT id, user_id, quiz_id, score, status, answers FROM quiz_attempts ORDER BY id DESC');
        res.rows.forEach(row => {
            output += `ID: ${row.id} | User: ${row.user_id} | Quiz: ${row.quiz_id} | Score: ${row.score} | Status: ${row.status}\n`;
            const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
            output += `Answers: ${JSON.stringify(answers, null, 2)}\n`;
            output += '-'.repeat(40) + '\n';
        });

        fs.writeFileSync('inspect_results.txt', output);
        console.log('Results written to inspect_results.txt');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
