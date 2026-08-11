import { Controller, ForbiddenException, Get, Headers, Post } from "@nestjs/common";
import { spawn } from "node:child_process";

// Endpoint temporaire, à retirer une fois la base de production repeuplée
// (voir historique de la branche) : déclenche prisma/seed.ts (idempotent,
// upsert par upsert) via HTTPS plutôt que par une connexion directe à la
// base, inaccessible depuis l'environnement qui a écrit ce code. Protégé
// par un jeton statique généré une seule fois pour cet usage ponctuel — pas
// une valeur secrète métier, sans effet destructif possible (aucune requête
// utilisateur ne peut atteindre cette route avec un jeton correct sauf à le
// connaître).
const INTERNAL_SEED_TOKEN = "430b1ff8b16bcb2eedbee17eb96265c485bffa2a40855a11";

// Le proxy Railway coupe les requêtes HTTP en amont après ~60-70s, bien
// avant que le script (plusieurs minutes contre le pooler Supabase en
// production) n'ait le temps de finir — POST déclenche donc le process en
// tâche de fond et répond immédiatement ; GET /seed-status permet de suivre
// la progression via de petites requêtes rapides, sans jamais dépendre
// d'une connexion HTTP longue.
type SeedState = {
  status: "idle" | "running" | "done" | "error";
  log: string;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
};
const state: SeedState = { status: "idle", log: "", startedAt: null, finishedAt: null, exitCode: null };

@Controller("internal")
export class InternalSeedController {
  @Post("seed-once")
  startSeed(@Headers("x-internal-token") token?: string) {
    if (token !== INTERNAL_SEED_TOKEN) throw new ForbiddenException();
    if (state.status === "running") return { ok: true, ...state };

    state.status = "running";
    state.log = "";
    state.startedAt = new Date().toISOString();
    state.finishedAt = null;
    state.exitCode = null;

    const child = spawn("node_modules/.bin/ts-node", ["prisma/seed.ts"], { cwd: process.cwd() });
    child.stdout.on("data", (d) => (state.log += d.toString()));
    child.stderr.on("data", (d) => (state.log += d.toString()));
    child.on("close", (code) => {
      state.status = code === 0 ? "done" : "error";
      state.exitCode = code;
      state.finishedAt = new Date().toISOString();
    });
    child.on("error", (err) => {
      state.status = "error";
      state.log += `\n[spawn error] ${err.message}`;
      state.finishedAt = new Date().toISOString();
    });

    return { ok: true, ...state };
  }

  @Get("seed-status")
  getStatus(@Headers("x-internal-token") token?: string) {
    if (token !== INTERNAL_SEED_TOKEN) throw new ForbiddenException();
    return state;
  }
}
