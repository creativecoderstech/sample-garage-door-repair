import { BookingForm } from "@/components/booking-form";

export default function BookPage() {
  return (
    <div className="min-h-screen bg-muted/10 noise-overlay py-20 lg:py-32 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-4 tracking-tight">Schedule Service</h1>
          <p className="text-muted-foreground text-lg">We'll be there when you need us.</p>
        </div>
        <BookingForm className="max-w-2xl mx-auto" />
      </div>
    </div>
  );
}