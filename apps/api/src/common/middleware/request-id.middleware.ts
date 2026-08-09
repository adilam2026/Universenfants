import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  // Seule syntaxe possible pour augmenter l'interface Express.Request d'un namespace ambient tiers.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/** Corrèle les lignes de logs et les erreurs Sentry d'une même requête à
 * travers toute la chaîne (middlewares, services, filtre d'exceptions) —
 * indispensable en production où plusieurs requêtes s'entrelacent dans les
 * mêmes logs. Réutilise x-request-id du proxy amont s'il en fournit un. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  // Longueur plafonnée : un client (pas seulement le proxy amont) peut
  // fournir cet en-tête — on l'accepte pour la corrélation bout-en-bout,
  // mais sans laisser une valeur arbitrairement longue polluer les logs.
  req.id = typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
