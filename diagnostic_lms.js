const pool = require('./db');

async function checkData() {
    try {
        const courses = await pool.query('SELECT * FROM courses');
        const quizzes = await pool.query('SELECT * FROM quizzes');
        const enrollments = await pool.query('SELECT * FROM enrollments');
        const modules = await pool.query('SELECT * FROM course_modules');

        console.log('--- Courses ---');
        courses.rows.forEach(c => console.log(`ID: ${c.id}, Title: ${c.title}`));

        console.log('\n--- Quizzes ---');
        quizzes.rows.forEach(q => console.log(`ID: ${q.id}, Course ID: ${q.course_id}, Title: ${q.title}, Questions: ${q.questions ? q.questions.length : 0}`));

        console.log('\n--- Enrollments ---');
        enrollments.rows.forEach(e => console.log(`ID: ${e.id}, User ID: ${e.user_id}, Course ID: ${e.course_id}, Progress: ${e.progress}, Status: ${e.status}`));

        console.log('\n--- Quiz Attempts ---');
        const attempts = await pool.query('SELECT * FROM quiz_attempts');
        attempts.rows.forEach(a => console.log(`ID: ${a.id}, User ID: ${a.user_id}, Quiz ID: ${a.quiz_id}, Score: ${a.score}, Passed: ${a.passed}`));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkData();
