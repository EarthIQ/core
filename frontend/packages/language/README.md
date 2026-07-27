# @packages/language

A lightweight, type-safe internationalization (i18n) package for React and Node.js applications. Built for monorepo architectures with support for pluralization, interpolation, and comprehensive formatting utilities.

## Features

- 🌍 **Multi-language Support** - Easy locale management and switching
- 🔤 **Type-safe** - Full TypeScript support with proper typing
- 📝 **Interpolation** - Variable substitution with `{{variable}}` syntax
- 🔢 **Pluralization** - Automatic plural handling via `Intl.PluralRules`
- 📅 **Date Formatting** - Localized date formatting with presets
- 💰 **Number & Currency** - Locale-aware number and currency formatting
- ⏰ **Relative Time** - "2 hours ago" style formatting
- 📋 **List Formatting** - Localized list formatting (and, or)
- 🪝 **React Hooks** - `useTranslation`, `useLocale`, `useFormat`
- 💾 **Persistence** - Auto-save locale preference to localStorage
- 🖥️ **SSR Ready** - Works with Next.js and server-side rendering
- 📦 **Lightweight** - No external dependencies (uses native Intl APIs)
- 🔄 **Namespace Support** - Organize translations with namespaces

## Installation

```bash
# pnpm (recommended for monorepos)
pnpm add @packages/language

# npm
npm install @packages/language

# yarn
yarn add @packages/language
```

## Quick Start

### 1. Create Locale Files

```
src/locales/
├── en.json
├── es.json
└── index.ts
```

**`en.json`**
```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "greeting": "Hello, {{name}}!",
  "items": "No items | {{count}} item | {{count}} items"
}
```

**`es.json`**
```json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar"
  },
  "greeting": "¡Hola, {{name}}!",
  "items": "Sin artículos | {{count}} artículo | {{count}} artículos"
}
```

**`index.ts`**
```typescript
import type { LanguageConfig } from "@packages/language";

import en from "./en.json";
import es from "./es.json";

export const translations = {
  en,
  es,
} as const;

export type AppTranslations = typeof translations;
export type AppLocale = keyof AppTranslations;

export const languageConfig: LanguageConfig<AppTranslations> = {
  translations,
  defaultLocale: "en",
  fallbackLocale: "en",
};
```

### 2. Setup Provider (React)

```tsx
// providers/language-provider.tsx
"use client";

import { LanguageProvider as BaseLanguageProvider } from "@packages/language/react";
import { languageConfig } from "@/locales";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseLanguageProvider
      config={languageConfig}
      persistKey="app-locale"
      onLocaleChange={(locale) => {
        document.documentElement.lang = locale;
      }}
    >
      {children}
    </BaseLanguageProvider>
  );
}
```

```tsx
// app/layout.tsx
import { LanguageProvider } from "@/providers/language-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
```

### 3. Use Translations

```tsx
"use client";

import { useTranslation, useFormat } from "@packages/language/react";

export function MyComponent() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();

  return (
    <div>
      <p>{t("greeting", { name: "John" })}</p>
      <p>{t("items", { count: 5 }, { count: 5 })}</p>
      <p>{formatCurrency(99.99, { currency: "USD" })}</p>
      <p>{formatDate(new Date(), { preset: "long" })}</p>
    </div>
  );
}
```

## API Reference

### Core Functions

#### `createLanguage(config)`

Creates a language instance for non-React usage.

```typescript
import { createLanguage } from "@packages/language";

const i18n = createLanguage({
  translations: { en: { hello: "Hello" }, es: { hello: "Hola" } },
  defaultLocale: "en",
  fallbackLocale: "en",
  onMissingTranslation: (key, locale) => `Missing: ${key}`,
  onLocaleChange: (locale) => console.log(`Changed to ${locale}`),
});

// Usage
i18n.t("hello"); // "Hello"
i18n.setLocale("es");
i18n.t("hello"); // "Hola"
```

**Config Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `translations` | `Translations` | ✅ | Object containing all locale translations |
| `defaultLocale` | `string` | ✅ | Default locale to use |
| `fallbackLocale` | `string` | ❌ | Fallback locale for missing translations |
| `onMissingTranslation` | `(key, locale) => string` | ❌ | Handler for missing translations |
| `onLocaleChange` | `(locale) => void` | ❌ | Callback when locale changes |

**Returns: `LanguageInstance`**

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `locale` | `string` | Current locale |
| `locales` | `string[]` | Available locales |
| `setLocale(locale)` | `(locale) => void` | Change current locale |
| `t(key, values?, options?)` | `TranslateFunction` | Translate a key |
| `formatDate(date, options?)` | `(date, options?) => string` | Format a date |
| `formatNumber(value, options?)` | `(value, options?) => string` | Format a number |
| `formatCurrency(value, options)` | `(value, options) => string` | Format currency |
| `formatRelativeTime(date, options?)` | `(date, options?) => string` | Format relative time |
| `formatList(items, options?)` | `(items, options?) => string` | Format a list |
| `hasTranslation(key)` | `(key) => boolean` | Check if translation exists |
| `getTranslation(key)` | `(key) => string \| undefined` | Get raw translation |

