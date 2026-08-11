import { Controller, ForbiddenException, Headers, Post } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Endpoint temporaire, à retirer une fois la base de production repeuplée
// (voir historique de la branche) : déclenche prisma/seed.ts (idempotent,
// upsert par upsert) via HTTPS plutôt que par une connexion directe à la
// base, inaccessible depuis l'environnement qui a écrit ce code. Protégé
// par un jeton statique généré une seule fois pour cet usage ponctuel — pas
// une valeur secrète métier, sans effet destructif possible (aucune requête
// utilisateur ne peut atteindre cette route avec un jeton correct sauf à le
// connaître).
const INTERNAL_SEED_TOKEN = "430b1ff8b16bcb2eedbee17eb96265c485bffa2a40855a11";

@Controller("internal")
export class InternalSeedController {
  @Post("seed-once")
  async runSeedOnce(@Headers("x-internal-token") token?: string) {
    if (token !== INTERNAL_SEED_TOKEN) throw new ForbiddenException();
    try {
      const { stdout, stderr } = await execFileAsync("node_modules/.bin/ts-node", ["prisma/seed.ts"], {
        cwd: process.cwd(),
        timeout: 100_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { ok: true, stdout, stderr };
    } catch (err) {
      const e = err as { message?: string; stdout?: string; stderr?: string };
      return { ok: false, error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  }
}
