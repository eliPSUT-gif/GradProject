# SmartAdvisor Full Functionality By Role

This document summarizes the currently implemented SmartAdvisor functionality by role. It is written to support updates to use-case diagrams, sequence diagrams, and class/domain diagrams.

Source areas used for this document:

- Routing and role access: `src/App.tsx`, `src/layouts/AppLayout.tsx`
- Authentication and user lifecycle: `src/context/AuthContext.tsx`
- Academic data, schedule reviews, drafts, transcripts, and admin data: `src/context/AppDataContext.tsx`
- Messaging, notifications, and advisor-student relationships: `src/context/MessagingContext.tsx`
- Core domain types and rules: `src/data/courses.ts`
- AI and serverless routes: `src/lib/ai.ts`, `api/*.ts`

## Roles

The application has three authenticated roles:

- Student
- Advisor
- Admin

Each role has a separate protected route group. A user who is not authenticated is redirected to `/login`. A user who is authenticated but tries to open a page for another role is redirected to their own home route.

Role home routes:

| Role | Home route |
| --- | --- |
| Student | `/app/dashboard` |
| Advisor | `/app/advisor` |
| Admin | `/app/admin` |

## Shared Functionality

### Public Landing Page

Route: `/`

The landing page is public and introduces the application. It is composed from separate landing sections:

- Navbar
- Hero
- Stats strip
- Problem section
- Features section
- Architecture section
- AI engine section
- Team section
- Footer

This page does not require authentication and does not mutate application data.

### Login

Route: `/login`

All roles use the same login page.

Login behavior:

- User selects role: Student, Advisor, or Admin.
- User enters university ID and password.
- User may choose "Keep me signed in on this device".
- reCAPTCHA v3 must be configured and successfully verified before login.
- Supabase login uses the university ID to locate the matching app user, then signs in with the user's stored email and password.
- The selected role must match the role stored for that account.
- Inactive accounts cannot proceed.
- Successful login redirects to the role home route.
- Failed login attempts are tracked locally.
- Accounts are temporarily locked after 3 failed attempts for 30 seconds.

Password rules shown and enforced:

- At least 10 characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one number.
- At least one special character.

Forgot-password behavior:

- Available for Student and Advisor roles only.
- Admin password resets must be handled by another administrator.
- Student or advisor enters their university ID.
- The request creates or reuses an open password-reset inquiry.
- Admins see password-reset inquiries on the Admin Overview page.

### Auth Session And Security

Shared authentication responsibilities:

- Keep the current auth session.
- Load and sync managed users from Supabase.
- Persist sessions using local storage or session storage depending on "remember me".
- Update last login and last seen timestamps.
- Log out and clear the session.
- Validate password rules.
- Allow the signed-in user to change their own password from Settings.

Change-password flow:

1. User opens Settings.
2. User enters current password.
3. User enters new password.
4. User confirms new password.
5. Client validates confirmation and password rules.
6. Supabase mode verifies the current password by signing in with the current credentials.
7. Supabase updates the current user's password.
8. Local fallback mode compares against the local stored password and updates local state.
9. Form clears on success.

### Shared App Layout

All authenticated roles use the app layout.

Layout behavior:

- Displays role-specific sidebar navigation.
- Shows the signed-in user's name, initials, and subtitle.
- Supports sidebar collapse.
- Supports mobile sidebar open and close.
- Displays page title based on the current route.
- Displays a notification bell.
- Supports logout.

Notifications:

- Message notifications.
- Assistance-request notifications.
- Password-inquiry notifications.
- Toast notifications for recent events.
- Notifications can be dismissed.
- Clicking a message notification routes to the relevant conversation.
- Clicking an assistance notification routes the advisor to messages focused on the student.
- Clicking a password-inquiry notification routes the admin to the admin overview.

### Messaging System

Messaging is shared by students and advisors.

Messaging rules:

- Messages are only allowed between a student and their assigned advisor.
- Advisors can message their own advisees.
- Students can message only their assigned advisor.
- Messages have read receipts.
- Conversations are marked read when opened.
- Messages are ordered by send time.
- Empty messages cannot be sent.
- Enter sends a message; Shift+Enter inserts a newline.
- Supabase realtime channels are used when configured.
- Local/demo mode derives relationships from seeded student profiles.

