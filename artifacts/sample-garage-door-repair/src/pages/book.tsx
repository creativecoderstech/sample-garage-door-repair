import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useListGarageServices, useCreateServiceRequest, useGetBusinessSettings } from "@workspace/api-client-react";

const formSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  email: z.string().email("Please enter a valid email address.").or(z.literal("")),
  zip: z.string().min(5, "ZIP code is required."),
  service: z.string().min(1, "Please select a service type."),
  urgency: z.enum(["emergency", "soon", "flexible"]),
  preferredDate: z.date({
    required_error: "A preferred date is required.",
  }),
  details: z.string().optional(),
});

export default function BookPage() {
  const [location, setLocation] = useLocation();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const preselectedService = searchParams.get("service") || "";
  const isEmergencyParam = searchParams.get("emergency") === "true";

  const { data: services, isLoading: isLoadingServices } = useListGarageServices();
  const { data: settings } = useGetBusinessSettings();
  const createRequest = useCreateServiceRequest();
  
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      zip: "",
      service: preselectedService,
      urgency: isEmergencyParam ? "emergency" : "soon",
      details: "",
    },
  });

  // Watch urgency to auto-adjust date if emergency
  const urgencyValue = form.watch("urgency");
  useEffect(() => {
    if (urgencyValue === "emergency") {
      form.setValue("preferredDate", new Date());
    }
  }, [urgencyValue, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Determine exact service name based on slug if possible, otherwise use raw
    const serviceObj = services?.find(s => s.slug === values.service);
    const serviceName = serviceObj ? serviceObj.name : values.service;

    createRequest.mutate({
      data: {
        customerName: values.customerName,
        phone: values.phone,
        email: values.email || "none@provided.com", // API requires email, give fallback
        zip: values.zip,
        service: serviceName,
        urgency: values.urgency,
        preferredDate: values.preferredDate.toISOString(),
        details: values.details,
      }
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        window.scrollTo(0, 0);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 py-20">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="bg-card border rounded-2xl p-10 shadow-lg hover-elevate">
            <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-4">Request Received!</h1>
            <p className="text-muted-foreground text-lg mb-8">
              We've received your service request. Our dispatch team will contact you shortly at the phone number provided to confirm your appointment time.
            </p>
            <Button size="lg" asChild className="w-full rounded-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-bold tracking-tight mb-4">Book Service</h1>
          <p className="text-lg text-muted-foreground">
            Fill out the form below and we'll dispatch a technician to your location.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 md:p-10 shadow-sm">
          {settings?.emergencyEnabled && urgencyValue === "emergency" && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-8 flex gap-3 items-start">
               <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold">24/7 Emergency Mode Active</h4>
                 <p className="text-sm mt-1 text-destructive/90">Our crews are standing by. We treat this as a high-priority dispatch.</p>
               </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-6">
                <h3 className="text-xl font-display font-bold border-b pb-2">1. Your Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" type="tel" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" type="email" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="90210" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6">
                <h3 className="text-xl font-display font-bold border-b pb-2">2. Service Details</h3>

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How soon do you need us?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4"
                        >
                          <FormItem className="flex items-center space-x-0 space-y-0 relative">
                            <FormControl>
                              <RadioGroupItem value="emergency" className="peer sr-only" />
                            </FormControl>
                            <FormLabel className="w-full font-normal cursor-pointer text-center p-4 border rounded-xl peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/10 peer-data-[state=checked]:font-bold hover:bg-muted transition-colors">
                              Emergency
                              <span className="block text-xs mt-1 text-muted-foreground peer-data-[state=checked]:text-destructive/80">ASAP (24/7)</span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-0 space-y-0 relative">
                            <FormControl>
                              <RadioGroupItem value="soon" className="peer sr-only" />
                            </FormControl>
                            <FormLabel className="w-full font-normal cursor-pointer text-center p-4 border rounded-xl peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:font-bold hover:bg-muted transition-colors">
                              Soon
                              <span className="block text-xs mt-1 text-muted-foreground peer-data-[state=checked]:text-primary/80">Next few days</span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-0 space-y-0 relative">
                            <FormControl>
                              <RadioGroupItem value="flexible" className="peer sr-only" />
                            </FormControl>
                            <FormLabel className="w-full font-normal cursor-pointer text-center p-4 border rounded-xl peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:font-bold hover:bg-muted transition-colors">
                              Flexible
                              <span className="block text-xs mt-1 text-muted-foreground peer-data-[state=checked]:text-primary/80">Next week or so</span>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a service...</option>
                            {isLoadingServices ? (
                              <option disabled>Loading services...</option>
                            ) : (
                              services?.map(s => (
                                <option key={s.id} value={s.slug}>{s.name}</option>
                              ))
                            )}
                            <option value="other">Other / Not Sure</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-1.5">
                        <FormLabel>Preferred Date {urgencyValue === 'emergency' && '(Today)'}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal bg-background",
                                  !field.value && "text-muted-foreground",
                                  urgencyValue === 'emergency' && "opacity-70 pointer-events-none"
                                )}
                                disabled={urgencyValue === 'emergency'}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe the problem</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="My door is stuck halfway open and I heard a loud pop..." 
                          className="resize-none min-h-[120px] bg-background" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional details help our technicians prepare.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6 border-t">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg font-bold rounded-xl"
                  disabled={createRequest.isPending}
                >
                  {createRequest.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Request...</>
                  ) : (
                    "Submit Service Request"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  By submitting this form, you agree to receive communications regarding your service request.
                </p>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
