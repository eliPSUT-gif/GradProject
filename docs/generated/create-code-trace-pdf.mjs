import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'generated');
const conciseMode = process.argv.includes('--concise');
const outputStem = conciseMode ? 'grad-project-key-code-snippets' : 'grad-project-code-trace';
const documentTitle = conciseMode
  ? 'Smart Academic Advisor - Key Code Snippets'
  : 'Smart Academic Advisor - Code Trace';
const pdfPath = path.join(outDir, `${outputStem}.pdf`);
const mdPath = path.join(outDir, `${outputStem}.md`);

const fullSnippets = [
  {
    title: '1. Login Form: role, reCAPTCHA, credentials',
    file: 'src/pages/LoginPage.tsx',
    start: 20,
    end: 93,
    why: [
      'Shows the role selector state and login submission entry point.',
      'Checks Supabase config, verifies reCAPTCHA, calls AuthContext.login, then routes to the selected role home.',
    ],
  },
  {
    title: '2. reCAPTCHA Client Verification Call',
    file: 'src/lib/recaptcha.ts',
    start: 80,
    end: 139,
    why: [
      'Generates the browser token and posts it to the server verification endpoint.',
      'Keeps login protected before credentials are sent to Supabase.',
    ],
  },
  {
    title: '3. reCAPTCHA Server Endpoint',
    file: 'api/verify-recaptcha.ts',
    start: 45,
    end: 145,
    why: [
      'Rejects non-POST requests and missing tokens.',
      'Bypasses preview deployments, but validates production requests against Google with action and score checks.',
    ],
  },
  {
    title: '4. Auth Session Hydration and Supabase User Mapping',
    file: 'src/context/AuthContext.tsx',
    start: 481,
    end: 650,
    why: [
      'Maps Supabase auth users back to public.app_users records.',
      'Restores session state on refresh and listens for Supabase auth changes.',
    ],
  },
  {
    title: '5. AuthContext.login: ID-to-email lookup and role check',
    file: 'src/context/AuthContext.tsx',
    start: 652,
    end: 760,
    why: [
      'Validates the selected role, active status, lockout state, and Supabase email binding.',
      'Signs in with Supabase, verifies the authenticated account matches the app user, then updates login metadata.',
    ],
  },
  {
    title: '6. Role-based Route Protection',
    file: 'src/App.tsx',
    start: 25,
    end: 90,
    why: [
      'ProtectedRoute blocks unauthenticated access and redirects users away from routes outside their role.',
      'The admin transcript-edit route is explicitly admin-only.',
    ],
  },
  {
    title: '7. Remote Data Snapshot: transcript and dashboard views',
    file: 'src/context/AppDataContext.tsx',
    start: 866,
    end: 909,
    why: [
      'Loads all app data needed after login in one remote snapshot.',
      'Pulls transcript rows from student_transcript_v and student summaries from student_dashboard_summary_v.',
    ],
  },
  {
    title: '8. Mapping Transcript Rows into Frontend State',
    file: 'src/context/AppDataContext.tsx',
    start: 1020,
    end: 1082,
    why: [
      'Converts DB transcript records into StudentTranscriptRow objects used by student, advisor, and admin pages.',
      'Builds completed-course sets and student profile summaries from transcript state.',
    ],
  },
  {
    title: '9. Shared Transcript Accessor',
    file: 'src/context/AppDataContext.tsx',
    start: 1264,
    end: 1348,
    why: [
      'Builds the transcript view consumed by dashboards.',
      'Merges recorded marks with catalog courses so untaken courses still appear in the transcript table.',
    ],
  },
  {
    title: '10. Advisor Student Detail: ownership guard',
    file: 'src/pages/advisor/AdvisorStudentDetailPage.tsx',
    start: 20,
    end: 110,
    why: [
      'Advisor page only resolves a profile when the student belongs to the logged-in advisor.',
      'Advisors can inspect schedule drafts, risk, GPA, and transcript rows.',
    ],
  },
  {
    title: '11. Advisor Transcript Display',
    file: 'src/pages/advisor/AdvisorStudentDetailPage.tsx',
    start: 380,
    end: 488,
    why: [
      'Shows advisor-facing full transcript and semester transcript views.',
      'Important boundary: this page displays marks, but does not mutate them.',
    ],
  },
  {
    title: '12. Admin Student List to Transcript Editor',
    file: 'src/pages/admin/AdminStudentsPage.tsx',
    start: 7,
    end: 111,
    why: [
      'Filters users to students and links admins into /app/admin/students/:studentId/transcript.',
      'This is the UI entry point for changing a mark.',
    ],
  },
  {
    title: '13. Admin Transcript Editor: validation and save loop',
    file: 'src/pages/admin/AdminStudentTranscriptPage.tsx',
    start: 85,
    end: 223,
    why: [
      'Tracks edited draft rows and validates whole-number marks from 35 to 99 plus attempt numbers from 1 to 10.',
      'Only changed rows are saved; each row is sent through upsertTranscriptEntry.',
    ],
  },
  {
    title: '14. Admin Transcript Editor: mark inputs',
    file: 'src/pages/admin/AdminStudentTranscriptPage.tsx',
    start: 265,
    end: 373,
    why: [
      'Shows the exact inputs used to change attempt number, semester taken, mark, and derived status.',
      'The Save button above this table persists draftRows through handleSave.',
    ],
  },
  {
    title: '15. AppData upsertTranscriptEntry: client validation, API call, local sync',
    file: 'src/context/AppDataContext.tsx',
    start: 1980,
    end: 2054,
    why: [
      'Normalizes status from the grade, revalidates against catalog and current transcript rows, then calls the admin API.',
      'After success, syncDerivedTranscriptState updates GPA, completed credits, and transcript state in the UI.',
    ],
  },
  {
    title: '16. Admin Transcript API: service-role write with admin guard',
    file: 'api/admin-upsert-transcript-entry.ts',
    start: 17,
    end: 201,
    why: [
      'Uses the Supabase service-role client only on the server.',
      'Verifies the bearer token belongs to an admin app user before updating or upserting student_transcript_entries.',
    ],
  },
  {
    title: '17. Transcript Table and Mark Normalization',
    file: 'supabase/007_transcript_first_academic_schema.sql',
    start: 29,
    end: 66,
    why: [
      'Defines the canonical transcript table: student, term, course, final_grade, status, attempt_no.',
      'The unique key prevents duplicate student/course/term/attempt records.',
    ],
  },
  {
    title: '18. Transcript and GPA-derived Views',
    file: 'supabase/007_transcript_first_academic_schema.sql',
    start: 215,
    end: 330,
    why: [
      'student_transcript_v exposes joined transcript rows to the app.',
      'student_dashboard_summary_v derives GPA and completed credits from transcript marks for dashboards.',
    ],
  },
];