Message kinds:

| Kind | Meaning |
| --- | --- |
| `message` | Normal advisor-student chat |
| `assistance` | Student asked advisor for help |
| `password_inquiry` | Password-reset inquiry notification |

### AI Services

The application uses OpenRouter for AI schedule analysis.

Schedule-analysis endpoint:

- API route: `/api/openrouter-schedule-analysis`
- Client helper: `analyzePlannerSchedule`
- Requires `OPENROUTER_API_KEY`
- Uses `OPENROUTER_MODEL` if configured, otherwise a default free route model.
- Receives structured planner context.
- Returns strict JSON:
  - `explanation[]`
  - `recommendations[]`
  - `model`
- The prompt explicitly forbids mentioning placeholders, mocks, demos, internal tools, implementation details, scaffolding, or how the review was generated.

Chat endpoint:

- API route: `/api/openrouter-chat`
- Client helper: `askStudentAdvisor`
- Accepts a question and student context.
- Returns concise advising text.
- This helper and endpoint exist, but the active role pages currently use the generated schedule review cards and advisor messaging rather than a visible free-form AI chat workflow.

Local fallback:

- If OpenRouter analysis fails, the planner can still produce a local schedule review.
- The fallback model version is production-safe: `planner-local-fallback-v1`.

### Email Service

Generated-password emails are sent by serverless API routes through SMTP.

SMTP helper:

- `api/_email.ts`
- Uses Nodemailer.
- Reads server-only SMTP environment variables.
- Sends generated-password emails for account creation and password reset.

Email content includes:

- User full name.
- University ID.
- Role.
- Generated temporary password.
- Login instruction.

Email failure behavior:

- Account creation or password update can still succeed if the email fails.
- The API returns a warning when the password was saved but the email could not be sent.
- The UI shows that warning to the admin.

## Student Role

### Student Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/app/dashboard` | Student Dashboard | Academic overview, current schedule, AI recommendations, transcript views |
| `/app/courses` | Course Planner | Select courses, run AI review, save drafts |
| `/app/messages` | Student Messages | Message assigned advisor |
| `/app/profile` | Redirect | Redirects to dashboard |
| `/app/settings` | Student Settings | Change own password |

### Student Navigation

Student sidebar items:

- Dashboard
- Course Planner
- Messages
- Settings

### Student Dashboard

The dashboard is the student's main academic overview.

Displayed information:

- GPA.
- Latest schedule score.
- Credits this term.
- Completed credits.
- Current or latest planned schedule.
- AI recommendations from the latest completed planner review.
- Notes and rationale from the latest completed planner review.
- Past semester GPA chart.
- Full transcript tab.
- Semester transcript tab.

Dashboard tabs:

| Tab | Functionality |
| --- | --- |
| Overview | Shows KPIs, planned schedule, difficulty meter, AI rationale, recommendations, and GPA trend |
| Transcript | Shows full degree transcript, including completed and not-yet-taken courses |
| Semester Transcript | Lets the student choose a semester and view courses, grades, statuses, credits, and GPA for that semester |

AI Recommendations panel:

- Shows generated recommendation cards from the latest review.
- If no review exists, shows an empty state telling the student to run Analyze Schedule in Course Planner.
- Includes a "Message advisor" action.

Assistance request:

- Student can ask the assigned advisor for assistance.
- The action sends a special assistance message to the advisor.
- The advisor receives an assistance notification.
- The action is disabled if the student has no assigned advisor or messaging is not ready.

### Course Planner

Route: `/app/courses`

The planner lets students build a future semester schedule and analyze workload.

Course discovery:

- Select target term.
- Search by course code or course name.
- Filter by course type:
  - All
  - Theoretical
  - Practical
  - Hybrid
  - Project

Course cards show:

- Code.
- Name.
- Type.
- Department.
- Credits.
- Difficulty label and score.
- Difficulty basis.
- Prerequisites and requirement notes.
- Concurrent-course requirements.
- Eligibility or lock reasons.

Selection rules:

