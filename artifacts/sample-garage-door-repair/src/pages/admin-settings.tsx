import { useGetBusinessSettings, useUpdateBusinessSettings, getGetBusinessSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ShieldAlert, Store, Palette, Save, Loader2, Images } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  phone: z.string().min(10, "Valid phone is required"),
  email: z.string().email("Valid email is required"),
  serviceArea: z.string().min(2, "Service area is required"),
  theme: z.string(),
  serviceId: z.string().min(1, "Service ID is required"),
  emergencyEnabled: z.boolean(),
  heroImage: z.string().url("Enter a valid image URL"),
  galleryImagesText: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const THEMES = [
  { id: "industrial", name: "Industrial", desc: "Bold orange & dark gray. Maximum contrast.", color: "bg-orange-500" },
  { id: "trust", name: "Trust", desc: "Professional blue & clean white. Reassuring.", color: "bg-blue-600" },
  { id: "eco", name: "Eco", desc: "Forest green & natural tones. Sustainable.", color: "bg-green-600" },
  { id: "modern", name: "Modern", desc: "Stark black & white with red hits. Minimal.", color: "bg-black" },
  { id: "classic", name: "Classic", desc: "Navy blue & gold. Traditional service.", color: "bg-slate-800" },
];

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

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-3xl font-display font-bold tracking-tight">Business Settings</h2>
         <p className="text-muted-foreground mt-1">Configure your public storefront, theme, and operational flags.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
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

          <Card>
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

          <Card>
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
                          <FormItem key={theme.id} className="flex items-center space-x-0 space-y-0 relative">
                            <FormControl>
                              <RadioGroupItem value={theme.id} className="peer sr-only" />
                            </FormControl>
                            <FormLabel className="w-full flex items-start gap-3 p-4 border rounded-xl cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 transition-all">
                              <div className={`w-6 h-6 rounded-full shrink-0 ${theme.color} shadow-sm border border-black/10`} />
                              <div>
                                <span className="font-bold block">{theme.name}</span>
                                <span className="text-sm text-muted-foreground font-normal">{theme.desc}</span>
                              </div>
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

          <Card className="border-destructive/20">
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

          <div className="flex items-center justify-end gap-4 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
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
