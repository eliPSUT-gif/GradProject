# Product Requirements Document (PRD)
## Smart Academic Advisor

**Document Owner:** Product / Graduation Project Team  
**Version:** 1.0  
**Status:** Draft for implementation  
**Target Release:** Graduation Project MVP

---

## 1. Product Summary

Smart Academic Advisor is a web-based academic planning system that helps university students evaluate the predicted difficulty of a semester schedule before registration. The system uses historical academic data, course metadata, and rule-based / weighted recommendation logic to calculate course difficulty, assess overall semester workload, and suggest schedule improvements.

The product also provides dedicated dashboards for academic advisors and administrators so that schedule risk, course difficulty trends, and model outputs can be reviewed, maintained, and improved over time.

---

## 2. Problem Statement

Students often register for courses without a clear understanding of the combined workload, historical course difficulty, or the impact of mixing multiple hard courses in one semester. Existing advising is often manual, inconsistent, and dependent on limited advisor availability.

As a result:
- Students may build unbalanced schedules.
- Advisors lack a fast, data-backed view of student workload risk.
- Universities lack structured insights into course difficulty trends and bottleneck courses.

---

## 3. Vision

Create a practical decision-support platform that helps students build manageable semester schedules and helps advisors intervene earlier using explainable workload predictions and recommendations.

---

## 4. Goals

### Primary Goals
- Let students evaluate a proposed semester schedule before registration.
- Calculate a difficulty score for each course using historical data.
- Calculate an overall semester workload / risk score for a full schedule.
- Provide explainable recommendations for balancing a difficult schedule.
- Give academic advisors visibility into student workload and risk.
- Give administrators tools to manage data, users, and model updates.

### Secondary Goals
- Track course difficulty trends over time.
- Generate reporting that supports academic planning and curriculum review.
- Keep the system modular enough to support future AI/ML upgrades.

---

## 5. Non-Goals (MVP)

The MVP will **not** include:
- Full integration with a live university SIS/ERP in the first release
- Automatic registration into official university registration systems
- Highly personalized ML predictions based on private student behavioral data
- Mobile-native apps
- Real-time notifications and messaging
- Complex degree-audit / graduation eligibility engine

---

## 6. Target Users

### 6.1 Students
Students need to:
- browse available courses
- build a semester draft
- evaluate schedule difficulty
- understand why a schedule is risky
- receive practical recommendations
- save a schedule draft

### 6.2 Academic Advisors
Advisors need to:
- review student schedules and risk levels
- identify at-risk students
- use data-backed workload insights during advising
- view schedule recommendations before approving or discussing a plan

### 6.3 System Administrators
Admins need to:
- manage users and roles
- upload and maintain historical course data
- trigger recalculation of difficulty scores
- monitor model coverage and system health
- manage course records and metadata

### 6.4 University Administration (Reporting / Read-only in MVP)
University leadership may need aggregated reporting on:
- course difficulty trends
- bottleneck courses
- pass/fail patterns
- overall advising insights

---

## 7. Core User Stories

### Student User Stories
- As a student, I want to log in securely so I can access my planning tools.
- As a student, I want to browse available courses and see their difficulty rating.
- As a student, I want to add courses to a draft schedule and evaluate the total workload.
- As a student, I want to see a score and label such as Easy, Balanced, or Hard.
- As a student, I want the system to explain what makes my schedule difficult.
- As a student, I want recommendations for lighter alternatives or better balance.
- As a student, I want to save my schedule draft for later.

### Advisor User Stories
- As an advisor, I want to search for a student and view their predicted workload.
- As an advisor, I want to identify students with risky schedules.
- As an advisor, I want to review recommendations before advising the student.

### Admin User Stories
- As an admin, I want to upload historical academic data.
- As an admin, I want the system to validate imported data and report errors.
- As an admin, I want to recalculate course difficulty scores when new data is added.
- As an admin, I want to manage users, courses, and system settings.

---

## 8. MVP Scope

### Included in MVP
1. Role-based authentication (Student / Advisor / Admin)
2. Course catalog and course details view
3. Historical data import and validation
4. Course difficulty score calculation
5. Semester schedule builder
6. Semester workload / risk evaluation
7. Recommendation engine for schedule balancing
8. Student dashboard
9. Advisor dashboard
10. Admin dashboard
11. Reporting for student risk and course difficulty trends

### Post-MVP / Future Scope
- ML-based prediction per student profile
- Live SIS integration
- Automated degree progress checks
- Course demand prediction
- Mobile app
- Notifications / alerts

---

## 9. Product Experience Overview

### 9.1 Student Flow
1. Student logs in.
2. Student opens Course Explorer / Semester Forecast.
3. Student selects 12–18 credits.
4. System retrieves course metadata and historical difficulty inputs.
5. System calculates per-course difficulty and semester workload score.
6. System returns:
   - total difficulty score
   - difficulty label
   - explanation of key contributing courses/factors
   - suggested swaps / balancing actions