const conciseSnippets = [
  {
    title: '1. Login submission and security gate',
    file: 'src/pages/LoginPage.tsx',
    start: 61,
    end: 88,
    why: [
      'Most likely login question: what happens when the user presses sign in?',
      'This shows config checks, reCAPTCHA verification, AuthContext.login, and role-home navigation.',
    ],
  },
  {
    title: '2. AuthContext.login role and Supabase check',
    file: 'src/context/AuthContext.tsx',
    start: 689,
    end: 748,
    why: [
      'Most likely auth question: how do you prevent a user from selecting the wrong role?',
      'The app resolves the university ID, verifies role/status/email, signs in with Supabase, then confirms the auth user maps back to the same app user.',
    ],
  },
  {
    title: '3. Protected routes and role boundaries',
    file: 'src/App.tsx',
    start: 25,
    end: 90,
    why: [
      'Most likely authorization question: how are student/advisor/admin screens separated?',
      'ProtectedRoute redirects unauthenticated users and blocks roles from routes they do not own.',
    ],
  },
  {
    title: '4. Remote data snapshot after login',
    file: 'src/context/AppDataContext.tsx',
    start: 866,
    end: 899,
    why: [
      'Most likely data-flow question: where does dashboard/transcript data come from?',
      'This single snapshot loads courses, student summaries, transcript view rows, drafts, and related academic data from Supabase.',
    ],
  },
  {
    title: '5. Advisor ownership guard',
    file: 'src/pages/advisor/AdvisorStudentDetailPage.tsx',
    start: 20,
    end: 40,
    why: [
      'Most likely advisor question: can an advisor see every student?',
      'The page only resolves a profile when the student advisorId matches the logged-in advisor ID.',
    ],
  },
  {
    title: '6. Admin transcript validation and save path',
    file: 'src/pages/admin/AdminStudentTranscriptPage.tsx',
    start: 133,
    end: 212,
    why: [
      'Most likely mark-changing question: how is input validated before saving?',
      'The editor accepts whole-number marks from 35 to 99, attempt numbers from 1 to 10, saves only changed rows, and sends each change through upsertTranscriptEntry.',
    ],
  },
  {
    title: '7. Admin transcript mark input UI',
    file: 'src/pages/admin/AdminStudentTranscriptPage.tsx',
    start: 297,
    end: 355,
    why: [
      'Most likely UI question: which exact fields are editable?',
      'The admin can change attempt number, semester taken, and mark; status is derived from the mark.',
    ],
  },
  {
    title: '8. Client upsert: revalidate, call API, sync derived state',
    file: 'src/context/AppDataContext.tsx',
    start: 1998,
    end: 2054,
    why: [
      'Most likely state-management question: what happens after Save changes?',
      'The client normalizes status, validates again, calls the admin endpoint, then updates local transcript/GPA-derived state.',
    ],
  },
  {
    title: '9. Server endpoint: admin-only service-role write',
    file: 'api/admin-upsert-transcript-entry.ts',
    start: 45,
    end: 65,
    why: [
      'Most likely security question: how do you stop non-admin users from changing marks?',
      'The API validates the bearer token with Supabase Auth and requires a matching public.app_users admin record before any write.',
    ],
  },
  {
    title: '10. Server endpoint: validate and persist mark',
    file: 'api/admin-upsert-transcript-entry.ts',
    start: 76,
    end: 193,
    why: [
      'Most likely backend question: what is written to the database?',
      'The endpoint validates student/course/grade/attempt, resolves IDs, then updates an existing transcript row or upserts by student/course/term/attempt.',
    ],
  },
  {
    title: '11. Database transcript table',
    file: 'supabase/007_transcript_first_academic_schema.sql',
    start: 29,
    end: 40,
    why: [
      'Most likely schema question: where are marks stored?',
      'student_transcript_entries is the canonical table for term, course, final_grade, status, and attempt number.',
    ],
  },
  {
    title: '12. Database views derive transcript, GPA, and credits',
    file: 'supabase/007_transcript_first_academic_schema.sql',
    start: 215,
    end: 323,
    why: [
      'Most likely dashboard question: how does changing a mark affect GPA?',
      'Views expose joined transcript rows and recompute GPA/completed credits from the transcript table.',
    ],
  },
];