---

### React Components

#### `<LanguageProvider>`

Provides language context to React components.

```tsx
import { LanguageProvider } from "@packages/language/react";

<LanguageProvider
  config={languageConfig}
  initialLocale="en"
  persistKey="app-locale"
  onLocaleChange={(locale) => console.log(locale)}
>
  {children}
</LanguageProvider>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | `LanguageConfig` | ✅ | - | Language configuration |
| `children` | `ReactNode` | ✅ | - | Child components |
| `initialLocale` | `string` | ❌ | `defaultLocale` | Initial locale |
| `persistKey` | `string` | ❌ | `"app-locale"` | localStorage key |
| `onLocaleChange` | `(locale) => void` | ❌ | - | Locale change callback |

---

### React Hooks

#### `useTranslation(namespace?)`

Access translation function with optional namespace.

```tsx
import { useTranslation } from "@packages/language/react";

// Without namespace
const { t, locale, isLoading } = useTranslation();
t("common.save"); // "Save"

// With namespace
const { t } = useTranslation("common");
t("save"); // "Save" (translates "common.save")
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `namespace` | `string` | Optional prefix for all translation keys |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `t` | `(key, values?, options?) => string` | Translation function |
| `locale` | `string` | Current locale |
| `isLoading` | `boolean` | Loading state |

---

#### `useLocale()`

Access and control current locale.

```tsx
import { useLocale } from "@packages/language/react";

const { locale, locales, setLocale, isLoading } = useLocale();

// Change locale
setLocale("es");

// Render locale switcher
locales.map((loc) => (
  <button key={loc} onClick={() => setLocale(loc)}>
    {loc}
  </button>
));
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `locale` | `string` | Current locale |
| `locales` | `string[]` | Available locales |
| `setLocale` | `(locale) => void` | Change locale |
| `isLoading` | `boolean` | Loading state |

---

#### `useFormat()`

Access formatting utilities.

```tsx
import { useFormat } from "@packages/language/react";

const {
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  formatList,
} = useFormat();

// Examples
formatDate(new Date(), { preset: "long" }); // "December 15, 2024"
formatNumber(1234567, { notation: "compact" }); // "1.2M"
formatCurrency(99.99, { currency: "USD" }); // "$99.99"
formatRelativeTime(pastDate); // "2 hours ago"
formatList(["Apple", "Banana", "Orange"]); // "Apple, Banana, and Orange"
```

**Returns:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `formatDate` | `(date, options?) => string` | Format date |
| `formatNumber` | `(value, options?) => string` | Format number |
| `formatCurrency` | `(value, options) => string` | Format currency |
| `formatRelativeTime` | `(date, options?) => string` | Format relative time |
| `formatList` | `(items, options?) => string` | Format list |

---

## Translation Function

### Basic Usage

```tsx
const { t } = useTranslation();

// Simple key
t("common.save"); // "Save"

// Nested key
t("dashboard.stats.totalUsers"); // "Total Users"
```

### Interpolation

Use `{{variable}}` syntax for dynamic values.

```json
{
  "greeting": "Hello, {{name}}!",
  "message": "You have {{count}} new messages from {{sender}}"
}
```

```tsx
t("greeting", { name: "John" }); // "Hello, John!"
t("message", { count: 5, sender: "Alice" }); // "You have 5 new messages from Alice"
```

### Pluralization

Use pipe (`|`) syntax for pluralization.

```json
{
  "items": "No items | {{count}} item | {{count}} items",
  "messages": "No messages | One message | {{count}} messages"
}
```

```tsx
// Pass count in both values and options
t("items", { count: 0 }, { count: 0 }); // "No items"
t("items", { count: 1 }, { count: 1 }); // "1 item"
t("items", { count: 5 }, { count: 5 }); // "5 items"
```

**Pluralization Rules:**
- 2 parts: `singular | plural`
- 3 parts: `zero | singular | plural`
- Uses `Intl.PluralRules` for language-specific rules

### Translation Options

```tsx
t(key, values?, options?);
```

| Option | Type | Description |
|--------|------|-------------|
| `count` | `number` | Count for pluralization |
| `defaultValue` | `string` | Fallback if translation missing |
| `locale` | `string` | Override current locale |

```tsx
// With default value
t("missing.key", {}, { defaultValue: "Fallback text" });

// Force specific locale
t("greeting", { name: "John" }, { locale: "es" }); // "¡Hola, John!"
```

---

## Formatting

### Date Formatting

```tsx
const { formatDate } = useFormat();

