import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // /lp/* (Landing Pages marketing) est volontairement exclu du routage de
  // locale : ce sont des pages autonomes, sans chrome du site (§17 "être
  // très rapides", §16 mobile first), pas besoin du préfixe /fr|/ar.
  matcher: ["/((?!api|_next|_vercel|lp|.*\\..*).*)"],
};
