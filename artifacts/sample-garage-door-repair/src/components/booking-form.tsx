import { useState, useRef, useEffect, useMemo } from 'react';
import { useCreateServiceRequest, useGetAvailability } from '@workspace/api-client-react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarCheck, ShieldCheck, MapPin } from "lucide-react";

const bookingSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Valid phone is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
  zip: z.string().min(5, "ZIP code is required"),
  service: z.string().min(2, "Service type is required"),
  urgency: z.enum(["emergency", "soon", "flexible"]),
  preferredDate: z.string().min(1, "Preferred date is required"),
  details: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({ className = "" }: { className?: string }) {
  const { toast } = useToast();
  const createRequest = useCreateServiceRequest();
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      zip: "",
      service: "repair",
      urgency: "soon",
      preferredDate: new Date().toISOString().split('T')[0],
      details: "",
    }
  });

  const zip = form.watch("zip");
  const { data: availability } = useGetAvailability({ zip }, { query: { enabled: zip.length >= 5, queryKey: ["availability", zip] } });

  const onSubmit = (values: BookingFormValues) => {
    createRequest.mutate({ data: {
      customerName: values.customerName,
      phone: values.phone,
      email: values.email || "",
      zip: values.zip,
      service: values.service,
      urgency: values.urgency,
      preferredDate: values.preferredDate,
      details: values.details,
    }}, {
      onSuccess: () => {
        toast({
          title: "Request Received!",
          description: "We'll be in touch shortly to confirm your appointment.",
        });
        form.reset();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Something went wrong. Please call us directly.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className={`bg-card rounded-2xl border shadow-xl overflow-hidden ${className}`}>
      <div className="bg-primary p-6 text-primary-foreground">
        <h3 className="text-2xl font-display font-bold flex items-center gap-2">
          <CalendarCheck className="w-6 h-6" /> Book Service
        </h3>
        <p className="text-primary-foreground/80 mt-2 text-sm">Most requests are answered within 45 minutes.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
             <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="zip" render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl><Input placeholder="12345" {...field} maxLength={5} /></FormControl>
                {availability && (
                  <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${availability.available ? 'text-emerald-600' : 'text-destructive'}`}>
                    {availability.available ? <ShieldCheck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {availability.message}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="service" render={({ field }) => (
            <FormItem>
              <FormLabel>Service Needed</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="repair">General Repair</SelectItem>
                  <SelectItem value="springs">Broken Springs</SelectItem>
                  <SelectItem value="opener">Opener Issues</SelectItem>
                  <SelectItem value="installation">New Door Installation</SelectItem>
                  <SelectItem value="maintenance">Routine Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField control={form.control} name="urgency" render={({ field }) => (
              <FormItem>
                <FormLabel>Urgency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="How soon?" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="emergency" className="text-destructive font-bold">Emergency (ASAP)</SelectItem>
                    <SelectItem value="soon">Soon (Next few days)</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="preferredDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="details" render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <Textarea placeholder="Briefly describe the issue..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" size="lg" className="w-full font-bold text-lg h-14 mt-4 shadow-md glow-primary" disabled={createRequest.isPending}>
            {createRequest.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Service"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
