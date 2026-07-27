import { createContext } from "react";

import type { LanguageInstance, Translations } from "./types";

export interface LanguageContextValue<T extends Translations = Translations>
  extends LanguageInstance<T> {
  isLoading?: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

LanguageContext.displayName = "LanguageContext";