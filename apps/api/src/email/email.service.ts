import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import {
  accountCreatedEmail,
  orderConfirmedEmail,
  orderStatusChangedEmail,
  passwordResetEmail,
  type OrderEmailLine,
} from "./email.templates";

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly outboxDir = join(__dirname, "..", "..", ".mail-outbox");

  async onModuleInit() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      this.logger.log(`SMTP transport configured (${process.env.SMTP_HOST})`);
    } else {
      await mkdir(this.outboxDir, { recursive: true }).catch(() => undefined);
      this.logger.warn(
        `SMTP_HOST not set — transactional emails will be logged to ${this.outboxDir} instead of being sent`,
      );
    }
  }

  private async send(to: string, subject: string, html: string) {
    const from = `${process.env.MAIL_FROM_NAME ?? "UniversEnfants"} <${process.env.MAIL_FROM_ADDRESS ?? "no-reply@universenfants.ma"}>`;
    try {
      if (this.transporter) {
        await this.transporter.sendMail({ from, to, subject, html });
      } else {
        const file = join(this.outboxDir, `${Date.now()}-${to.replace(/[^a-z0-9@.]/gi, "_")}.html`);
        await writeFile(file, html, "utf-8");
        this.logger.log(`[dev] Email "${subject}" to ${to} written to ${file}`);
      }
    } catch (err) {
      // §O3 : l'envoi d'un email ne doit jamais faire échouer l'action métier
      // qui le déclenche (inscription, commande, etc.).
      this.logger.error(`Failed to send email "${subject}" to ${to}: ${(err as Error).message}`);
    }
  }

  sendAccountCreated(to: string, firstName: string | null) {
    const { subject, html } = accountCreatedEmail(firstName);
    return this.send(to, subject, html);
  }

  sendPasswordReset(to: string, resetUrl: string) {
    const { subject, html } = passwordResetEmail(resetUrl);
    return this.send(to, subject, html);
  }

  sendOrderConfirmed(to: string, orderNumber: string, lines: OrderEmailLine[], total: number) {
    const { subject, html } = orderConfirmedEmail(orderNumber, lines, total);
    return this.send(to, subject, html);
  }

  sendOrderStatusChanged(to: string, orderNumber: string, status: string) {
    const { subject, html } = orderStatusChangedEmail(orderNumber, status);
    return this.send(to, subject, html);
  }
}
