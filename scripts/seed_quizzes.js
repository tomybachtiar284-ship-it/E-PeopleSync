const pool = require('../db');

async function seedQuizzes() {
    try {
        console.log('Seeding missing quizzes...');

        // 1. Get all courses
        const courses = await pool.query('SELECT * FROM courses');

        for (const course of courses.rows) {
            // 2. Check if course already has a quiz
            const quizRes = await pool.query('SELECT * FROM quizzes WHERE course_id = $1', [course.id]);

            if (quizRes.rows.length === 0) {
                console.log(`Creating quiz for Course: ${course.title} (ID: ${course.id})`);

                const questions = [
                    {
                        id: 1,
                        text: `What is the main objective of the course "${course.title}"?`,
                        type: 'multiple',
                        options: ['To learn new skills', 'To complete onboarding', 'To improve performance', 'All of the above'],
                        answer: 3
                    },
                    {
                        id: 2,
                        text: `Explain in your own words what you learned from "${course.title}".`,
                        type: 'essay',
                        keywords: ['learn', 'skill', 'professional', 'growth']
                    }
                ];

                await pool.query(
                    'INSERT INTO quizzes (course_id, title, questions, passing_score) VALUES ($1, $2, $3, $4)',
                    [course.id, `${course.title} Final Quiz`, JSON.stringify(questions), 70]
                );
            } else {
                console.log(`Quiz already exists for Course: ${course.title} (ID: ${course.id})`);
            }
        }

        console.log('Seeding finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
}

seedQuizzes();
