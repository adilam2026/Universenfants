import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// L'identifiant de commande vient EXCLUSIVEMENT du token vérifié par
// GuestOrderTrackingGuard (req.guestOrderId), jamais d'un paramètre de
// route/query fourni par le client — impossible de consulter une autre
// commande en modifiant l'URL, il n'y a tout simplement pas d'ID dans l'URL.
export const CurrentGuestOrderId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request & { guestOrderId: string }>();
  return req.guestOrderId;
});