const snippets = conciseMode ? conciseSnippets : fullSnippets;

const flow = [
  '1. User opens /login, selects role, enters ID and password.',
  '2. LoginPage obtains and verifies a reCAPTCHA token before credentials are processed.',
  '3. AuthContext.login looks up the app user by university ID, checks selected role/status, and signs in with Supabase email/password.',
  '4. AuthContext resolves the Supabase auth user back to public.app_users and stores the role-aware session.',
  '5. App.tsx routes the user to the correct protected area. Admin transcript editing is only reachable through an admin route.',
  '6. AppDataContext loads Supabase views into frontend state: courses, students, transcripts, GPA summaries, drafts, and evaluations.',
  '7. Advisors inspect advisee transcript and risk views, guarded by advisorId === current user ID.',
  '8. Admins open a student transcript, edit mark/attempt/term fields, and click Save changes.',
  '9. The admin transcript page validates the edits and calls upsertTranscriptEntry for each changed row.',
  '10. upsertTranscriptEntry revalidates, posts to /api/admin-upsert-transcript-entry, then refreshes derived frontend transcript/GPA state.',
  '11. The server endpoint checks the bearer token belongs to an admin and writes student_transcript_entries using the service role.',
  '12. SQL views expose updated transcript rows and recomputed GPA/completed credits back to the dashboards.',
];

function readRange(file, start, end) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  return lines.slice(start - 1, end).map((line, index) => {
    const number = String(start + index).padStart(4, ' ');
    return `${number}  ${line}`;
  });
}

function normalizeText(input) {
  return String(input)
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?');
}