// With presets
formatDate(date, { preset: "short" });  // "12/15/24"
formatDate(date, { preset: "medium" }); // "Dec 15, 2024"
formatDate(date, { preset: "long" });   // "December 15, 2024"
formatDate(date, { preset: "full" });   // "Sunday, December 15, 2024"

// Custom options (Intl.DateTimeFormat options)
formatDate(date, {
  weekday: "long",
  year: "numeric",
  month: "short",
  day: "numeric",
}); // "Sunday, Dec 15, 2024"

// Relative time
formatDate(date, { preset: "relative" }); // "2 days ago"
```

**Presets:**

| Preset | Example Output |
|--------|----------------|
| `short` | 12/15/24 |
| `medium` | Dec 15, 2024 |
| `long` | December 15, 2024 |
| `full` | Sunday, December 15, 2024 |
| `relative` | 2 days ago |

### Number Formatting

```tsx
const { formatNumber } = useFormat();

// Basic
formatNumber(1234567); // "1,234,567"

// With presets
formatNumber(1234567, { preset: "compact" }); // "1.2M"
formatNumber(0.85, { preset: "percent" }); // "85%"
formatNumber(1234.5, { preset: "decimal" }); // "1,234.50"

// Custom options (Intl.NumberFormat options)
formatNumber(1234.567, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}); // "1,234.57"
```

### Currency Formatting

```tsx
const { formatCurrency } = useFormat();

formatCurrency(99.99, { currency: "USD" }); // "$99.99"
formatCurrency(99.99, { currency: "EUR" }); // "€99.99"
formatCurrency(99.99, { currency: "JPY" }); // "¥100"

// With options
formatCurrency(1234.56, {
  currency: "USD",
  notation: "compact",
}); // "$1.2K"
```

### Relative Time Formatting

```tsx
const { formatRelativeTime } = useFormat();

const now = new Date();
const past = new Date(now.getTime() - 1000 * 60 * 60 * 2); // 2 hours ago

formatRelativeTime(past); // "2 hours ago"

// Future dates
const future = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day from now
formatRelativeTime(future); // "in 1 day"
```

### List Formatting

```tsx
const { formatList } = useFormat();

formatList(["Apple", "Banana", "Orange"]);
// English: "Apple, Banana, and Orange"
// Spanish: "Apple, Banana y Orange"

// Disjunction (or)
formatList(["Red", "Blue", "Green"], { type: "disjunction" });
// "Red, Blue, or Green"
```

---

## Utility Functions

Import utility functions directly for non-React usage:

```typescript
import {
  interpolate,
  pluralize,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  formatList,
  formatBytes,
  getNestedValue,
  flattenTranslations,
} from "@packages/language";
```

### `interpolate(template, values)`

```typescript
interpolate("Hello, {{name}}!", { name: "World" }); // "Hello, World!"
```

### `pluralize(translations, count, locale)`

```typescript
pluralize(
  { one: "{{count}} item", other: "{{count}} items" },
  5,
  "en"
); // "{{count}} items"
```

### `formatBytes(bytes, locale, decimals?)`

```typescript
formatBytes(1536, "en"); // "1.5 KB"
formatBytes(1073741824, "en"); // "1 GB"
```

### `flattenTranslations(obj)`

```typescript
flattenTranslations({
  common: { save: "Save", cancel: "Cancel" },
  auth: { login: "Log in" },
});
// { "common.save": "Save", "common.cancel": "Cancel", "auth.login": "Log in" }
```

---

## Node.js / API Usage

Use the core API directly without React:

```typescript
// locales/index.ts
import { createLanguage } from "@packages/language";

const translations = {
  en: {
    errors: {
      notFound: "Resource not found",
      unauthorized: "Unauthorized access",
    },
    success: {
      created: "{{resource}} created successfully",
    },
  },
  es: {
    errors: {
      notFound: "Recurso no encontrado",
      unauthorized: "Acceso no autorizado",
    },
    success: {
      created: "{{resource}} creado exitosamente",
    },
  },
};

export function createI18n(locale: string = "en") {
  const i18n = createLanguage({
    translations,
    defaultLocale: "en",
  });

  if (i18n.locales.includes(locale)) {
    i18n.setLocale(locale);
  }

  return i18n;
}
```

### Express Middleware Example

```typescript
// middleware/language.ts
import { createI18n } from "../locales";

export function languageMiddleware(req, res, next) {
  const locale =
    req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "en";

  const i18n = createI18n(locale);

  req.locale = i18n.locale;
  req.t = i18n.t;

  next();
}

