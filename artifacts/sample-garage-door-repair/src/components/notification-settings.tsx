import { useEffect, useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = { webhookUrl: string | null; enabled: boolean; configured?: boolean };

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>({ webhookUrl: "", enabled: false });
  const [state, setState] = useState<"loading" | "idle" | "saving" | "testing">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/garage/admin/notifications")
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Notifications could not be loaded.");
        setSettings(body);
        setState("idle");
      })
      .catch(error => { setMessage(error.message); setState("idle"); });
  }, []);

  async function send(path: string, nextState: "saving" | "testing") {
    setState(nextState);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: path.endsWith("/test") ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The destination did not accept the request.");
      if (nextState === "saving") setSettings(body);
      setMessage(nextState === "testing" ? "Test delivered to the configured destination." : "Notification settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notification operation failed.");
    } finally {
      setState("idle");
    }
  }

  return (
    <section className="phi-admin-card space-y-4 border-2 border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="notification-heading">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h3 id="notification-heading" className="font-display text-lg font-bold">Request delivery</h3>
          <p className="mt-1 text-sm text-muted-foreground">Send completed new-request events to an owner-approved HTTPS webhook. A deployment owner must securely authorize the receiver’s exact domain; this screen cannot change that server allowlist.</p>
        </div>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">HTTPS webhook URL</span>
        <Input type="url" value={settings.webhookUrl || ""} onChange={event => setSettings(current => ({ ...current, webhookUrl: event.target.value }))} placeholder="https://your-provider.com/…" disabled={state !== "idle"} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} />
        Enable delivery after saving
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => send("/api/garage/admin/notifications", "saving")} disabled={state !== "idle"}>
          {state === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save destination
        </Button>
        <Button type="button" variant="outline" onClick={() => send("/api/garage/admin/notifications/test", "testing")} disabled={state !== "idle" || !settings.webhookUrl}>
          {state === "testing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send real test
        </Button>
      </div>
      {state === "loading" ? <p className="text-sm text-muted-foreground">Loading delivery settings…</p> : null}
      {message ? <p role="status" className="text-sm font-medium">{message}</p> : null}
      {!settings.configured && state !== "loading" ? <p className="text-sm font-semibold text-amber-700">Not configured — requests remain saved in the inbox, but no external notification is sent.</p> : null}
    </section>
  );
}