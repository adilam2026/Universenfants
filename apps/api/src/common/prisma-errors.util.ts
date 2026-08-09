import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/** Convertit une violation de contrainte unique Prisma (P2002) en 400
 * explicite plutôt que de laisser remonter un 500 générique — utile pour
 * tout create()/update() portant sur un champ unique (slug, code, nom...)
 * saisi par un admin, dont l'erreur est toujours corrigeable côté client. */
export async function runCatchingDuplicate<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new BadRequestException(message);
    }
    throw err;
  }
}
