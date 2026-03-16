// app/Utils/clearAuthCookies.ts
//
// Shared utility — wipes all Laravel Sanctum/Fortify auth cookies from the
// browser and resets the module-level CSRF promise so the next login attempt
// always fetches a fresh token.
//
// Usage:
//   import clearAuthCookies from "../Utils/clearAuthCookies";
//   clearAuthCookies();
//   clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });

export interface ClearAuthCookiesOptions {
  /**
   * Optional callback invoked after cookies are expired.
   * Pass a closure that sets your module-level `_csrfPromise = null`
   * so the next login attempt refetches a clean CSRF token.
   */
  resetCsrf?: () => void;
}

/**
 * Expires all auth-related cookies set by Laravel Sanctum/Fortify.
 *
 * Why so many combinations?
 * Laravel sets cookies on `localhost` (port 80) but Next.js runs on
 * `localhost:3000`. document.cookie can READ those cookies but cannot
 * expire them unless we try every domain/path combo — including no
 * domain attribute at all, which is how Laravel actually writes them.
 */
export default function clearAuthCookies(options?: ClearAuthCookiesOptions): void {
  const cookiesToClear = ["XSRF-TOKEN", "laravel_session", "remember_web"];

  // Every domain variation the browser might have stored the cookie under
  const domains = [
    "",                                      // no domain attr  ← Laravel default
    window.location.hostname,               // "localhost"
    `.${window.location.hostname}`,         // ".localhost"
  ];

  const paths = ["/", ""];

  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT";

  for (const name of cookiesToClear) {
    for (const domain of domains) {
      for (const path of paths) {
        // Without SameSite / Secure so it matches Laravel's dev cookie flags
        document.cookie = [
          `${name}=`,
          expired,
          `path=${path}`,
          domain ? `domain=${domain}` : "",
        ]
          .filter(Boolean)
          .join("; ");

        // Also try with SameSite=Lax in case browser stored it that way
        document.cookie = [
          `${name}=`,
          expired,
          `path=${path}`,
          domain ? `domain=${domain}` : "",
          "SameSite=Lax",
        ]
          .filter(Boolean)
          .join("; ");
      }
    }
  }

  options?.resetCsrf?.();

  console.warn(
    "[Auth][Cleanup] 🧹 Auth cookies cleared" +
    (options?.resetCsrf ? " + CSRF cache reset" : "")
  );
}
