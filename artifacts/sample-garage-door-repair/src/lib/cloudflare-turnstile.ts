type TurnstileAction = "booking" | "assistant";

type CloudflareConfigResponse = {
  enabled?: boolean;
  siteKey?: string;
  turnstile?: {
    enabled?: boolean;
    siteKey?: string;
  };
  turnstileEnabled?: boolean;
  turnstileSiteKey?: string;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: TurnstileAction;
      size: "invisible";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileConfig = { enabled: boolean; siteKey?: string };

let configPromise: Promise<TurnstileConfig> | undefined;
let scriptPromise: Promise<TurnstileApi> | undefined;

function readConfig(value: CloudflareConfigResponse): TurnstileConfig {
  const enabled = value.turnstile?.enabled ?? value.turnstileEnabled ?? value.enabled;
  const siteKey = value.turnstile?.siteKey ?? value.turnstileSiteKey ?? value.siteKey;
  return { enabled: enabled === true, siteKey };
}

async function getConfig(): Promise<TurnstileConfig> {
  if (!configPromise) {
    configPromise = fetch("/api/garage/cloudflare-config", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the verification configuration.");
        return readConfig((await response.json()) as CloudflareConfigResponse);
      })
      .catch((error: unknown) => {
        configPromise = undefined;
        throw error;
      });
  }
  return configPromise;
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const finish = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error("The verification service did not finish loading."));
      };
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-garage-turnstile="true"]',
      );
      if (existing) {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("The verification service could not load.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.garageTurnstile = "true";
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error("The verification service could not load.")), { once: true });
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      scriptPromise = undefined;
      throw error;
    });
  }
  return scriptPromise;
}

/**
 * Returns undefined only when the server explicitly disables Turnstile (local preview).
 * Callers should show a retry message for any rejection rather than submitting unverified.
 */
export async function getInvisibleTurnstileToken(action: TurnstileAction): Promise<string | undefined> {
  const config = await getConfig();
  if (!config.enabled) return undefined;
  if (!config.siteKey) throw new Error("Verification is enabled but no site key is available.");
  const siteKey = config.siteKey;

  const turnstile = await loadTurnstile();
  return new Promise<string>((resolve, reject) => {
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);
    let widgetId = "";
    const cleanup = () => {
      window.clearTimeout(timeout);
      if (widgetId) turnstile.remove(widgetId);
      container.remove();
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const timeout = window.setTimeout(
      () => fail("Verification timed out. Please try again."),
      12_000,
    );

    try {
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        action,
        size: "invisible",
        callback: (token) => {
          cleanup();
          resolve(token);
        },
        "error-callback": () => fail("Verification could not be completed. Please try again."),
        "expired-callback": () => fail("Verification expired. Please try again."),
      });
      turnstile.execute(widgetId);
    } catch {
      fail("Verification could not be started. Please try again.");
    }
  });
}