- A course can be selected or removed by toggling it.
- Courses are blocked when prerequisites or requirements are not satisfied.
- Concurrent-course requirements are considered.
- Minimum completed-credit requirements are considered.
- Credit limits are enforced:
  - Regular semester maximum: 18 credits.
  - Summer maximum: 9 credits.
- The planner tracks current editable selection separately from the last completed review.

Analysis flow:

1. Student selects eligible courses.
2. Student clicks Run AI Planner Review.
3. The planner validates that selected courses do not exceed the term credit limit.
4. The client builds a planner context:
   - Student.
   - Term.
   - GPA.
   - Completed credits.
   - Selected courses.
   - Local factor scores.
5. The client calls OpenRouter schedule analysis.
6. If OpenRouter succeeds, AI explanation and recommendations are merged into the evaluation.
7. If OpenRouter fails, production-safe local fallback explanation and recommendations are used.
8. The completed review is saved as the student's latest planner review snapshot.
9. The review remains visible after navigation away and back.
10. The review is replaced only when a new analysis completes successfully or a saved draft is intentionally loaded.

Schedule review result shows:

- Score gauge.
- Term summary.
- Course count and credits.
- Workload badge.
- Course Breakdown.
- Recommendations.
- Notes and Rationale.

Review persistence behavior:

- Changing current selections after analysis does not overwrite the displayed review.
- Clearing current selection does not remove the displayed review.
- Term changes do not erase the displayed review.
- The displayed review is reconstructed from the reviewed `courseCodes` and `termCode`.
- A saved draft load intentionally updates the current selection and the displayed review context.

Draft behavior:

- Student can save the currently analyzed plan as a draft.
- Drafts include:
  - Name.
  - Student ID.
  - Term code.
  - Course codes.
  - Saved timestamp.
  - Evaluation snapshot.
  - Sync status.
- Drafts are synced to Supabase when configured.
- Drafts can be viewed in a modal.
- Drafts can be loaded back into the planner.
- Drafts can be deleted.

### Student Messages

Route: `/app/messages`

Student messaging behavior:

- Shows the assigned advisor.
- Shows only the conversation with the assigned advisor.
- Displays message history.
- Sends new messages.
- Marks advisor messages as read when opened.
- Shows read receipts for student-sent messages.
- Displays assistance messages as system-style messages.
- Sends are disabled if there is no advisor or messaging is not ready.

### Student Settings

Route: `/app/settings`

Student settings currently contain account security.

Student can:

- View security policy reminders.
- Enter current password.
- Enter and confirm new password.
- Update own password.

## Advisor Role

### Advisor Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/app/advisor` | Advisor Dashboard | Cohort KPIs, at-risk list, student roster |
| `/app/advisor/student/:studentId` | Advisor Student Detail | Detailed advisee review |
| `/app/advisor/messages` | Advisor Messages | Message advisees |
| `/app/advisor/courses` | Redirect | Redirects to advisor dashboard |
| `/app/advisor/reports` | Redirect | Redirects to advisor dashboard |
| `/app/advisor/settings` | Advisor Settings | Preferences and password change |

### Advisor Navigation

Advisor sidebar items:

- Dashboard
- Messages
- Settings

The codebase also contains `CourseAnalysis` and `ReportsPage` components, but the active routes for advisor courses and reports currently redirect to the advisor dashboard and are not shown in the advisor sidebar.

### Advisor Dashboard

Route: `/app/advisor`

The advisor dashboard is scoped to students assigned to the signed-in advisor.

Displayed KPIs:

- Students Advised.
- At-Risk Students.
- Average Cohort GPA.

Student roster:

- Search by student name or ID.
- Shows student name and ID.
- Shows GPA.
- Shows credits from the latest evaluation.
- Shows dynamic difficulty score and risk label from the latest planner review snapshot or latest evaluation.
- Shows status:
  - Good.
  - Monitor.
  - At-risk.
- Actions:
  - View details.
  - Message.

At-risk panel:

- Lists advisees whose status is not Good.
- Prioritizes students who need monitoring or intervention.
- Provides View details and Message actions.

Inbox action:

- Opens the advisor messaging page.

### Advisor Student Detail

Route: `/app/advisor/student/:studentId`

Access rule:

