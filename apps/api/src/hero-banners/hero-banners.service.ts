import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ImageService } from "../storage/image.service";
import { AuditLogService } from "../common/audit-log.service";

export interface HeroBannerFields {
  titleFr: string;
  titleAr?: string;
  subtitleFr?: string;
  subtitleAr?: string;
  link?: string;
  order?: number;
  startAt?: string;
  endAt?: string;
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}

/** HeroBanner existait en base sans aucun contrôleur ni UI — la home était
 * codée en dur dans hero-carousel.tsx, sans possibilité de la piloter
 * depuis le Back-Office. */
@Injectable()
export class HeroBannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.heroBanner.findMany({ orderBy: { order: "asc" } });
  }

  /** Bannières réellement affichables maintenant : statut ACTIVE et, si
   * une fenêtre de programmation est définie, la date courante doit y être
   * comprise. */
  async listActive() {
    const now = new Date();
    const all = await this.prisma.heroBanner.findMany({ where: { status: "ACTIVE" }, orderBy: { order: "asc" } });
    return all.filter((b) => (!b.startAt || b.startAt <= now) && (!b.endAt || b.endAt >= now));
  }

  async create(fields: HeroBannerFields, desktopBuffer: Buffer, mobileBuffer: Buffer | undefined, staffUserId: string) {
    if (!fields.titleFr?.trim()) throw new BadRequestException("Titre requis");
    const desktop = await this.images.processAndUpload(desktopBuffer, "hero-banners");
    // Image mobile facultative : par défaut on réutilise le visuel desktop
    // (recadré différemment côté site) plutôt que d'exiger deux uploads —
    // un admin pressé peut toujours en ajouter une dédiée plus tard.
    const mobile = mobileBuffer ? await this.images.processAndUpload(mobileBuffer, "hero-banners") : desktop;
    const created = await this.prisma.heroBanner.create({
      data: {
        ...this.parseFields(fields),
        imageDesktop: desktop.url,
        imageMobile: mobile.url,
      },
    });
    await this.auditLog.record({ staffUserId, action: "heroBanner.create", entity: "HeroBanner", entityId: created.id, newValue: fields });
    return created;
  }

  async update(
    id: string,
    fields: HeroBannerFields,
    desktopBuffer: Buffer | undefined,
    mobileBuffer: Buffer | undefined,
    staffUserId: string,
  ) {
    const existing = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Bannière introuvable");
    const desktop = desktopBuffer ? await this.images.processAndUpload(desktopBuffer, "hero-banners") : null;
    const mobile = mobileBuffer ? await this.images.processAndUpload(mobileBuffer, "hero-banners") : null;
    const updated = await this.prisma.heroBanner.update({
      where: { id },
      data: {
        ...this.parsePartialFields(fields),
        ...(desktop ? { imageDesktop: desktop.url } : {}),
        ...(mobile ? { imageMobile: mobile.url } : {}),
      },
    });
    await this.auditLog.record({ staffUserId, action: "heroBanner.update", entity: "HeroBanner", entityId: id, newValue: fields });
    return updated;
  }

  async remove(id: string, staffUserId: string) {
    const existing = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Bannière introuvable");
    await this.prisma.heroBanner.delete({ where: { id } });
    await this.auditLog.record({ staffUserId, action: "heroBanner.delete", entity: "HeroBanner", entityId: id });
    return { ok: true };
  }

  private parseFields(fields: HeroBannerFields) {
    const order = fields.order !== undefined ? Number(fields.order) : undefined;
    if (order !== undefined && !Number.isFinite(order)) throw new BadRequestException("Ordre invalide");
    const status = fields.status;
    if (status && !["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"].includes(status)) throw new BadRequestException("Statut invalide");
    return {
      titleFr: fields.titleFr,
      titleAr: fields.titleAr || null,
      subtitleFr: fields.subtitleFr || null,
      subtitleAr: fields.subtitleAr || null,
      link: fields.link || null,
      order,
      startAt: fields.startAt ? new Date(fields.startAt) : null,
      endAt: fields.endAt ? new Date(fields.endAt) : null,
      status,
    };
  }

  // À la différence de parseFields (utilisé à la création, où toutes les
  // valeurs doivent exister), une mise à jour ne doit toucher QUE les
  // champs réellement envoyés — sinon un appel partiel comme le simple
  // bouton "Activer/Désactiver" (qui n'envoie que titleFr + status)
  // écrasait silencieusement le sous-titre, le lien et les dates de
  // validité existants avec null à chaque clic.
  private parsePartialFields(fields: HeroBannerFields) {
    const data: Record<string, unknown> = {};
    if (fields.titleFr !== undefined) data.titleFr = fields.titleFr;
    if (fields.titleAr !== undefined) data.titleAr = fields.titleAr || null;
    if (fields.subtitleFr !== undefined) data.subtitleFr = fields.subtitleFr || null;
    if (fields.subtitleAr !== undefined) data.subtitleAr = fields.subtitleAr || null;
    if (fields.link !== undefined) data.link = fields.link || null;
    if (fields.order !== undefined) {
      const order = Number(fields.order);
      if (!Number.isFinite(order)) throw new BadRequestException("Ordre invalide");
      data.order = order;
    }
    if (fields.startAt !== undefined) data.startAt = fields.startAt ? new Date(fields.startAt) : null;
    if (fields.endAt !== undefined) data.endAt = fields.endAt ? new Date(fields.endAt) : null;
    if (fields.status !== undefined) {
      if (!["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"].includes(fields.status)) throw new BadRequestException("Statut invalide");
      data.status = fields.status;
    }
    return data;
  }
}
