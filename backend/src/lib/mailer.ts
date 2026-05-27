import { createTransport, type Transporter } from "nodemailer";

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in .env");
  }

  return createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

let _transporter: Transporter | null = null;

function transporter(): Transporter {
  if (!_transporter) {
    _transporter = getTransporter();
  }
  return _transporter;
}

type SendMailArgs = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail({ to, subject, text }: SendMailArgs): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;

  await transporter().sendMail({
    from,
    to,
    subject,
    text,
  });
}