- Advisor can only view students assigned to them.
- If the student is not assigned to the advisor, the page shows a not-found or not-authorized state.

Displayed KPIs:

- GPA.
- Schedule score.
- Credits this term.
- Completed credits.

Tabs:

| Tab | Functionality |
| --- | --- |
| Overview | Current/active schedule, difficulty meter, explanation, GPA trend, saved drafts |
| Transcript | Full transcript across the degree |
| Semester Transcript | Select a semester and view that term's transcript summary |

Overview behavior:

- Shows current selected courses if available.
- Otherwise shows latest saved draft courses.
- Shows difficulty meter from current evaluation or latest draft evaluation.
- Shows rationale/explanation from the evaluation.
- Shows past semester GPA chart.
- Shows saved drafts summary.
- Lets advisor open a modal with all saved drafts.
- Lets advisor inspect draft courses and draft evaluation details.
- Provides a Message Student action.

Transcript behavior:

- Shows all courses with recorded transcript information where available.
- Includes grades and statuses.

Semester transcript behavior:

- Advisor selects a semester.
- Page shows term label, completed credits, course count, GPA.
- Table shows course code, course name, credits, status, and grade.

Saved drafts modal:

- Lists drafts by name, term, saved date, score, risk, courses, and credits.
- Lets advisor view draft courses.
- Shows recommendation/risk context attached to the draft evaluation.

### Advisor Messages

Route: `/app/advisor/messages`

Advisor messaging behavior:

- Shows only assigned advisees.
- Search advisees by name or ID.
- Conversation list is sorted by recent message activity.
- Each thread can show unread count, preview text, and assistance indicator.
- Advisor can select a student thread.
- Advisor can send messages to the selected student.
- Advisor messages show read receipts.
- Student messages are marked read when the conversation opens.
- Assistance requests are shown as special system-style messages.
- Navigation can focus a specific student and scroll to bottom.

### Advisor Settings

Route: `/app/advisor/settings`

Advisor settings include:

- Local preference: default report filter.
- Local preference: show only risky students.
- Preferences are saved to local storage.
- Shared account security panel.
- Advisor can change their own password.

## Admin Role

### Admin Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/app/admin` | Admin Dashboard | System overview, advisors, students, password inquiries |
| `/app/admin/students` | Student Management | Search students and open transcripts |
| `/app/admin/students/:studentId/transcript` | Student Transcript Editor | Edit a student's transcript marks, attempts, and terms |
| `/app/admin/courses` | Course Management | Review courses and update difficulty scores |
| `/app/admin/users` | User Management | Create, disable, enable, delete users |
| `/app/admin/model` | Redirect | Redirects to course management |
| `/app/admin/settings` | Admin Settings | Security settings and password change |

### Admin Navigation

Admin sidebar items:

- Overview
- Students
- Courses
- Users
- Settings

### Admin Dashboard

Route: `/app/admin`

Displayed KPIs:

- Total students.
- Total advisors.
- Pending plans.

Students panel:

- Lists students.
- Shows GPA.
- Links to each student's transcript editor.

Advisors panel:

- Lists active advisors.
- Selecting an advisor opens a modal with assigned students.

Password inquiries panel:

- Shows password-reset inquiries submitted by students and advisors.
- Open inquiries appear before resolved inquiries.
- Newer inquiries appear before older inquiries.
- Admin can open User Management.
- Admin can mark an inquiry as resolved.

Pending plans:

- Computed from saved schedule drafts that have not yet been converted into transcript terms.

### Admin Student Management

Route: `/app/admin/students`

Functionality:

- Search students by name or ID.
- View student name and ID.
- View assigned advisor.
- View GPA.
- View completed credits.
- Open student transcript.

Reset-password buttons were removed from this page because generated account passwords and generated password reset flow are handled through User Management.

### Admin Student Transcript Editor

Route: `/app/admin/students/:studentId/transcript`

Functionality:

- View student name, ID, and advisor.
- View courses grouped by term.
- Edit final mark.
- Clear grade.
- Edit attempt number.
- Edit semester taken.
- Save changes.
- Reset unsaved local changes.

Transcript rows:

- Existing saved transcript rows are loaded from Supabase when configured.
- Missing rows can be generated in the UI for planned or available courses.
- New rows are persisted through an admin service-role API route.
- Local state updates only after the server save succeeds.