// Usage in routes
app.get("/users/:id", (req, res) => {
  const user = null; // fetch user...

  if (!user) {
    return res.status(404).json({
      message: req.t("errors.notFound"),
    });
  }

  res.json({
    message: req.t("success.fetched", { resource: "User" }),
    data: user,
  });
});
```

---

## Next.js Server Components

For Server Components, use the core API:

```typescript
// lib/server-i18n.ts
import { createLanguage } from "@packages/language";
import { cookies, headers } from "next/headers";
import { languageConfig } from "@/locales";

export function getServerTranslations() {
  const cookieStore = cookies();
  const headersList = headers();

  const locale =
    cookieStore.get("app-locale")?.value ||
    headersList.get("accept-language")?.split(",")[0]?.split("-")[0] ||
    "en";

  const i18n = createLanguage(languageConfig);
  i18n.setLocale(locale);

  return i18n;
}

// Usage in Server Component
export default function Page() {
  const { t, formatCurrency } = getServerTranslations();

  return (
    <div>
      <h1>{t("dashboard.title")}</h1>
      <p>{formatCurrency(99.99, { currency: "USD" })}</p>
    </div>
  );
}
```

---

## Best Practices

### 1. Organize Translations by Feature

```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "auth": { "login": "Log in", "logout": "Log out" },
  "dashboard": { "title": "Dashboard" },
  "users": { "title": "Users", "addUser": "Add User" },
  "orders": { "title": "Orders" }
}
```

### 2. Use Namespaces for Large Components

```tsx
// Instead of
const { t } = useTranslation();
t("users.fields.name");
t("users.fields.email");
t("users.status.active");

// Use namespace
const { t } = useTranslation("users");
t("fields.name");
t("fields.email");
t("status.active");
```

### 3. Keep Translation Keys Consistent

```json
{
  "users": {
    "title": "Users",
    "subtitle": "Manage users",
    "count": "{{count}} users",
    "fields": {
      "name": "Name",
      "email": "Email"
    },
    "actions": {
      "add": "Add User",
      "edit": "Edit User",
      "delete": "Delete User"
    },
    "messages": {
      "createSuccess": "User created successfully",
      "deleteConfirm": "Are you sure?"
    }
  }
}
```

### 4. Handle Missing Translations

```typescript
const languageConfig: LanguageConfig = {
  translations,
  defaultLocale: "en",
  fallbackLocale: "en",
  onMissingTranslation: (key, locale) => {
    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing: "${key}" in "${locale}"`);
    }

    // Return key or custom fallback
    return key;
  },
};
```

### 5. Create Locale Metadata

```typescript
export const localeMetadata: Record<AppLocale, {
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
}> = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸", dir: "ltr" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸", dir: "ltr" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦", dir: "rtl" },
};
```

---

## TypeScript Support

### Type-Safe Translation Keys (Optional)

```typescript
import type { NestedKeyOf } from "@packages/language";
import type { AppTranslations } from "@/locales";

// Get all possible translation keys
type TranslationKey = NestedKeyOf<AppTranslations["en"]>;

// Example keys: "common.save" | "common.cancel" | "auth.login" | ...
```

### Typed Locale

```typescript
import type { AppLocale } from "@/locales";

function MyComponent() {
  const { locale, setLocale } = useLocale<{ en: object; es: object }>();

  // locale is typed as "en" | "es"
  setLocale("en"); // ✅
  setLocale("fr"); // ❌ Type error
}
```

---

## Examples

### Locale Switcher Component

```tsx
"use client";

import { useLocale } from "@packages/language/react";

const locales = {
  en: { flag: "🇺🇸", name: "English" },
  es: { flag: "🇪🇸", name: "Español" },
};

export function LocaleSwitcher() {
  const { locale, locales: availableLocales, setLocale } = useLocale();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>
          {locales[loc].flag} {locales[loc].name}
        </option>
      ))}
    </select>
  );
}
```

### Form Validation with Translations

```tsx
"use client";

import { useTranslation } from "@packages/language/react";

export function LoginForm() {
  const { t } = useTranslation("validation");

  const validate = (values) => {
    const errors = {};

    if (!values.email) {
      errors.email = t("required", { field: "Email" });
    }

    if (values.password.length < 8) {
      errors.password = t("minLength", { field: "Password", min: 8 });
    }

    return errors;
  };

  // ...
}
```

### Dynamic Content with Formatting

```tsx
"use client";

import { useTranslation, useFormat } from "@packages/language/react";

export function OrderSummary({ order }) {
  const { t } = useTranslation("orders");
  const { formatCurrency, formatDate } = useFormat();

  return (
    <div>
      <h2>{t("orderNumber", { number: order.id })}</h2>
      <p>{t("placedOn", { date: formatDate(order.createdAt, { preset: "long" }) })}</p>
      <p>{t("total")}: {formatCurrency(order.total, { currency: "USD" })}</p>
      <p>{t("itemCount", { count: order.items.length }, { count: order.items.length })}</p>
    </div>
  );
}
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## License

MIT © Your Organization