7. Student may save, revise, or restart the schedule.

### 9.2 Advisor Flow
1. Advisor logs in.
2. Advisor searches for a student or opens advisee dashboard.
3. System shows workload status, risk flags, and schedule insight.
4. Advisor reviews student schedule and recommendations.

### 9.3 Admin Flow
1. Admin logs in.
2. Admin uploads new historical records or edits course metadata.
3. System validates data and reports errors.
4. Admin triggers recalculation or waits for scheduled processing.
5. Updated scores and reports become available in the system.

---

## 10. Functional Requirements

### FR-1 Authentication & Access Control
- The system must support login for Students, Advisors, and Admins.
- The system must enforce role-based access control.
- Failed login attempts should be limited and handled securely.

**Acceptance Criteria**
- Users can only access pages and data allowed by their role.
- Invalid credentials return a clear error message.
- After repeated failed attempts, the account/session is temporarily restricted according to security policy.

### FR-2 Historical Data Integration
- The system must allow admins to upload anonymized academic records.
- The system must validate imported data structure and content.
- Clean records must be stored in the database.
- Invalid rows must be logged with error reasons.

**Acceptance Criteria**
- Admin can upload a CSV/JSON file.
- System reports total imported rows, rejected rows, and validation messages.
- Successfully imported data becomes available for score recalculation.

### FR-3 Course Difficulty Score Calculation
- The system must calculate a numerical difficulty score for each course.
- The score must be based on historical metrics and defined weighted logic.
- Each course must have a difficulty label (e.g., Easy / Balanced / Hard).

**Acceptance Criteria**
- Score is generated for all courses with sufficient data.
- Score is stored with model/version metadata.
- Course difficulty is visible in the UI and accessible via API.

### FR-4 Semester Workload Evaluation
- The system must evaluate a full semester schedule selected by the student.
- The system must compute overall difficulty using per-course scores plus workload rules.
- The system must return a difficulty rank and explanation.

**Acceptance Criteria**
- Student can evaluate a schedule with multiple courses.
- System returns numeric score and category.
- System highlights the main factors driving difficulty.

### FR-5 Recommendation Engine
- The system must generate recommendations when a schedule is classified as risky or imbalanced.
- Recommendations must be explainable and actionable.
- Recommendations may include lighter alternatives, reduced credits, or better course-type balance.

**Acceptance Criteria**
- At least one actionable recommendation is returned for high-risk schedules.
- Each recommendation includes a reason and expected impact.

### FR-6 Student Dashboard
- The system must provide students with a dashboard showing personal planning data.
- The dashboard should include saved schedules, recent evaluations, and key indicators.

### FR-7 Advisor Dashboard
- The system must provide advisors with a dashboard to inspect student workload predictions and risk indicators.
- Advisors should be able to search by student and review schedule analytics.

### FR-8 Admin Dashboard
- The system must provide admins with interfaces for managing users, courses, imports, and model status.

### FR-9 Reporting
- The system must provide reports for:
  - student schedule summary
  - student risk evaluation
  - course difficulty trends
  - model performance / coverage

---

## 11. Non-Functional Requirements

### Performance
- Core dashboard pages should load quickly under normal academic usage.
- Schedule evaluation should complete within a few seconds for a standard semester plan.

### Reliability
- Imported data must be processed consistently.
- Failed imports must not corrupt existing records.
- Evaluation logic must produce deterministic results for the same inputs.

### Security
- Authentication and session handling must follow standard web security practices.
- Sensitive records must be access-controlled by role.
- Passwords must never be stored in plain text.
- Admin features must be protected with elevated authorization.

### Usability
- The interface should be simple enough for non-technical students.
- Difficulty labels, risk flags, and recommendations must be easy to understand.
- Explanations should avoid black-box wording where possible.

### Maintainability
- Scoring logic must be modular and versioned.
- Course, user, and analytics modules should be separated cleanly.
- Data import and evaluation services should be independently testable.

### Scalability
- Architecture should support future expansion to more users, departments, and data sources.

---

## 12. Recommendation & Scoring Logic

### 12.1 Course Difficulty Inputs
The initial course difficulty score should be based on historical and structural factors such as:
- average grade
- pass rate / fail rate
- withdrawal rate (if available)
- credit hours
- course type (theoretical / practical / lab / project)
- recent trend adjustment (optional)

### 12.2 Semester Evaluation Inputs
Semester difficulty should consider:
- sum of course difficulty scores
- total credit load
- concentration of hard courses
- concentration of labs / projects / practical courses
- known hard combinations (if configured)

### 12.3 Explainability Requirement
For any high-risk output, the system must explain:
- which courses contributed most
- whether total credit load is high
- whether course-type balance is poor
- what action would lower the score

### 12.4 Recommendation Types
- swap a hard course with a lighter elective
- postpone a project/lab-heavy course
- reduce total credits
- rebalance theoretical vs practical courses
- warn that the schedule is already manageable when appropriate

---

