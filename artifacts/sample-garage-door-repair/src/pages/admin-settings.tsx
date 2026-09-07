import { useEffect, useMemo, useState } from "react";
import {
  getGetBusinessSettingsQueryKey,
  getGetPublicBusinessSettingsQueryKey,
  useGetBusinessSettings,
  useGetPublicBusinessSettings,
  useUpdateBusinessSettings,
  type BusinessSettings,
  type GarageClaimVerificationMap,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, Loader2, Save, ShieldCheck, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { THEMES } from "@/lib/theme-options";
import { NotificationSettings } from "@/components/notification-settings";

const EXAMPLES = {
  phone: "(470) 555-0147",
  email: "service@cumminggaragedoor.example",
  hours: "Monday–Friday 8am–6pm; Saturday 9am–2pm; Sunday closed",
  coverage: "Cumming and Forsyth County (provisional)",
};

const TRUST_FIELDS = [
  ["ownerTeam", "Owner / team"],
  ["yearsInBusiness", "Years in business"],
  ["brandsServiced", "Brands serviced"],
  ["paymentOptions", "Payment methods"],
  ["financing", "Financing"],
  ["licenseInsurance", "Licenses / insurance"],
  ["warranty", "Warranty"],
] as const;

type ClaimKey = "businessName" | "phone" | "email" | "hours" | "coverage" | "urgentPolicy" | typeof TRUST_FIELDS[number][0];

function isReservedExample(key: ClaimKey, value: string) {
  if (key === "phone") return value.replace(/\D/g, "") === "4705550147" || /55501\d{2}$/.test(value.replace(/\D/g, ""));
  if (key === "email") return value.trim().toLowerCase().endsWith(".example");
  return key in EXAMPLES && value.trim() === EXAMPLES[key as keyof typeof EXAMPLES];
}

const claimValue = (settings: BusinessSettings, key: ClaimKey) => {
  if (key in settings.trustProfile) return settings.trustProfile[key as keyof BusinessSettings["trustProfile"]] ?? "";
  if (key === "coverage") return settings.coverage || settings.serviceArea;
  return String(settings[key as keyof BusinessSettings] ?? "");
};

function ClaimControl({ name, value, claims, onChange }: {
  name: ClaimKey;
  value: string;
  claims: GarageClaimVerificationMap;
  onChange: (next: GarageClaimVerificationMap) => void;
}) {
  const current = claims[name];
  const example = isReservedExample(name, value) || current?.isExample === true;
  const verified = current?.status === "verified" && !example;
  return (
    <div className="mt-[var(--phi-space-1)] flex flex-wrap items-center gap-[var(--phi-space-1)]">
      <Badge variant={verified ? "default" : "outline"}>{verified ? "Verified real claim" : example ? "Unverified example" : "Unverified"}</Badge>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!value.trim() || example}
        onClick={() => onChange({
          ...claims,
          [name]: { status: verified ? "unverified" : "verified", isExample: false, verifiedAt: null },
        })}
      >
        {verified ? "Remove verification" : "Verify this claim"}
      </Button>
      {example ? <span className="text-xs text-amber-700">Replace this temporary example before verification.</span> : null}
    </div>
  );
}

