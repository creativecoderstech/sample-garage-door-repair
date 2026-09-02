import { useGetBusinessSettings, useUpdateBusinessSettings, getGetBusinessSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ShieldAlert, Store, Palette, Save, Loader2, Images, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const imageLocation = z.string().refine(
  (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
  "Enter a full image URL or a same-site path beginning with /",
);

const settingsSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  phone: z.string().min(10, "Valid phone is required"),
  email: z.string().email("Valid email is required"),
  serviceArea: z.string().min(2, "Service area is required"),
  theme: z.string(),
  serviceId: z.string().min(1, "Service ID is required"),
  emergencyEnabled: z.boolean(),
  heroImage: imageLocation,
  galleryImagesText: z.string().superRefine((value, context) => {
    const invalid = value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .find((entry) => !imageLocation.safeParse(entry).success);
    if (invalid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each line must be a full image URL or a same-site path beginning with /",
      });
    }
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const THEMES = [
  {
    id: "industrial",
    name: "Industrial",
    desc: "Bold orange & dark gray. Maximum contrast.",
    mood: "Confident and action-oriented",
    preview: {
      background: "hsl(40 10% 98%)",
      foreground: "hsl(220 15% 15%)",
      card: "hsl(0 0% 100%)",
      primary: "hsl(24 95% 53%)",
      secondary: "hsl(220 15% 15%)",
      accent: "hsl(24 95% 53%)",
      border: "hsl(220 10% 85%)",
    },
  },
  {
    id: "trust",
    name: "Trust",
    desc: "Professional blue & clean white. Reassuring.",
    mood: "Clear and dependable",
    preview: {
      background: "hsl(210 20% 98%)",
      foreground: "hsl(222 47% 11%)",
      card: "hsl(0 0% 100%)",
      primary: "hsl(221 83% 53%)",
      secondary: "hsl(210 40% 96.1%)",
      accent: "hsl(210 40% 96.1%)",
      border: "hsl(214.3 31.8% 91.4%)",
    },
  },
  {
    id: "eco",
    name: "Eco",
    desc: "Forest green & natural tones. Sustainable.",
    mood: "Warm and grounded",
    preview: {
      background: "hsl(120 10% 98%)",
      foreground: "hsl(120 20% 15%)",
      card: "hsl(0 0% 100%)",
      primary: "hsl(142 40% 40%)",
      secondary: "hsl(30 20% 92%)",
      accent: "hsl(142 40% 40%)",
      border: "hsl(120 10% 85%)",
    },
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Stark black & white with red hits. Minimal.",
    mood: "Sharp and contemporary",
    preview: {
      background: "hsl(0 0% 100%)",
      foreground: "hsl(0 0% 0%)",
      card: "hsl(0 0% 98%)",
      primary: "hsl(0 0% 0%)",
      secondary: "hsl(0 0% 90%)",
      accent: "hsl(0 90% 50%)",
      border: "hsl(0 0% 90%)",
    },
  },
  {
    id: "classic",
    name: "Classic",
    desc: "Navy blue & gold. Traditional service.",
    mood: "Established and welcoming",
    preview: {
      background: "hsl(40 10% 98%)",
      foreground: "hsl(220 30% 20%)",
      card: "hsl(0 0% 100%)",
      primary: "hsl(220 40% 25%)",
      secondary: "hsl(45 90% 60%)",
      accent: "hsl(45 90% 60%)",
      border: "hsl(220 10% 85%)",
    },
  },
];

type ThemeOption = (typeof THEMES)[number];

function ThemePreview({ theme }: { theme: ThemeOption }) {
  const { preview } = theme;
  return (
    <div
      className="mt-4 overflow-hidden rounded-lg border shadow-sm"
      style={{ backgroundColor: preview.background, color: preview.foreground, borderColor: preview.border }}
      aria-label={`${theme.name} color preview`}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: preview.primary, color: "#fff" }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: preview.accent }} />
          <span className="text-[10px] font-bold tracking-wide">YOUR BUSINESS</span>
        </div>
        <span className="text-[9px] font-medium opacity-80">Services · Contact</span>
      </div>
      <div className="grid grid-cols-[1.35fr_1fr] gap-2 p-3">
        <div>
          <div className="mb-1 h-1.5 w-4/5 rounded-full" style={{ backgroundColor: preview.foreground, opacity: 0.9 }} />
          <div className="mb-2 h-1.5 w-3/5 rounded-full" style={{ backgroundColor: preview.foreground, opacity: 0.45 }} />
          <span className="inline-flex rounded px-2 py-1 text-[9px] font-bold" style={{ backgroundColor: preview.primary, color: "#fff" }}>
            Book Service
          </span>
        </div>
        <div className="rounded border p-2" style={{ backgroundColor: preview.card, borderColor: preview.border }}>
          <div className="mb-2 h-2 w-3/5 rounded-full" style={{ backgroundColor: preview.foreground, opacity: 0.75 }} />
          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: preview.secondary }} />
          <div className="mt-1.5 h-1.5 w-4/5 rounded-full" style={{ backgroundColor: preview.accent, opacity: 0.8 }} />
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useGetBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      email: "",
      serviceArea: "",
      theme: "industrial",
      serviceId: "",
      emergencyEnabled: false,
      heroImage: "",
      galleryImagesText: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName,
        phone: settings.phone,
        email: settings.email,
        serviceArea: settings.serviceArea,
        theme: settings.theme,
        serviceId: settings.serviceId,
        emergencyEnabled: settings.emergencyEnabled,
        heroImage: settings.heroImage,
        galleryImagesText: settings.galleryImages.join("\n"),
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsFormValues) => {
    setIsSaving(true);
    const { galleryImagesText, ...settingsValues } = values;
    updateSettings.mutate({ data: {
      ...settingsValues,
      galleryImages: galleryImagesText.split("\n").map((url) => url.trim()).filter(Boolean),
    } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBusinessSettingsQueryKey() });
        toast({
          title: "Settings saved",
          description: "Business configuration has been updated successfully.",
        });
        setTimeout(() => setIsSaving(false), 500);
      },
      onError: () => {
        setIsSaving(false);
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedTheme = form.watch("theme");

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="rounded-2xl border-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display"><Store className="h-5 w-5 text-primary"/> Public Identity</CardTitle>
              <CardDescription>How your business appears to customers on the site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Phone Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Email</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="serviceArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Area Description</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Greater Seattle Area" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display"><Images className="h-5 w-5 text-primary"/> Website Photography</CardTitle>
              <CardDescription>Use licensed stock photos or your own hosted images. Changes appear on the customer website after saving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="heroImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Homepage Hero Image URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                    <FormDescription>A wide image of a clean garage-door installation works best.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="galleryImagesText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Gallery Image URLs</FormLabel>
                    <FormControl>
                      <textarea {...field} rows={5} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder={"https://.../project-1.jpg\nhttps://.../project-2.jpg"} />
                    </FormControl>
                    <FormDescription>Enter one image URL per line. The first three appear on the homepage.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("heroImage") && (
                <div className="overflow-hidden rounded-xl border bg-muted aspect-[16/6]">
                  <img src={form.watch("heroImage")} alt="Hero preview" className="h-full w-full object-cover" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display"><Palette className="h-5 w-5 text-primary"/> Site Aesthetics</CardTitle>
              <CardDescription>Choose the visual identity for your public website.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {THEMES.map((theme) => (
                          <FormItem key={theme.id} className="relative flex items-center space-x-0 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value={theme.id}
                                className="peer sr-only"
                                aria-label={`Use ${theme.name} theme`}
                              />
                            </FormControl>
                            <FormLabel className="w-full cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-muted/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                              <div className="flex items-start gap-3">
                                <div className="flex shrink-0 gap-1 rounded-full border border-black/10 bg-background p-1 shadow-sm" aria-hidden="true">
                                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.preview.primary }} />
                                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.preview.secondary }} />
                                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.preview.accent }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold">{theme.name}</span>
                                    {selectedTheme === theme.id && (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                                      </span>
                                    )}
                                  </div>
                                  <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{theme.desc}</span>
                                  <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">{theme.mood}</span>
                                </div>
                              </div>
                              <ThemePreview theme={theme} />
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-destructive/20 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-destructive"><ShieldAlert className="h-5 w-5"/> Operations & Safety</CardTitle>
              <CardDescription>Critical flags for your dispatch logic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="emergencyEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                    <div className="space-y-0.5 max-w-[80%]">
                      <FormLabel className="text-base font-bold text-destructive">24/7 Emergency Mode</FormLabel>
                      <FormDescription>
                        When active, the site displays banners indicating immediate availability. The booking flow will highlight emergency options.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-destructive"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creative Coders Service ID</FormLabel>
                    <FormControl><Input {...field} className="font-mono text-sm max-w-sm" /></FormControl>
                    <FormDescription>Internal identifier for API integration.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="sticky bottom-3 z-10 flex items-center justify-end gap-4 rounded-2xl border-2 bg-background/95 px-4 py-4 shadow-lg backdrop-blur">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSaving}>
              Discard Changes
            </Button>
            <Button type="submit" size="lg" className="min-w-[140px] font-bold shadow-md glow-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save Settings</>}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
