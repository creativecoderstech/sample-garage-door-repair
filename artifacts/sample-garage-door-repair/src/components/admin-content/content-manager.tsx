import { useEffect, useMemo, useState } from "react";
import {
  getListAdminGarageContentQueryKey,
  getListGarageContentQueryKey,
  useCreateGarageContent,
  useDeleteGarageContent,
  useListAdminGarageContent,
  useUpdateGarageContent,
  type GarageContent,
  type GarageContentInput,
  type GarageContentKind,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ExternalLink, Eye, FilePlus2, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { contentRoute, CORE_PAGE_ROUTES } from "@/lib/content-routes";
import { publicAssetUrl } from "@/lib/asset-url";

const CORE_PAGE_SLUGS = new Set(Object.keys(CORE_PAGE_ROUTES));

const EMPTY: GarageContentInput = {
  kind: "page",
  slug: "",
  aliases: [],
  title: "",
  navigationLabel: "",
  navigationGroup: "",
  summary: "",
  body: "",
  symptoms: [],
  expectations: [],
  serviceFaqs: [],
  imageUrl: "",
  imageAlt: "",
  mediaMetadata: { sourceUrl: "", license: "", attribution: "", representative: true },
  beforeImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  parentId: null,
  sortOrder: 0,
  status: "draft",
  verificationStatus: "unverified",
  featured: false,
  serviceCode: "",
};

const COPY: Record<GarageContentKind, { singular: string; plural: string; help: string }> = {
  page: { singular: "page", plural: "Pages", help: "Standalone website pages and core page copy." },
  service: { singular: "service", plural: "Services", help: "Service details, routing codes, and SEO landing copy." },
  location: { singular: "location", plural: "Locations", help: "Service-area landing pages. Publish only accurate coverage details." },
  article: { singular: "article", plural: "Blog", help: "Plain-text educational articles and homeowner guidance." },
  faq: { singular: "FAQ", plural: "FAQs", help: "Questions and concise, safety-conscious answers." },
  project: { singular: "project", plural: "Projects & gallery", help: "Project images and before-and-after stories." },
  trust: { singular: "trust item", plural: "Trust", help: "Business facts such as credentials, warranties, and experience." },
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The server could not complete this request.";
}

function publicPath(item: Pick<GarageContentInput, "kind" | "slug">) {
  return contentRoute(item);
}

function validImageReference(value: string) {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function ContentPreview({ draft }: { draft: GarageContentInput }) {
  const paragraphs = draft.body.split(/\n\s*\n/).filter(Boolean);
  return (
    <article className="overflow-hidden rounded-[var(--phi-radius)] border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      {draft.imageUrl ? (
        <div className="relative aspect-[16/7] bg-slate-100">
          <img src={publicAssetUrl(draft.imageUrl)} alt={draft.imageAlt || ""} className="h-full w-full object-cover" />
          {draft.beforeImageUrl ? (
            <img src={publicAssetUrl(draft.beforeImageUrl)} alt={`Before ${draft.imageAlt || draft.title}`} className="absolute bottom-3 left-3 h-20 w-28 rounded-[var(--phi-radius)] border-2 border-white object-cover shadow-lg" />
          ) : null}
        </div>
      ) : null}
      <div className="p-[var(--phi-space-3)]">
        <div className="mb-[var(--phi-space-1)] flex flex-wrap gap-[var(--phi-space-1)]">
          <Badge variant="outline">{draft.kind}</Badge>
          <Badge variant={draft.status === "published" ? "default" : "secondary"}>{draft.status}</Badge>
          {draft.featured ? <Badge variant="secondary">Featured</Badge> : null}
        </div>
        <h3 className="font-display text-2xl font-bold text-slate-950 dark:text-white">{draft.title || "Untitled preview"}</h3>
        {draft.summary ? <p className="mt-[var(--phi-space-1)] text-sm font-medium text-slate-600 dark:text-slate-300">{draft.summary}</p> : null}
        <div className="mt-[var(--phi-space-3)] space-y-[var(--phi-space-2)] text-sm leading-6 text-slate-600 dark:text-slate-300">
          {paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className="italic text-slate-400">Body copy preview appears here.</p>}
        </div>
      </div>
    </article>
  );
}

