# E-PeopleSync HR Platform
**Integrated Human Capital Management System**

## 1. Project Overview
**E-PeopleSync** is a comprehensive human capital management platform designed to streamline the entire employee lifecycle—from recruitment to continuous development and performance tracking.

### 1.1 Architectural Vision
The platform is designed with a modern tech stack (Prototype matches this visually):
- **Frontend**: Next.js 15 (App Router).
- **AI Engine**: **Google Genkit** with **Gemini 1.5 Flash**.
- **UI/UX**: Tailwind CSS + Shadcn UI (Teal Enterprise Theme).
- **Backend**: Firebase.

---

## 2. Detailed Feature Breakdown

### 2.1 Admin Dashboard ("Command Center")
High-level organizational insights.
- **Key Metrics**: Real-time cards for Headcount, Recruitment Volume, Training Completion, and Avg. KPI Score.
- **Skill Development Trend**: **Area Chart** tracking average workforce competency scores over time.
- **Recruitment Funnel**: **Pie Chart** breaking down the hiring pipeline (Applied -> Hired).
- **Data Export**: CSV download for external reporting.

### 2.2 AI-Powered Recruitment Hub
Automates candidate screening using `aiCandidateScreening` Genkit flow.
- **AI Candidate Ranker**: Triggered by "Run AI Ranker".
    - *Logic*: Uses Gemini 1.5 Flash to analyze CV/Test data, producing a suitability score (0-100).
- **Status Management**: Tracks candidates using specific stages:
    - `Proses` (Screening)
    - `Wawancara` (Interview)
    - `Penawaran` (Offer)
    - `Lolos` (Hired)

### 2.3 Learning & Development (L&D) Hub
Personalized upskilling portal.
- **Course Library**: Grid of modules (Technical, Soft Skills).
- **Certification Tracking**: Badge in header displaying total certificates earned.
- **Tabbed Filtering**: "All Courses", "In Progress", "Completed".

### 2.4 Smart Performance Evaluation
360-degree performance view.
- **Competency Radar**: Visualization of 6 core skills: Technical, Communication, Leadership, Productivity, Innovation, Teamwork.
- **AI Performance Summary**: Triggered by "Generate AI Summary".
    - *Flow*: `aiPerformanceReviewSummary`.
    - *Output*: Narrative summary highlighting "Top Strength" and "Development Area".
- **Objective Management (OKRs)**: Tracker for quarterly goals with "On Track" / "Warning" alerts.

---

## 3. AI Engine Logic (Prototype Simulation)
The "brain" of the app concept resides in `src/ai/flows/`:
- **aiCandidateScreening**: Multi-modal input analysis (CV + Text).
- **aiPerformanceReviewSummary**: Standardizes reviews into narratives.
- **aiTestQuestionGeneration**: Auto-generates quiz questions.

## 4. User Guide
- **Admin**: `login/admin.html` (`admin`/`password`).
- **User**: `login/index.html` (Google Login).
