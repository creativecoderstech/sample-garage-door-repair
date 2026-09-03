import { useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { useListPublishedGarageServices } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, ChevronRight } from "lucide-react";

export default function ServicesPage() {
  const { data: services } = useListPublishedGarageServices();
  const { data: settings } = useGetPublicBusinessSettings();
  const isVerified = settings?.verificationStatus === "verified";

  return (
    <div className="min-h-screen bg-background noise-overlay phi-section">
      <div className="phi-container">
        <div className="phi-copy mb-[var(--phi-space-6)]">
          <h1 className="phi-page-title mb-6">Our Services</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Professional repair and installation for every part of your garage door system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--phi-space-4)]">
          {services?.map((service) => (
            <div key={service.id} className="phi-card phi-card-interactive group bg-card border p-[var(--phi-space-4)] flex flex-col h-full">
              <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                <Wrench className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
              <p className="font-semibold text-foreground/80 mb-2">{service.benefit}</p>
              <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{service.description}</p>
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                <span className="font-bold text-sm">
                  {isVerified ? `Starting estimate $${service.startingPrice}` : "Estimate after inspection"}
                </span>
                <Button variant="ghost" size="sm" asChild className="rounded-full">
                  <Link href="/#booking">Book <ChevronRight className="h-4 w-4 ml-1"/></Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}