export function ContentManager({ kind }: { kind: GarageContentKind }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useListAdminGarageContent({ query: { queryKey: getListAdminGarageContentQueryKey(), staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true } });
  const createMutation = useCreateGarageContent();
  const updateMutation = useUpdateGarageContent();
  const deleteMutation = useDeleteGarageContent();
  const [editing, setEditing] = useState<GarageContent | null>(null);
  const [draft, setDraft] = useState<GarageContentInput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GarageContent | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [formError, setFormError] = useState("");

  const items = useMemo(
    () => (query.data ?? []).filter((item) => item.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [kind, query.data],
  );
  const parents = (query.data ?? []).filter((item) => item.id !== editing?.id && ["page", "service", "location", "article"].includes(item.kind));
  const isCorePage = editing?.kind === "page" && CORE_PAGE_SLUGS.has(editing.slug);
  const busy = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    setEditing(null);
    setDraft(null);
    setFormError("");
  }, [kind]);

  const begin = (item?: GarageContent) => {
    setEditing(item ?? null);
    setDraft(item ? {
      kind: item.kind, slug: item.slug, title: item.title, navigationLabel: item.navigationLabel,
      navigationGroup: item.navigationGroup, summary: item.summary, body: item.body,
      symptoms: item.symptoms, expectations: item.expectations, serviceFaqs: item.serviceFaqs,
      aliases: item.aliases,
      imageUrl: item.imageUrl, imageAlt: item.imageAlt, mediaMetadata: item.mediaMetadata, beforeImageUrl: item.beforeImageUrl,
      seoTitle: item.seoTitle, seoDescription: item.seoDescription, parentId: item.parentId,
      sortOrder: item.sortOrder, status: item.status, verificationStatus: item.verificationStatus,
      featured: item.featured, serviceCode: item.serviceCode,
    } : { ...EMPTY, kind });
    setAcknowledged(item?.verificationStatus === "verified");
    setFormError("");
  };

  const setField = <K extends keyof GarageContentInput>(key: K, value: GarageContentInput[K]) => {
    setDraft((current) => current ? {
      ...current,
      [key]: value,
      verificationStatus: "unverified",
    } : null);
    setAcknowledged(false);
    setFormError("");
  };

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminGarageContentQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListGarageContentQueryKey() }),
    ]);
  };

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
      setFormError("Add a title and a lowercase, hyphenated slug.");
      return;
    }
    if (!validImageReference(draft.imageUrl) || !validImageReference(draft.beforeImageUrl)) {
      setFormError("Images must be http(s) URLs or same-site paths beginning with /. Data URLs are not accepted.");
      return;
    }
    if (draft.imageUrl && !draft.imageAlt.trim()) {
      setFormError("Add useful alt text for the image.");
      return;
    }
    if (draft.kind === "trust" && draft.status === "published" && !acknowledged) {
      setFormError("Trust facts cannot be published until you acknowledge that they are accurate.");
      return;
    }
    const data: GarageContentInput = {
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      verificationStatus: acknowledged ? "verified" : "unverified",
      verificationAcknowledged: acknowledged,
    };
    const options = {
      onSuccess: async () => {
        await invalidate();
        toast({ title: editing ? "Content updated" : "Content created", description: "The database-backed content list is current." });
        setDraft(null);
        setEditing(null);
      },
      onError: (error: unknown) => setFormError(errorMessage(error)),
    };
    if (editing) updateMutation.mutate({ id: editing.id, data }, options);
    else createMutation.mutate({ data }, options);
  };

  const remove = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: async () => {
        await invalidate();
        toast({ title: "Content deleted" });
        setDeleteTarget(null);
        if (editing?.id === deleteTarget.id) {
          setEditing(null);
          setDraft(null);
        }
      },
      onError: (error) => {
        toast({ title: "Delete failed", description: errorMessage(error), variant: "destructive" });
        setDeleteTarget(null);
      },
    });
  };

  return (
    <section className="space-y-[var(--phi-space-3)]">
      <div className="flex flex-col gap-[var(--phi-space-2)] border-b border-slate-200 pb-[var(--phi-space-3)] sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Database content</p>
          <h2 className="mt-1 font-display text-2xl font-bold">{COPY[kind].plural}</h2>
          <p className="mt-1 text-sm text-slate-500">{COPY[kind].help}</p>
        </div>
        <Button onClick={() => begin()}><FilePlus2 className="mr-2 h-4 w-4" />Add {COPY[kind].singular}</Button>
      </div>

      {query.isLoading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : null}
      {query.isError ? (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Content could not be loaded</AlertTitle><AlertDescription>{errorMessage(query.error)} <Button variant="link" className="h-auto p-0" onClick={() => query.refetch()}>Try again</Button></AlertDescription></Alert>
      ) : null}

      {draft ? (
        <div className="grid gap-[var(--phi-space-3)] xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
          <div className="rounded-[var(--phi-radius)] border-2 border-slate-200 bg-white p-[var(--phi-space-3)] dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-[var(--phi-space-3)] flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-primary">{editing ? "Edit" : "Create"} {COPY[kind].singular}</p><p className="text-xs text-slate-500">Plain text only. Blank optional fields are saved as blank.</p></div>
              <Button variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Close editor"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-[var(--phi-space-3)] md:grid-cols-2">
              <Field label="Title"><Input value={draft.title} maxLength={160} onChange={(e) => setField("title", e.target.value)} /></Field>
              <Field label="Slug" hint={isCorePage ? "Reserved core slug cannot be changed." : "lowercase-words-only"}>
                <Input value={draft.slug} maxLength={100} disabled={isCorePage} onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))} />
              </Field>
              <Field label="Previous URL slugs" hint="Comma separated; redirects old links.">
                <Input
                  value={draft.aliases.join(", ")}
                  placeholder="old-page, previous-page"
                  onChange={(e) => setField("aliases", e.target.value.split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean))}
                />
              </Field>
              <Field label="Navigation label"><Input value={draft.navigationLabel} maxLength={100} onChange={(e) => setField("navigationLabel", e.target.value)} /></Field>
              <Field label="Navigation group" hint="main, services, or legal"><Input value={draft.navigationGroup} maxLength={100} onChange={(e) => setField("navigationGroup", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></Field>
              <Field label="Summary" wide><Textarea rows={3} maxLength={500} value={draft.summary} onChange={(e) => setField("summary", e.target.value)} /></Field>
              <Field label={kind === "faq" ? "Answer" : "Body"} hint="Separate plain-text paragraphs with a blank line." wide><Textarea rows={9} maxLength={20000} value={draft.body} onChange={(e) => setField("body", e.target.value)} /></Field>
              {kind === "service" ? <>
                <Field label="Symptoms addressed" hint="One item per line" wide><Textarea rows={4} value={draft.symptoms.join("\n")} onChange={(e) => setField("symptoms", e.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></Field>
                <Field label="What customers can expect" hint="One item per line" wide><Textarea rows={4} value={draft.expectations.join("\n")} onChange={(e) => setField("expectations", e.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></Field>
                <Field label="Service FAQs" hint="One Question | Answer pair per line" wide><Textarea rows={5} value={draft.serviceFaqs.map((item) => `${item.question} | ${item.answer}`).join("\n")} onChange={(e) => setField("serviceFaqs", e.target.value.split("\n").map((line) => { const [question, ...answer] = line.split("|"); return { question: question.trim(), answer: answer.join("|").trim() }; }).filter((item) => item.question && item.answer))} /></Field>
              </> : null}
              <Field label="Image URL"><Input value={draft.imageUrl} maxLength={2048} placeholder="/images/example.jpg or https://…" onChange={(e) => setField("imageUrl", e.target.value)} /></Field>
              <Field label="Image alt text"><Input value={draft.imageAlt} maxLength={300} onChange={(e) => setField("imageAlt", e.target.value)} /></Field>
              <Field label="Media source URL"><Input value={draft.mediaMetadata.sourceUrl} maxLength={2048} onChange={(e) => setField("mediaMetadata", { ...draft.mediaMetadata, sourceUrl: e.target.value })} /></Field>
              <Field label="Media license / rights record"><Input value={draft.mediaMetadata.license} maxLength={500} onChange={(e) => setField("mediaMetadata", { ...draft.mediaMetadata, license: e.target.value })} /></Field>
              <Field label="Attribution"><Input value={draft.mediaMetadata.attribution} maxLength={500} onChange={(e) => setField("mediaMetadata", { ...draft.mediaMetadata, attribution: e.target.value })} /></Field>
              <div className="flex items-end pb-2"><label className="flex items-center gap-[var(--phi-space-1)] text-sm"><Checkbox checked={draft.mediaMetadata.representative} onCheckedChange={(value) => setField("mediaMetadata", { ...draft.mediaMetadata, representative: value === true })} />Representative image, not completed work</label></div>
              {kind === "project" ? <Field label="Before image URL"><Input value={draft.beforeImageUrl} maxLength={2048} onChange={(e) => setField("beforeImageUrl", e.target.value)} /></Field> : null}
              {kind === "service" ? <Field label="Service code"><Input value={draft.serviceCode} maxLength={100} placeholder="spring-repair" onChange={(e) => setField("serviceCode", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></Field> : null}
              <Field label="Optional parent">
                <Select value={draft.parentId ?? "none"} onValueChange={(value) => setField("parentId", value === "none" ? null : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No parent</SelectItem>{parents.map((parent) => <SelectItem key={parent.id} value={parent.id}>{parent.title} ({parent.kind})</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Display order"><Input type="number" min={-100000} max={100000} value={draft.sortOrder} onChange={(e) => setField("sortOrder", Number(e.target.value))} /></Field>
              <Field label="SEO title"><Input value={draft.seoTitle} maxLength={160} onChange={(e) => setField("seoTitle", e.target.value)} /></Field>
              <Field label="SEO description"><Textarea rows={2} value={draft.seoDescription} maxLength={320} onChange={(e) => setField("seoDescription", e.target.value)} /></Field>
              <Field label="Publishing status">
                <Select value={draft.status} onValueChange={(value: "draft" | "published") => setField("status", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
                </Select>
              </Field>
              <div className="flex flex-col justify-end gap-[var(--phi-space-2)] rounded-[var(--phi-radius)] border p-[var(--phi-space-2)]">
                <label className="flex items-start gap-[var(--phi-space-1)] text-sm"><Checkbox checked={draft.featured} onCheckedChange={(value) => setField("featured", value === true)} /><span><strong>Featured</strong><br /><span className="text-xs text-slate-500">Give this item priority where supported.</span></span></label>
                <label className="flex items-start gap-[var(--phi-space-1)] text-sm"><Checkbox checked={acknowledged} onCheckedChange={(value) => { setAcknowledged(value === true); setDraft((current) => current ? { ...current, verificationStatus: value === true ? "verified" : "unverified" } : null); }} /><span><strong>I verified this content</strong><br /><span className="text-xs text-slate-500">I acknowledge these facts and claims are accurate. Editing copy requires acknowledgement again.</span></span></label>
                {!acknowledged && draft.status === "published" ? <p role="note" className="text-sm text-amber-800 dark:text-amber-300">Saving this edit without verification keeps it off the public website, even when the status is Published. The preview below shows your draft, not proof that it is live.</p> : null}
              </div>
            </div>
            {formError ? <Alert variant="destructive" className="mt-[var(--phi-space-3)]"><AlertTriangle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert> : null}
            <div className="mt-[var(--phi-space-3)] flex flex-wrap justify-between gap-[var(--phi-space-1)]">
              <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{editing ? "Save changes" : "Create draft"}</Button>
            </div>
          </div>
          <div className="space-y-[var(--phi-space-2)] xl:sticky xl:top-5 xl:self-start">
            <div className="flex items-center justify-between"><p className="flex items-center gap-[var(--phi-space-1)] text-sm font-bold"><Eye className="h-4 w-4" />Live draft preview</p>{draft.status === "published" && draft.slug ? <Button variant="outline" size="sm" asChild><Link href={publicPath(draft)}><ExternalLink className="mr-1 h-3.5 w-3.5" />Public URL</Link></Button> : <span className="text-xs text-slate-500">Not public</span>}</div>
            <ContentPreview draft={draft} />
          </div>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && !items.length ? <div className="rounded-[var(--phi-radius)] border-2 border-dashed p-[var(--phi-space-5)] text-center text-sm text-slate-500">No {COPY[kind].plural.toLowerCase()} yet. Create the first database-backed item.</div> : null}
      <div className="grid gap-[var(--phi-space-2)]">
        {items.map((item) => {
          const protectedPage = item.kind === "page" && CORE_PAGE_SLUGS.has(item.slug);
          return (
            <article key={item.id} className="rounded-[var(--phi-radius)] border-2 border-slate-200 bg-white p-[var(--phi-space-3)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-[var(--phi-space-2)] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-[var(--phi-space-1)]"><h3 className="font-display text-lg font-bold">{item.title}</h3><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge><Badge variant="outline">{item.verificationStatus}</Badge>{item.featured ? <Badge variant="secondary">Featured</Badge> : null}{protectedPage ? <Badge variant="outline">Core page</Badge> : null}</div>
                  <p className="mt-1 truncate text-sm text-slate-500">/{item.slug} · order {item.sortOrder} · updated {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "not recorded"}</p>
                </div>
                <div className="flex shrink-0 gap-[var(--phi-space-1)]">
                  {item.status === "published" ? <Button variant="outline" size="sm" asChild><Link href={publicPath(item)}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />View</Link></Button> : null}
                  <Button variant="outline" size="sm" onClick={() => begin(item)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                  <Button variant="outline" size="sm" disabled={protectedPage} title={protectedPage ? "Core pages cannot be deleted" : "Delete"} onClick={() => setDeleteTarget(item)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle><AlertDialogDescription>This permanently removes the database record and any public version. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={remove} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`space-y-1.5 ${wide ? "md:col-span-2" : ""}`}><span className="flex justify-between gap-[var(--phi-space-1)] text-xs font-bold uppercase tracking-wider text-slate-500">{label}{hint ? <span className="font-normal normal-case tracking-normal text-slate-400">{hint}</span> : null}</span>{children}</label>;
}