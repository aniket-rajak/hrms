import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface Mailer {
  sendPasswordReset(to: string, resetLink: string): Promise<void>;
  sendCredentials(to: string, email: string, password: string): Promise<void>;
}

function passwordResetHtml(resetLink: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
    <h2>Password Reset</h2>
    <p>You requested to reset your password for your HRMS account.</p>
    <p>This link expires in 60 minutes.</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 22px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Reset Password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  </div>`;
}

function credentialsHtml(email: string, password: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
    <h2>Welcome to HRMS</h2>
    <p>Your account has been created. Use the credentials below to sign in.</p>
    <p><strong>Email:</strong> ${email}<br/><strong>Temporary password:</strong> ${password}</p>
    <p>Please change your password after your first login.</p>
  </div>`;
}

class ConsoleMailer implements Mailer {
  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    console.log(`[mailer:dev] Password reset for ${to}: ${resetLink}`);
  }

  async sendCredentials(to: string, email: string, password: string): Promise<void> {
    console.log(`[mailer:dev] Credentials for ${to}: ${email} / ${password}`);
  }
}

class SmtpMailer implements Mailer {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
    });
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    await this.send(to, 'Reset your HRMS password', passwordResetHtml(resetLink));
  }

  async sendCredentials(to: string, email: string, password: string): Promise<void> {
    await this.send(to, 'Your HRMS account has been created', credentialsHtml(email, password));
  }
}

class BrevoMailer implements Mailer {
  private readonly endpoint = 'https://api.brevo.com/v3/smtp/email';

  constructor(private readonly apiKey: string) {}

  private async send(to: string, subject: string, html: string): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'HRMS', email: env.email.from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Brevo send failed (${res.status}): ${detail}`);
    }
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    await this.send(to, 'Reset your HRMS password', passwordResetHtml(resetLink));
  }

  async sendCredentials(to: string, email: string, password: string): Promise<void> {
    await this.send(to, 'Your HRMS account has been created', credentialsHtml(email, password));
  }
}

export function createMailer(): Mailer {
  if (env.email.provider === 'smtp' || (!env.email.brevoApiKey && env.smtp.host)) {
    return new SmtpMailer();
  }
  if (env.email.provider === 'brevo' || env.email.brevoApiKey) {
    return new BrevoMailer(env.email.brevoApiKey);
  }
  if (env.isProduction) {
    console.warn('[mailer] No email provider configured (Brevo API key or SMTP) - emails will only be logged.');
  }
  return new ConsoleMailer();
}

export const mailer = createMailer();
