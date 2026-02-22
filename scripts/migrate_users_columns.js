require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const alterSQL = `
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_place TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS citizenship TEXT,
  ADD COLUMN IF NOT EXISTS ktp_number TEXT,
  ADD COLUMN IF NOT EXISTS npwp TEXT,
  ADD COLUMN IF NOT EXISTS address_domicile TEXT,
  ADD COLUMN IF NOT EXISTS address_ktp TEXT,
  ADD COLUMN IF NOT EXISTS phone_emergency TEXT,
  ADD COLUMN IF NOT EXISTS email_personal TEXT,
  ADD COLUMN IF NOT EXISTS employee_status TEXT,
  ADD COLUMN IF NOT EXISTS contract_period TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS bpjs_health TEXT,
  ADD COLUMN IF NOT EXISTS bpjs_labor TEXT,
  ADD COLUMN IF NOT EXISTS fixed_allowance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_holder TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS major TEXT,
  ADD COLUMN IF NOT EXISTS grad_year TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT,
  ADD COLUMN IF NOT EXISTS certifications TEXT,
  ADD COLUMN IF NOT EXISTS training_history TEXT,
  ADD COLUMN IF NOT EXISTS competency_level TEXT,
  ADD COLUMN IF NOT EXISTS position_history TEXT,
  ADD COLUMN IF NOT EXISTS promotion_history TEXT,
  ADD COLUMN IF NOT EXISTS mutation_history TEXT,
  ADD COLUMN IF NOT EXISTS previous_company TEXT,
  ADD COLUMN IF NOT EXISTS kpi_score TEXT,
  ADD COLUMN IF NOT EXISTS eval_history TEXT,
  ADD COLUMN IF NOT EXISTS discipline_status TEXT,
  ADD COLUMN IF NOT EXISTS hr_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;

pool.query(alterSQL)
    .then(() => {
        console.log('SUCCESS: Semua kolom HR berhasil ditambahkan ke tabel users');
        pool.end();
    })
    .catch(e => {
        console.error('ERROR:', e.message);
        pool.end();
    });
