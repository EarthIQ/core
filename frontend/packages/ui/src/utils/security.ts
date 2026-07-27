import DOMPurify from "dompurify";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// 2. Secure token storage
export const tokenStorage = {
  get: (): string | null => {
    // Use httpOnly cookies in production via backend
    return sessionStorage.getItem("token");
  },
  set: (token: string): void => {
    sessionStorage.setItem("token", token);
  },
  remove: (): void => {
    sessionStorage.removeItem("token");
  },
};

// 3. URL validation
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
