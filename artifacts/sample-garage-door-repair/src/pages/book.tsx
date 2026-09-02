import { BookingForm } from "@/components/booking-form";

export default function BookPage() {
  return (
    <div className="min-h-screen bg-muted/10 noise-overlay phi-section flex items-center justify-center">
      <div className="phi-container max-w-4xl">
        <div className="text-center mb-[var(--phi-space-5)]">
          <h1 className="phi-section-title mx-auto mb-4">Schedule Service</h1>
          <p className="text-muted-foreground text-lg">We'll be there when you need us.</p>
        </div>
        <BookingForm className="max-w-4xl mx-auto" />
      </div>
    </div>
  );
}