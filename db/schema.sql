-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'candidate')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    position VARCHAR(100),
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    status VARCHAR(50),
    location VARCHAR(255)
);

-- Create Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Avatar & NID Columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nid VARCHAR(20);

-- Insert Default Admin
INSERT INTO users (username, password, role, name, position, department, avatar)
VALUES ('admin', 'password', 'admin', 'Admin HR', 'Head of HR', 'HR', 'https://i.pravatar.cc/150?u=admin')
ON CONFLICT (username) DO UPDATE SET avatar = EXCLUDED.avatar;

-- Insert Default Employee (Tomy)
INSERT INTO users (username, password, role, name, position, department, email, nid, avatar)
VALUES ('tomy', 'password', 'employee', 'Tomy Bachtiar', 'Sales Executive', 'Sales', 'tomybachtiar284@gmail.com', '9420039APN', 'https://reqres.in/img/faces/4-image.jpg')
ON CONFLICT (username) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    nid = EXCLUDED.nid,
    avatar = EXCLUDED.avatar;