export default function AdminSettingsPage() {
  const settingsQuery = useGetBusinessSettings({ query: { queryKey: getGetBusinessSettingsQueryKey(), staleTime: 0, refetchOnMount: "always" } });
  const publicQuery = useGetPublicBusinessSettings({ query: { queryKey: getGetPublicBusinessSettingsQueryKey(), staleTime: 0, refetchOnMount: "always" } });
  const update = useUpdateBusinessSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data);
  }, [settingsQuery.data]);

  const preview = useMemo(() => {
    if (!draft) return null;
    const visible = (key: ClaimKey) => {
      const value = claimValue(draft, key);
      const claim = draft.claimVerification[key];
      return claim?.status === "verified" && claim.isExample === false && !isReservedExample(key, value) ? value : "";
    };
    return {
      businessName: "Cumming Garage Door Service",
      phone: visible("phone"),
      email: visible("email"),
      hours: visible("hours"),
      coverage: visible("coverage"),
      urgentPolicy: visible("urgentPolicy"),
      trust: TRUST_FIELDS.map(([key, label]) => [label, visible(key)] as const).filter(([, value]) => value),
    };
  }, [draft]);

  if (settingsQuery.isLoading || !draft) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (settingsQuery.isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Settings could not be loaded</AlertTitle><AlertDescription>{settingsQuery.error instanceof Error ? settingsQuery.error.message : "Unknown error"}</AlertDescription></Alert>;

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const setFact = (key: ClaimKey, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const isTrust = key in current.trustProfile;
      return {
        ...current,
        ...(isTrust ? { trustProfile: { ...current.trustProfile, [key]: value || null } } : key === "coverage" ? { coverage: value, serviceArea: value } : { [key]: value }),
        claimVerification: {
          ...current.claimVerification,
          [key]: { status: "unverified", isExample: isReservedExample(key, value), verifiedAt: null },
        },
        productionApproved: false,
      };
    });
  };
  const save = () => update.mutate({ data: {
    businessName: "Cumming Garage Door Service",
    phone: draft.phone,
    email: draft.email,
    serviceArea: draft.coverage,
    hours: draft.hours,
    coverage: draft.coverage,
    urgentPolicy: draft.urgentPolicy,
    theme: draft.theme,
    serviceId: draft.serviceId,
    emergencyEnabled: draft.emergencyEnabled,
    heroImage: draft.heroImage,
    galleryImages: draft.galleryImages,
    productionApproved: draft.productionApproved,
    domainConfigured: draft.domainConfigured,
    authConfigured: draft.authConfigured,
    claimVerification: draft.claimVerification,
    trustProfile: draft.trustProfile,
  } }, {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBusinessSettingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPublicBusinessSettingsQueryKey() }),
      ]);
      toast({ title: "Business settings saved", description: "Public projection and launch checks were refreshed." });
    },
    onError: (error) => toast({ title: "Settings were not saved", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" }),
  });

  return (
    <div className="space-y-[var(--phi-space-3)]">
      <header className="border-b pb-[var(--phi-space-3)]">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Business administration</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Cumming Garage Door Service settings</h1>
        <p className="mt-[var(--phi-space-1)] max-w-3xl text-sm text-muted-foreground">Edit identity, contact, hours, coverage, trust claims, media, and publishing in one place. Every factual claim is verified separately; temporary examples can never be approved.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-[var(--phi-space-1)]"><Store className="h-5 w-5" />Business details</CardTitle><CardDescription>The approved public name is fixed. Contact, hours, and coverage begin as editable unverified examples.</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--phi-space-3)] md:grid-cols-2">
          <Field label="Approved business name"><Input value="Cumming Garage Door Service" disabled /></Field>
          {([
            ["phone", "Phone", "tel"],
            ["email", "Email", "email"],
            ["hours", "Business hours", "text"],
            ["coverage", "Service coverage", "text"],
          ] as const).map(([key, label, type]) => (
            <Field key={key} label={label}>
              <Input type={type} value={claimValue(draft, key)} onChange={(event) => setFact(key, event.target.value)} />
              <ClaimControl name={key} value={claimValue(draft, key)} claims={draft.claimVerification} onChange={(claims) => set("claimVerification", claims)} />
            </Field>
          ))}
          <Field label="Urgent-request policy" wide>
            <Textarea value={draft.urgentPolicy} placeholder="Leave blank unless the owner has confirmed a truthful urgent-request policy." onChange={(event) => setFact("urgentPolicy", event.target.value)} />
            <ClaimControl name="urgentPolicy" value={draft.urgentPolicy} claims={draft.claimVerification} onChange={(claims) => set("claimVerification", claims)} />
          </Field>
          <label className="flex items-center justify-between rounded-[var(--phi-radius)] border p-[var(--phi-space-3)] md:col-span-2"><span><strong>Show urgent-request messaging</strong><span className="block text-xs text-muted-foreground">Only projects publicly when a real urgent policy is verified.</span></span><Switch checked={draft.emergencyEnabled} onCheckedChange={(value) => set("emergencyEnabled", value)} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-[var(--phi-space-1)]"><ShieldCheck className="h-5 w-5" />Trust claims</CardTitle><CardDescription>Blank and unverified optional claims are omitted from the public site.</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--phi-space-3)] md:grid-cols-2">
          {TRUST_FIELDS.map(([key, label]) => <Field key={key} label={label}><Input value={claimValue(draft, key)} placeholder="Leave blank if not confirmed" onChange={(event) => setFact(key, event.target.value)} /><ClaimControl name={key} value={claimValue(draft, key)} claims={draft.claimVerification} onChange={(claims) => set("claimVerification", claims)} /></Field>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance & media</CardTitle><CardDescription>Existing themes and licensed locally hosted imagery remain editable.</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--phi-space-3)] md:grid-cols-2">
          <Field label="Theme"><Select value={draft.theme} onValueChange={(value) => set("theme", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{THEMES.map((theme) => <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Internal service ID"><Input value={draft.serviceId} onChange={(event) => set("serviceId", event.target.value)} /></Field>
          <Field label="Hero image"><Input value={draft.heroImage} onChange={(event) => set("heroImage", event.target.value)} /></Field>
          <Field label="Gallery images" wide><Textarea rows={5} value={draft.galleryImages.join("\n")} onChange={(event) => set("galleryImages", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-[var(--phi-space-1)]"><Eye className="h-5 w-5" />Exact public projection</CardTitle><CardDescription>This is the factual identity and metadata-safe content exposed after saving. Empty facts do not create phone, email, urgent, or Maya actions.</CardDescription></CardHeader>
        <CardContent className="space-y-[var(--phi-space-2)]">
          <h2 className="font-display text-xl font-bold">{preview?.businessName}</h2>
          {preview?.phone ? <p>Phone: {preview.phone}</p> : <p className="text-sm text-muted-foreground">Phone omitted — current value is unverified/example.</p>}
          {preview?.email ? <p>Email: {preview.email}</p> : <p className="text-sm text-muted-foreground">Email omitted — current value is unverified/example.</p>}
          {preview?.hours ? <p>Hours: {preview.hours}</p> : <p className="text-sm text-muted-foreground">Hours omitted.</p>}
          {preview?.coverage ? <p>Coverage: {preview.coverage}</p> : <p className="text-sm text-muted-foreground">Coverage omitted.</p>}
          {preview?.urgentPolicy ? <p>Urgent requests: {preview.urgentPolicy}</p> : null}
          {preview?.trust.map(([label, value]) => <p key={label}>{label}: {value}</p>)}
          <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Preview-only examples</AlertTitle><AlertDescription>{draft.phone} · {draft.email} · {draft.hours} · {draft.coverage}. These remain visibly unverified and are not contact actions or Maya facts.</AlertDescription></Alert>
        </CardContent>
      </Card>

      <Card className="border-amber-300">
        <CardHeader><CardTitle>Production approval</CardTitle><CardDescription>Approval does not override required runtime, notification, domain, or authentication checks.</CardDescription></CardHeader>
        <CardContent className="space-y-[var(--phi-space-2)]">
          {publicQuery.data ? Object.entries(publicQuery.data.launchChecks).map(([key, ready]) => <div key={key} className="flex items-center gap-[var(--phi-space-1)] text-sm">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span>{key.replace(/([A-Z])/g, " $1")}</span></div>) : <p className="text-sm text-muted-foreground">Save to refresh server launch checks.</p>}
          <label className="flex items-start gap-[var(--phi-space-2)] rounded-[var(--phi-radius)] border p-[var(--phi-space-3)]"><Checkbox checked={draft.productionApproved} onCheckedChange={(value) => set("productionApproved", value === true)} /><span><strong>Owner production approval</strong><span className="block text-xs text-muted-foreground">Set only after replacing examples and completing every checklist item. This cannot make the site launch-ready by itself.</span></span></label>
          <label className="flex items-center justify-between rounded-[var(--phi-radius)] border p-[var(--phi-space-3)]"><span><strong>Production domain setup recorded</strong><span className="block text-xs text-muted-foreground">Runtime host validation must also pass.</span></span><Switch checked={draft.domainConfigured} onCheckedChange={(value) => set("domainConfigured", value)} /></label>
          <label className="flex items-center justify-between rounded-[var(--phi-radius)] border p-[var(--phi-space-3)]"><span><strong>Production auth callbacks recorded</strong><span className="block text-xs text-muted-foreground">Runtime authentication configuration must also pass.</span></span><Switch checked={draft.authConfigured} onCheckedChange={(value) => set("authConfigured", value)} /></label>
        </CardContent>
      </Card>

      <NotificationSettings />

      <div className="sticky bottom-3 flex justify-end gap-[var(--phi-space-1)] rounded-[var(--phi-radius)] border bg-background/95 p-[var(--phi-space-2)] shadow-lg backdrop-blur"><Button variant="outline" onClick={() => settingsQuery.data && setDraft(settingsQuery.data)}>Discard</Button><Button onClick={save} disabled={update.isPending}>{update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save business settings</Button></div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`space-y-[var(--phi-space-1)] ${wide ? "md:col-span-2" : ""}`}><span className="text-sm font-semibold">{label}</span>{children}</label>;
}