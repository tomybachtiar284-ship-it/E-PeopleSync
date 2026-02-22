/**
 * Script untuk menjalankan schema SQL ke PostgreSQL
 * Menggunakan ALTER TABLE IF NOT EXISTS untuk kolom baru
 * Run: node scripts/migrate.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const migrations = [
    // ── USERS ─────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'employee',
        name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Add columns if not exist
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS nid VARCHAR(30)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "group" VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_code VARCHAR(10)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date DATE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(150)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_job VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_email VARCHAR(150)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS final_approver_name VARCHAR(150)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS final_approver_job VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS final_approver_email VARCHAR(150)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(15,2) DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'internal'`,

    // ── SHIFT DEFINITIONS ──────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS shift_definitions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        clock_in TIME,
        clock_out TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── GROUP PATTERNS ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS group_patterns (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        pattern_date DATE NOT NULL,
        shift_code VARCHAR(10),
        UNIQUE (group_name, pattern_date)
    )`,

    // ── ROSTER ─────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS roster (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        shift_code VARCHAR(10),
        notes TEXT,
        UNIQUE (user_id, date)
    )`,

    // ── ATTENDANCE ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        clock_in TIME,
        clock_out TIME,
        status VARCHAR(50),
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_code VARCHAR(10)`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT`,
    // Add unique constraint if not exists (safe way)
    `DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'attendance_user_id_date_key'
        ) THEN
            ALTER TABLE attendance ADD CONSTRAINT attendance_user_id_date_key UNIQUE (user_id, date);
        END IF;
    END $$`,

    // ── LEAVE REQUESTS ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(30) DEFAULT 'Pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150)`,
    `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,

    // ── PAYROLL ────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS payroll_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value NUMERIC(15,4) NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        period_month INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        basic_salary NUMERIC(15,2) DEFAULT 0,
        total_ot NUMERIC(15,2) DEFAULT 0,
        bpjs_jht NUMERIC(15,2) DEFAULT 0,
        bpjs_jp NUMERIC(15,2) DEFAULT 0,
        bpjs_kes NUMERIC(15,2) DEFAULT 0,
        pph21 NUMERIC(15,2) DEFAULT 0,
        total_deductions NUMERIC(15,2) DEFAULT 0,
        net_salary NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, period_month, period_year)
    )`,

    // ── ASSETS ─────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS assets (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Available',
        assigned_to VARCHAR(150),
        date_assigned DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── DOCUMENTS ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        version VARCHAR(20),
        owner VARCHAR(150),
        expiry_date DATE,
        size VARCHAR(20),
        type VARCHAR(20),
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── LEARNING / LMS ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        department VARCHAR(100),
        level VARCHAR(50),
        thumbnail TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS course_modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        url TEXT,
        content TEXT,
        duration VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        questions JSONB,
        passing_score INTEGER DEFAULT 70,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        progress INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'in_progress',
        UNIQUE (user_id, course_id)
    )`,
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        score INTEGER,
        passed BOOLEAN DEFAULT FALSE,
        answers JSONB,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── EVALUATIONS ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        radar_data JSONB,
        history_data JSONB,
        objectives JSONB,
        feedback_message TEXT,
        feedback_date VARCHAR(50),
        feedback_by VARCHAR(150),
        period VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── RECRUITMENT ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        location VARCHAR(100),
        type VARCHAR(50),
        description TEXT,
        requirements TEXT,
        status VARCHAR(30) DEFAULT 'open',
        posted_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        status VARCHAR(30) DEFAULT 'Applied',
        quiz_score INTEGER,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── NEWS ───────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        image TEXT,
        author VARCHAR(150),
        published_at DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── NOTIFICATIONS ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── SETTINGS ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── SEED DATA ──────────────────────────────────────────────
    `INSERT INTO shift_definitions (code, name, clock_in, clock_out) VALUES
        ('P',  'Shift Pagi',  '07:30', '15:30'),
        ('S',  'Shift Siang', '15:30', '23:30'),
        ('M',  'Shift Malam', '23:30', '07:30'),
        ('DT', 'Daytime',     '07:30', '16:00'),
        ('L',  'Libur',       NULL,    NULL),
        ('CT', 'Cuti',        NULL,    NULL),
        ('SD', 'Sakit',       NULL,    NULL),
        ('DL', 'Dinas Luar',  NULL,    NULL),
        ('I',  'Izin',        NULL,    NULL),
        ('A',  'Alpa',        NULL,    NULL)
    ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, clock_in=EXCLUDED.clock_in, clock_out=EXCLUDED.clock_out`,

    `INSERT INTO payroll_settings (key, value, description) VALUES
        ('bpjs_jht_emp', 2, 'BPJS JHT Employee (%)'),
        ('bpjs_jp_emp', 1, 'BPJS JP Employee (%)'),
        ('bpjs_kes_emp', 1, 'BPJS Kesehatan Employee (%)'),
        ('ot_index', 173, 'OT divisor (hours/month)'),
        ('tax_office_limit', 500000, 'Tax office threshold'),
        ('ptkp0', 54000000, 'PTKP TK/0 per year')
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,

    `INSERT INTO settings (key, value) VALUES
        ('departments', '["Sales","IT","HR","Marketing","Finance","Operations"]'),
        ('locations', '["Jakarta","Surabaya","Bandung","Remote"]'),
        ('job_types', '["Full-time","Contract","Internship","Part-time"]'),
        ('course_categories', '["Onboarding","Skill","Compliance","Leadership"]'),
        ('course_levels', '["Foundation","Practitioner","Specialist","Mastery"]'),
        ('employee_groups', '["Grup Daytime","Grup A","Grup B","Grup C","Grup D"]'),
        ('doc_categories', '["Corporate Policy","Employee Record","Legal","Finance","Training"]')
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,

    `INSERT INTO users (username, password, role, name, position, department, avatar)
     VALUES ('admin', 'password', 'admin', 'Admin HR', 'Head of HR', 'HR', 'https://i.pravatar.cc/150?u=admin')
     ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name, position=EXCLUDED.position, department=EXCLUDED.department, avatar=EXCLUDED.avatar`,

    `INSERT INTO users (username, password, role, name, position, department, email)
     VALUES ('manager', 'password', 'manager', 'Budi Santoso', 'Manager HR', 'HR', 'budi.santoso@company.com')
     ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name`,

    `INSERT INTO users (username, password, role, name, position, department, email, nid, avatar, supervisor_name, supervisor_job, supervisor_email, final_approver_name, final_approver_job, final_approver_email)
     VALUES ('tomy', 'password', 'employee', 'Tomy Bachtiar', 'Sales Executive', 'Sales', 'tomybachtiar284@gmail.com', '9420039APN', 'https://reqres.in/img/faces/4-image.jpg', 'Budi Santoso', 'Manager HR', 'budi.santoso@company.com', 'Admin HR', 'Head of HR', 'admin@company.com')
     ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, nid=EXCLUDED.nid, avatar=EXCLUDED.avatar, supervisor_name=EXCLUDED.supervisor_name, final_approver_name=EXCLUDED.final_approver_name`,

    `INSERT INTO jobs (title, department, location, type, status) VALUES
        ('Sales Executive', 'Sales', 'Jakarta', 'Full-time', 'open'),
        ('Software Engineer', 'IT', 'Remote', 'Contract', 'open'),
        ('HR Specialist', 'HR', 'Surabaya', 'Full-time', 'open'),
        ('Marketing Intern', 'Marketing', 'Jakarta', 'Internship', 'open')
    ON CONFLICT DO NOTHING`,

    `INSERT INTO news (title, content, image, author, published_at) VALUES
        ('Welcome to E-PeopleSync 2.0', 'We are excited to announce the launch of our new HR Platform!', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', 'HR Department', '2026-02-15'),
        ('Annual Company Gathering 2026', 'Save the date! Our annual gathering will be held at Bali.', 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800', 'Event Committee', '2026-03-10')
    ON CONFLICT DO NOTHING`,

    `INSERT INTO assets (id, name, category, status, assigned_to, date_assigned) VALUES
        ('AST-001', 'MacBook Pro 16"', 'Laptop', 'Assigned', 'Admin HR', '2025-10-15'),
        ('AST-002', 'Dell UltraSharp 27"', 'Peripherals', 'Available', NULL, NULL),
        ('AST-003', 'iPhone 15 Pro', 'Smartphone', 'Assigned', 'Admin HR', '2025-11-20'),
        ('AST-004', 'Toyota Avanza', 'Vehicle', 'Repair', NULL, NULL),
        ('AST-005', 'Logitech MX Master 3', 'Peripherals', 'Available', NULL, NULL)
    ON CONFLICT (id) DO NOTHING`,
];

async function runMigration() {
    const client = await pool.connect();
    let success = 0;
    let failed = 0;

    try {
        console.log('📦 Running E-PeopleSync migration...\n');

        for (const sql of migrations) {
            try {
                await client.query(sql);
                success++;
                process.stdout.write('.');
            } catch (err) {
                failed++;
                console.error(`\n⚠️  Warning: ${err.message.split('\n')[0]}`);
            }
        }

        console.log(`\n\n✅ Migration done! (${success} ok, ${failed} warnings)\n`);

        // Show results
        const tables = await client.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
        );
        console.log('📋 Tables in database:');
        tables.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

        const users = await client.query('SELECT username, role, name FROM users ORDER BY id');
        console.log('\n👤 Users:');
        users.rows.forEach(u => console.log(`  ✓ [${u.role}] ${u.username} → ${u.name}`));

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