Mark rules:

- Blank mark means in progress.
- Entered mark must be a whole number.
- Minimum entered mark: 35.
- Maximum entered mark: 99.
- Decimal marks are not accepted.
- The UI allows the admin to type first, then validates before saving.

Attempt rules:

- Blank attempt is allowed only when no grade is entered.
- If a grade is entered, attempt is required.
- Attempt must be a whole number from 1 to 10.
- A passed course cannot be duplicated as attempt 1.

Status rules:

- Blank grade becomes `in_progress`.
- Grade 60 or higher becomes `passed`.
- Grade below 60 becomes `failed`.
- Withdrawn rows remain separate status cases.

Term and credit rules:

- Each row has a term code.
- Term label is derived from the term code.
- Regular terms cannot exceed 18 credits.
- Summer terms cannot exceed 9 credits.

Save flow:

1. Admin edits marks, attempts, or term.
2. Client validates changed rows.
3. Client calls `/api/admin-upsert-transcript-entry` for each changed row.
4. Server validates admin session token.
5. Server verifies the requester is an admin.
6. Server resolves the student and course IDs.
7. Server inserts or updates `student_transcript_entries` using the service role.
8. Server returns the saved transcript row ID.
9. Client updates transcript state and derived GPA/credits.
10. UI shows success or the first validation/save error.

### Course Management

Route: `/app/admin/courses`

Functionality:

- Search courses by code, name, or type.
- View course catalog.
- View course code.
- View course name.
- View course type.
- View credits.
- View pass rate.
- View average grade.
- View difficulty score and label.
- Edit difficulty score.
- Save difficulty score.

Difficulty edit rules:

- Difficulty must be numeric.
- Difficulty must be between 0 and 100.
- Saved difficulty updates the local course model.
- If Supabase is configured, saved difficulty updates the `courses` table.
- Saved difficulty affects planner review and advisor/student schedule displays.

The data context also exposes an `upsertCourse` function for manual course insertion/update. The active Course Management page currently focuses on difficulty editing rather than a full add-course form.

### User Management

Route: `/app/admin/users`

User creation:

- Admin enters full name.
- Admin selects role.
- User ID is generated automatically.
- Password is generated automatically.
- Admin does not manually type a password.
- Student creation requires assigning an advisor.
- Created users are active by default.

Generated ID rules:

| Role | Rule | Example |
| --- | --- | --- |
| Student | Current calendar year plus 4-digit sequence among current-year student IDs | `20260001` |
| Advisor | `ADV-` plus incremented suffix | `ADV-1003` |
| Admin | `ADM-` plus incremented suffix | `ADM-1003` |

Student creation defaults:

- Enrollment year is the current year.
- Admission term is Fall.
- Department is Computer Science.
- Advisor must be selected.
- Subtitle is generated internally.

Generated password rules:

- At least 10 characters.
- Includes uppercase.
- Includes lowercase.
- Includes number.
- Includes special character.
- Generated client-side before the create/reset API call.
- Validated again server-side before Supabase Auth changes are made.

Create-user server flow:

1. Admin submits a generated ID, full name, role, selected advisor if student, and generated password.
2. Client calls the auth user upsert flow.
3. Server route `/api/admin-create-user` requires a valid admin Supabase session token.
4. Server verifies the requester is an admin.
5. Server creates or updates Supabase Auth user.
6. Server upserts the `app_users` row.
7. Student creation then upserts the `student_profiles` row with advisor, department, GPA 0, completed credits 0, admission year, and admission term.
8. Server attempts to email the generated password by SMTP.
9. UI shows success or success-with-warning if email failed.

Managed users table:

- Lists name.
- Lists university ID.
- Lists role.
- Lists status.
- Supports generated password reset.
- Supports account enable/disable.
- Supports account delete with confirmation.

Generated reset flow:

1. Admin clicks Generate reset.
2. Client generates a compliant password.
3. Client calls `/api/admin-reset-password`.
4. Server validates admin token and admin role.
5. Server updates the Supabase Auth user's password.
6. Server attempts to email the generated password.
7. UI shows success or success-with-warning.