## 13. Data Requirements

### Required Entities
- Users
- Students
- Advisors
- Admins
- Courses
- Course Prerequisites
- Terms / Semesters
- Historical Course Statistics
- Schedule Drafts
- Schedule Items
- Schedule Evaluations
- Recommendations
- Import Jobs / Import Errors
- Audit Logs

### Required Data Fields (Examples)
**Course**
- course_id
- course_code
- course_name
- department
- credit_hours
- course_type
- prerequisite rules

**Historical Course Stats**
- course_id
- term_id
- avg_grade
- pass_rate
- fail_rate
- enrollment_count
- withdrawals

**Schedule Evaluation**
- draft_id
- total_score
- risk_label
- explanation_json
- evaluated_at
- model_version

---

## 14. Analytics & Reporting

### Reports in MVP
1. **Student Schedule Summary**
   - selected courses
   - credits
   - total score
   - risk label

2. **Student Risk Evaluation**
   - student ID
   - GPA (if available)
   - workload status
   - alert flag

3. **Course Difficulty Trends**
   - course code
   - average grade trend
   - pass/fail ratio
   - score trend

4. **Model Performance / Coverage**
   - percentage of courses with valid scores
   - error or missing-data counts
   - version/date of scoring run

---

## 15. Suggested Technical Architecture

### Frontend
- React-based web app
- Separate role-based dashboard views

### Backend
- Node.js + Express REST API
- Handles authentication, CRUD, dashboards, schedule management, and reporting

### AI / Evaluation Layer
- Python service or scheduled processing scripts
- Handles score computation, recommendation generation, and model versioning

### Database
- MySQL for transactional and analytics storage

### Optional Supporting Services
- Redis for caching (future)
- Background job worker for imports and score recalculation (future or if needed)

---

## 16. API Surface (High-Level)

### Auth
- POST /auth/login
- POST /auth/logout
- GET /auth/me

### Courses
- GET /courses
- GET /courses/:id
- GET /courses/:id/difficulty

### Student Planning
- POST /schedule/drafts
- POST /schedule/drafts/:id/items
- POST /schedule/drafts/:id/evaluate
- GET /schedule/drafts/:id/recommendations
- POST /schedule/drafts/:id/save

### Advisor
- GET /advisor/students
- GET /advisor/students/:id
- GET /advisor/students/:id/schedules
- GET /advisor/students/:id/risk

### Admin
- POST /admin/import/historical-data
- GET /admin/import/jobs
- POST /admin/recalculate-scores
- GET /admin/model-status
- CRUD /admin/users
- CRUD /admin/courses

---

## 17. Success Metrics

### Product / User Metrics
- % of evaluated schedules that receive a complete score
- % of high-risk schedules that receive actionable recommendations
- number of saved student schedules
- advisor usage of workload/risk views

### System Metrics
- data import success rate
- evaluation response time
- score coverage across course catalog
- number of failed evaluations

### Academic / Project Metrics
- student satisfaction during testing
- advisor perception of usefulness
- consistency between predicted difficulty and expert judgment

---

## 18. Risks and Mitigations

### Risk 1: Poor historical data quality
**Mitigation:** strong validation, import logs, missing-data handling, admin review workflow

### Risk 2: Recommendations are not trusted
**Mitigation:** provide explainable outputs and visible reasons behind every recommendation

### Risk 3: AI scope becomes too large for the project timeline
**Mitigation:** start with weighted scoring + rule-based recommendations, then iterate

### Risk 4: Overly broad first release
**Mitigation:** keep MVP limited to planning, evaluation, dashboards, and reporting

### Risk 5: Inconsistent performance during demo/testing
**Mitigation:** seed clean datasets, precompute course scores, and test core workflows thoroughly

---

## 19. Milestones

### Milestone 1: Foundations
- finalize requirements
- database schema
- project setup
- authentication and RBAC

### Milestone 2: Course & Data Layer
- course catalog
- import pipeline
- historical data storage
- admin data management

### Milestone 3: Intelligence Layer
- difficulty score engine
- semester evaluation engine
- recommendation engine

### Milestone 4: Product UI
- student dashboard
- advisor dashboard
- admin dashboard
- semester forecast and result pages

### Milestone 5: Reporting & QA
- reports
- testing
- security checks
- demo preparation
- documentation

---

## 20. Open Questions

- Will the MVP authenticate against a real university identity source or use seeded/demo accounts?
- Will GPA and transcript history be available in the first version or added later?
- Should advisors be able to edit a student draft directly, or only review it?
- Will prerequisite validation be strict in MVP or informational only?
- Should the recommendation engine optimize only for difficulty, or also for graduation progress?
- What minimum data coverage is required before a course can receive a valid score?

---

## 21. Final Product Positioning

Smart Academic Advisor is an explainable academic planning platform that transforms historical academic data into practical workload guidance. Its MVP focuses on reliable schedule evaluation, understandable recommendations, and role-based support for students, advisors, and administrators.

