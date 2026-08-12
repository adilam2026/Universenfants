import { Injectable, Logger } from "@nestjs/common";
import { maskPhone, normalizeMoroccanPhone } from "../common/phone.util";

const GRAPH_API_VERSION = "v21.0";

/** Aucune intégration WhatsApp n'existait dans le projet — client WhatsApp
 * Business Cloud API (Meta) écrit depuis zéro. Un OTP est un message
 * "business-initiated" (pas de conversation client ouverte au préalable) :
 * l'API Meta impose dans ce cas un *message template* pré-approuvé, jamais
 * du texte libre — WHATSAPP_OTP_TEMPLATE_NAME doit correspondre à un
 * template de catégorie "Authentication" validé côté Meta Business Manager.
 * Ça ne peut pas être fait depuis ce code, uniquement depuis leur compte. */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get configured(): boolean {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  /** Ne renvoie jamais l'échec au flux appelant (même §O3 que EmailService) :
   * l'endpoint public de demande d'OTP reste sans exception, quelle que soit
   * l'issue réelle de l'envoi — sinon la présence/absence d'erreur devient
   * elle-même un moyen d'énumérer les commandes existantes. */
  async sendOtp(phoneRaw: string, code: string): Promise<boolean> {
    const phone = normalizeMoroccanPhone(phoneRaw);
    if (!this.configured) {
      this.logger.warn(`[dev] WhatsApp non configuré — OTP pour ${maskPhone(phone)} : ${code}`);
      return false;
    }
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: process.env.WHATSAPP_OTP_TEMPLATE_NAME ?? "otp_verification",
            language: { code: process.env.WHATSAPP_OTP_TEMPLATE_LANG ?? "fr" },
            components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
          },
        }),
        // Sans timeout, un appel Graph API qui ne répond plus bloquerait la
        // requête de demande d'OTP indéfiniment (même raison que les
        // timeouts déjà en place sur SMTP et R2).
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.logger.error(`Envoi WhatsApp échoué (${res.status}) pour ${maskPhone(phone)} : ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Erreur d'envoi WhatsApp pour ${maskPhone(phone)} : ${(err as Error).message}`);
      return false;
    }
  }
}