Enable/disable flow:

- Admin toggles user status.
- Status is updated locally.
- If Supabase is configured, status is patched in `app_users`.
- Inactive users cannot log in.

Delete flow:

1. Admin clicks Delete.
2. Confirmation modal opens.
3. Admin confirms.
4. User is removed from local state.
5. Server route `/api/admin-delete-user` is called when Supabase is configured.
6. Server validates admin token and role.
7. Server deletes Supabase Auth user when available.
8. Server deletes the `app_users` row.

### Admin Settings

Route: `/app/admin/settings`

Admin settings currently include:

- Security policy summary.
- Shared account security panel.
- Admin can change their own password.

## Domain Model For Class Diagrams

The following classes/entities are the main candidates for class diagrams.

| Entity | Key fields | Main responsibility |
| --- | --- | --- |
| `ManagedUser` | `id`, `name`, `role`, `subtitle`, `initials`, `password`, `status`, `email`, `appUserId`, `authUserId` | Represents an app account for login and admin management |
| `AuthSession` | `id`, `name`, `role`, `initials`, `subtitle`, `email`, `appUserId`, `authUserId` | Represents the signed-in user session |
| `StudentProfile` | `id`, `name`, `gpa`, `creditsCompleted`, `department`, `advisorId`, `completedCourseCodes`, `admissionYear`, `admissionTerm` | Academic profile for a student |
| `Course` | `code`, `name`, `department`, `type`, `credits`, `prerequisites`, `concurrentCourses`, `minimumCompletedCredits`, `diffScore`, `difficultyLabel` | Catalog course plus difficulty and historical stats |
| `HistoricalCourseStat` | `courseCode`, `termId`, `avgGrade`, `passRate`, `failRate`, `enrollmentCount`, `withdrawals` | Historical basis for course analytics |
| `ScheduleEvaluation` | `studentId`, `totalScore`, `riskLabel`, `totalCredits`, `evaluatedAt`, `modelVersion`, `explanation`, `factors`, `recommendations`, `courseCodes`, `termCode` | Completed schedule analysis snapshot |
| `EvaluationFactor` | `label`, `score`, `detail` | Internal factor used to explain an evaluation |
| `Recommendation` | `title`, `reason`, `action`, `expectedImpact`, `impactDelta` | Advising recommendation generated from schedule analysis |
| `ScheduleDraft` | `studentId`, `name`, `courseCodes`, `savedAt`, `termCode`, `status`, `syncStatus`, `evaluation` | Saved planned schedule with evaluation snapshot |
| `StudentInsight` | Student profile fields plus `difficulty`, `status`, `latestEvaluation`, `activeDraft` | Advisor-facing student summary |
| `StudentTranscriptRow` | `studentId`, `termCode`, `courseCode`, `courseName`, `credits`, `finalGrade`, `status`, `attemptNo` | One student's transcript entry for one course attempt |
| `StudentTermMetric` | term, GPA, credits, course count | Derived semester performance summary |
| `StudentTranscriptSemester` | term label, rows, GPA, credits | Grouped transcript view for one semester |
| `AdvisorMessage` | `senderId`, `recipientId`, `body`, `sentAt`, `readAt`, `kind` | Message or special request between student and advisor |
| `AppNotification` | `kind`, `senderId`, `recipientId`, `createdAt` | In-app notification derived from messages or inquiries |
| `PasswordResetInquiry` | `requesterId`, `requesterName`, `requesterRole`, `status`, `createdAt`, `resolvedAt` | Student/advisor request for admin password help |

Suggested cardinalities:

- One Advisor has many StudentProfiles.
- One StudentProfile has one assigned Advisor.
- One StudentProfile has many ScheduleDrafts.
- One StudentProfile has many ScheduleEvaluations over time, with one latest displayed planner review.
- One ScheduleDraft has one ScheduleEvaluation snapshot.
- One ScheduleDraft has many Courses through course codes.
- One StudentProfile has many StudentTranscriptRows.
- One Course can appear in many StudentTranscriptRows.
- One StudentProfile has many AdvisorMessages with their Advisor.
- One Advisor has many AdvisorMessages with assigned students.
- One ManagedUser may have one StudentProfile when role is Student.
- One ManagedUser may authenticate through one Supabase Auth user.

