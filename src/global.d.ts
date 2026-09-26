import type messages from "./i18n/messages/es.json";
import type { routing } from "./i18n/routing";

// Type-checks locales and message keys: t("HomePage.typo") fails to compile.
// Spanish is the source of truth; every other locale must match its keys.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
