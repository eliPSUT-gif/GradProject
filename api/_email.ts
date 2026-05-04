type Role = 'student' | 'advisor' | 'admin';

const DEFAULT_SMTP_HOST = 'mail.spacemail.com';
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_PASSWORD_EMAIL_FROM = 'SmartAdvisor <admin@psut.site>';
const DEFAULT_PASSWORD_EMAIL_TO = 'eli20220677@std.psut.edu.jo';

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getSmtpPort() {
  const rawPort = process.env.SMTP_PORT?.trim();
  if (!rawPort) {
    return DEFAULT_SMTP_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive integer.');
  }

  return port;
}

function getSmtpSecure(port: number) {
  const rawSecure = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (!rawSecure) {
    return port === 465;
  }

  return rawSecure === 'true' || rawSecure === '1' || rawSecure === 'yes';
}

export async function sendGeneratedPasswordEmail(input: {
  fullName: string;
  universityId: string;
  role: Role;
  password: string;
  action: 'created' | 'reset';
}) {
  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default ?? nodemailerModule;
  const port = getSmtpPort();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST,
    port,
    secure: getSmtpSecure(port),
    auth: {
      user: getRequiredEnv('SMTP_USER'),
      pass: getRequiredEnv('SMTP_PASSWORD'),
    },
  });

  await transporter.sendMail({
    from: process.env.PASSWORD_EMAIL_FROM?.trim() || DEFAULT_PASSWORD_EMAIL_FROM,
    to: process.env.PASSWORD_EMAIL_TO?.trim() || DEFAULT_PASSWORD_EMAIL_TO,
    subject: `SmartAdvisor ${input.action === 'created' ? 'new account' : 'password reset'}: ${input.universityId}`,
    text: [
      `SmartAdvisor account ${input.action === 'created' ? 'created' : 'password reset'}.`,
      '',
      `Name: ${input.fullName}`,
      `User ID: ${input.universityId}`,
      `Role: ${input.role}`,
      `Temporary password: ${input.password}`,
      '',
      'Use this password to log in. The user can change it from their settings after login.',
    ].join('\n'),
  });
}