## Service And Boundary Classes

These are useful as service/controller classes in UML.

| Service | Source | Responsibilities |
| --- | --- | --- |
| `AuthContext` | `src/context/AuthContext.tsx` | Login, logout, session persistence, user sync, password change, admin account create/reset/delete |
| `AppDataContext` | `src/context/AppDataContext.tsx` | Courses, planner selections, AI reviews, drafts, transcript rows, student insights, admin academic data |
| `MessagingContext` | `src/context/MessagingContext.tsx` | Advisor-student messages, notifications, assistance requests, read receipts, realtime sync |
| `OpenRouterScheduleAnalysisAPI` | `api/openrouter-schedule-analysis.ts` | Server-side AI schedule review |
| `OpenRouterChatAPI` | `api/openrouter-chat.ts` | Server-side free-form advising answer |
| `AdminCreateUserAPI` | `api/admin-create-user.ts` | Admin-only Supabase Auth user create/update plus generated password email |
| `AdminResetPasswordAPI` | `api/admin-reset-password.ts` | Admin-only generated password reset plus email |
| `AdminDeleteUserAPI` | `api/admin-delete-user.ts` | Admin-only account deletion |
| `AdminUpsertTranscriptEntryAPI` | `api/admin-upsert-transcript-entry.ts` | Admin-only transcript insert/update through service role |
| `PasswordResetInquiryAPI` | `api/password-reset-inquiry.ts` | Submit student/advisor password inquiry |
| `EmailService` | `api/_email.ts` | SMTP generated-password email sending |
| `RecaptchaService` | `src/lib/recaptcha.ts`, `api/verify-recaptcha.ts` | Login abuse protection |

The codebase also contains `ScheduleContext`, a legacy standalone schedule-selection context. It is not currently mounted by the active app routes and should not be treated as the primary planner model. The active planner model is in `AppDataContext`.

## Business Rules

### Role Rules

- Student pages require Student role.
- Advisor pages require Advisor role.
- Admin pages require Admin role.
- Wrong-role access redirects to the correct role home route.
- Unauthenticated access redirects to login.

### Password Rules

- Minimum length: 10.
- Must contain uppercase, lowercase, number, and special character.
- Login locks temporarily after 3 failed attempts.
- Users can change their own password only by providing the current password.
- Admin-generated passwords follow the same password rules.
- Admin reset emails are attempted after successful password save.

### User Creation Rules

- Admin creates all new users.
- User IDs are generated automatically.
- Passwords are generated automatically.
- Students must have an advisor assigned at creation.
- New student GPA starts at 0.
- New student completed credits start at 0.
- Student enrollment year is the current year.
- Student admission term is Fall.
- Student department is Computer Science.

### Planner Rules

- Student can only analyze selected eligible courses.
- Regular term max is 18 credits.
- Summer term max is 9 credits.
- Course prerequisites, concurrent courses, and minimum completed credits affect eligibility.
- Last completed review remains visible until another successful review or intentional draft load.
- Current editable selection and displayed completed review may differ.
- Saved drafts preserve an evaluation snapshot.

### Transcript Rules

- Mark can be blank or a whole number from 35 to 99.
- Attempt can be blank only when mark is blank.
- If mark is entered, attempt must be a whole number from 1 to 10.
- Grade 60 or above is passed.
- Grade below 60 is failed.
- Blank grade is in progress.
- Term credit limits are enforced.
- Transcript saves use admin API service-role writes to avoid browser RLS failures.

### Messaging Rules

- Student and advisor can message only within their assigned relationship.
- Assistance request is a special message from student to advisor.
- Message notifications and read receipts are derived from message state.

## Sequence Diagram Reference Flows

### Login

1. User selects role and enters ID/password.
2. Login page executes reCAPTCHA.
3. Client verifies reCAPTCHA token through `/api/verify-recaptcha`.
4. `AuthContext.login` looks up the app user.
5. Supabase signs in with email/password.
6. App validates role, status, and university ID.
7. App syncs users and records last login/seen.
8. Router redirects to role home.

### Student Runs AI Planner Review