function escapePdfString(input) {
  return normalizeText(input)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text, maxChars) {
  const normalized = normalizeText(text);
  if (normalized.length <= maxChars) return [normalized];
  const words = normalized.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapCode(line, maxChars) {
  const normalized = normalizeText(line).replace(/\t/g, '  ');
  if (normalized.length <= maxChars) return [normalized];
  const chunks = [];
  let remaining = normalized;
  while (remaining.length > maxChars) {
    chunks.push(remaining.slice(0, maxChars));
    remaining = '      ' + remaining.slice(maxChars);
  }
  chunks.push(remaining);
  return chunks;
}

class PdfBuilder {
  constructor() {
    this.width = 842;
    this.height = 595;
    this.margin = 36;
    this.pages = [];
    this.current = [];
    this.y = this.height - this.margin;
  }

  newPage() {
    if (this.current.length > 0) {
      this.pages.push(this.current.join('\n'));
    }
    this.current = [];
    this.y = this.height - this.margin;
  }

  ensure(space) {
    if (this.y - space < this.margin) {
      this.newPage();
    }
  }

  text(line, x, y, size, font = 'F1') {
    this.current.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfString(line)}) Tj ET`);
  }

  drawText(line, { x = this.margin, size = 10, font = 'F1', leading = 13 } = {}) {
    this.ensure(leading);
    this.text(line, x, this.y, size, font);
    this.y -= leading;
  }

  paragraph(text, { x = this.margin, size = 10, leading = 13, maxChars = 116 } = {}) {
    for (const line of wrapText(text, maxChars)) {
      this.drawText(line, { x, size, leading });
    }
  }

  heading(text) {
    this.ensure(38);
    this.drawText(text, { size: 15, leading: 19, font: 'F2' });
  }

  subheading(text) {
    this.ensure(28);
    this.drawText(text, { size: 12, leading: 16, font: 'F2' });
  }

  bullet(text) {
    const lines = wrapText(text, 108);
    lines.forEach((line, index) => {
      this.drawText(`${index === 0 ? '- ' : '  '}${line}`, { x: this.margin + 12, size: 9.5, leading: 12 });
    });
  }

  code(lines) {
    const maxChars = 174;
    this.ensure(22);
    this.drawText('Code snippet', { size: 8.5, leading: 11, font: 'F2' });
    for (const sourceLine of lines) {
      for (const wrapped of wrapCode(sourceLine, maxChars)) {
        this.drawText(wrapped, { x: this.margin + 8, size: 7, leading: 8.6, font: 'F3' });
      }
    }
    this.y -= 7;
  }

  finish() {
    if (this.current.length > 0) {
      this.pages.push(this.current.join('\n'));
    }

    const objects = [];
    const add = (content) => {
      objects.push(content);
      return objects.length;
    };

    const catalogId = 1;
    const pagesId = 2;
    const fontRegularId = 3;
    const fontBoldId = 4;
    const fontMonoId = 5;
    objects.push(''); // catalog placeholder
    objects.push(''); // pages placeholder
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

    const pageIds = [];
    for (const pageContent of this.pages) {
      const stream = `${pageContent}\n`;
      const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
      const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
  }
}

function buildMarkdown() {
  const lines = [
    `# ${documentTitle} for Grad Project Discussion`,
    '',
    conciseMode
      ? 'Purpose: show only the most important code aspects you are most likely to be asked about in the discussion.'
      : 'Purpose: show the most important code path from login to transcript/mark editing, with enough surrounding code to defend design decisions.',
    '',
    'Important boundary: advisors can inspect advisee transcript and risk data. Changing marks is intentionally admin-only through `/app/admin/students/:studentId/transcript` and `/api/admin-upsert-transcript-entry`.',
    '',
    '## End-to-end trace',
    '',
    ...flow.map((item) => `- ${item}`),
    '',
  ];

  snippets.forEach((snippet) => {
    lines.push(`## ${snippet.title}`);
    lines.push('');
    lines.push(`Source: \`${snippet.file}:${snippet.start}-${snippet.end}\``);
    lines.push('');
    snippet.why.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
    lines.push('```');
    lines.push(...readRange(snippet.file, snippet.start, snippet.end));
    lines.push('```');
    lines.push('');
  });

  return normalizeText(lines.join('\n'));
}

function buildPdf() {
  const pdf = new PdfBuilder();
  pdf.heading(documentTitle);
  pdf.paragraph(
    conciseMode
      ? 'Grad project discussion PDF: only the highest-value snippets you are most likely to be asked about: authentication, role protection, data loading, advisor access, admin mark editing, server-side enforcement, and transcript/GPA persistence.'
      : 'Grad project discussion PDF: the most important source snippets from login through protected routing, data loading, advisor transcript review, admin mark editing, API persistence, and SQL-derived GPA views.',
    { size: 10.5, maxChars: 118 }
  );
  pdf.drawText(`Generated from repository source on ${new Date().toISOString().slice(0, 10)}.`, { size: 9, leading: 13 });
  pdf.y -= 8;

  pdf.subheading('Primary defense points');
  [
    'Authentication is handled by Supabase Auth, but app roles come from public.app_users and are checked before role routes are shown.',
    'The login flow is protected by reCAPTCHA before AuthContext.login processes credentials.',
    'Advisor views are read-only and scoped to the logged-in advisor via advisorId.',
    'Changing marks is admin-only: route guard in App.tsx, UI validation in AdminStudentTranscriptPage, and token/admin verification in the server endpoint.',
    'Transcript marks are persisted in student_transcript_entries; SQL views recompute transcript rows, GPA, and completed credits for dashboards.',
  ].forEach((item) => pdf.bullet(item));
  pdf.y -= 8;

  pdf.subheading('End-to-end trace');
  flow.forEach((item) => pdf.bullet(item));
  pdf.y -= 10;

  snippets.forEach((snippet) => {
    pdf.heading(snippet.title);
    pdf.drawText(`Source: ${snippet.file}:${snippet.start}-${snippet.end}`, { size: 8.8, leading: 12, font: 'F3' });
    snippet.why.forEach((item) => pdf.bullet(item));
    pdf.code(readRange(snippet.file, snippet.start, snippet.end));
  });

  return pdf.finish();
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(mdPath, buildMarkdown(), 'utf8');
fs.writeFileSync(pdfPath, buildPdf());

console.log(`Wrote ${path.relative(root, pdfPath)}`);
console.log(`Wrote ${path.relative(root, mdPath)}`);
