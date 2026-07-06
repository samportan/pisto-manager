import en from "@/messages/en.json";
import es from "@/messages/es.json";

import type { Locale } from "./config";

const catalogs = { en, es } as const;

export type Messages = typeof en;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}