1. Student selects term.
2. Student selects eligible courses.
3. Course Planner validates credit limit.
4. `AppDataContext.requestPlannerAnalysis` builds evaluation context.
5. Client calls `/api/openrouter-schedule-analysis`.
6. API calls OpenRouter.
7. API returns explanation and recommendations.
8. Client merges AI output with local score/factors.
9. Evaluation is persisted as the latest planner review snapshot.
10. Review renders with course breakdown, recommendations, notes, and rationale.

### Student Saves Draft

1. Student runs an analysis.
2. Student enters draft name.
3. Course Planner calls `saveScheduleDraft`.
4. App creates a draft with course codes, term, sync status, and evaluation.
5. Supabase mode inserts/updates draft and draft-course rows.
6. UI updates sync status.

### Advisor Reviews Student

1. Advisor opens dashboard.
2. Dashboard loads advisees from `studentInsights`.
3. Advisor selects View details.
4. Route opens `/app/advisor/student/:studentId`.
5. Page verifies the student belongs to the advisor.
6. Page displays KPIs, schedule, evaluation, drafts, and transcript tabs.

### Student Sends Advisor Message

1. Student opens Messages.
2. Messaging context resolves assigned advisor.
3. Student writes a message.
4. `sendMessage` validates relationship and body.
5. Message is saved locally and to Supabase when configured.
6. Advisor receives notification.
7. Advisor opens thread and marks messages read.

### Student Requests Assistance

1. Student clicks Ask for assistance.
2. App resolves assigned advisor.
3. `sendAssistanceRequest` sends special assistance message.
4. Advisor receives assistance notification.
5. Advisor opens focused message thread.

### Admin Creates Student

1. Admin opens User Management.
2. App generates next student ID.
3. Admin enters full name.
4. Admin selects Student role.
5. Admin selects advisor.
6. App generates compliant password.
7. Client calls admin create-user flow.
8. `/api/admin-create-user` validates admin token and admin role.
9. API creates or updates Supabase Auth user.
10. API upserts `app_users`.
11. App upserts `student_profiles`.
12. API sends generated password email.
13. UI reports success or email warning.

### Admin Generates Password Reset

1. Admin opens User Management.
2. Admin clicks Generate reset.
3. Client generates compliant password.
4. Client calls `/api/admin-reset-password`.
5. API validates admin token and role.
6. API updates Supabase Auth password.
7. API sends generated password email.
8. UI reports success or email warning.

### Admin Edits Transcript

1. Admin opens Student Management.
2. Admin opens a student's transcript.
3. Admin edits mark, attempt, or term.
4. Client validates all changed rows.
5. Client calls `/api/admin-upsert-transcript-entry`.
6. API validates admin token and role.
7. API resolves student and course records.
8. API inserts or updates `student_transcript_entries`.
9. API returns saved entry ID.
10. Client updates local transcript rows and derived GPA/credits.

### Password Inquiry

1. Student or advisor opens Login.
2. User selects role and opens Forgot password.
3. User enters university ID.
4. App submits password-reset inquiry.
5. Admin sees inquiry on Admin Overview.
6. Admin may generate password reset in User Management.
7. Admin marks inquiry resolved.

## Diagram Update Notes

Use-case diagrams should separate:

- Student academic planning and advisor communication.
- Advisor monitoring, reviewing, and messaging.
- Admin system management, user lifecycle, transcript editing, and course model maintenance.

Sequence diagrams should show external systems explicitly:

- Browser/client.
- Supabase Auth.
- Supabase Database.
- Vercel serverless API.
- OpenRouter.
- SMTP provider.
- reCAPTCHA.

Class diagrams should distinguish:

- Persistent domain entities: user, student profile, course, schedule draft, evaluation, transcript row, message, inquiry.
- Derived view models: student insight, term metric, transcript semester.
- Boundary/service classes: contexts and serverless APIs.
- External services: Supabase Auth, Supabase Database, OpenRouter, SMTP, reCAPTCHA.

Inactive or legacy surfaces:

- `ScheduleContext` exists but is not used by active routes.
- Advisor Course Analysis and Reports component files exist, but current advisor routes redirect to the dashboard.
- Admin model route redirects to Course Management.
