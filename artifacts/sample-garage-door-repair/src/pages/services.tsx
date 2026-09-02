import { Link } from "wouter";
import { Wrench, Shield, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { useListGarageServices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  const { data: services, isLoading } = useListGarageServices();

  const emergencyServices = services?.filter(s => s.emergency) || [];
  const standardServices = services?.filter(s => !s.emergency) || [];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <section className="bg-muted py-16 md:py-24 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6">Service Catalog</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            From snapped springs to completely new installations, we handle every part of your garage door system with professional grade parts and expert precision.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        
        {/* Emergency Services */}
        {emergencyServices.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-destructive/10 text-destructive p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-display font-bold">Emergency Services</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {emergencyServices.map(service => (
                <div key={service.id} className="border-2 border-destructive/20 bg-destructive/5 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground px-3 py-1 text-xs font-bold rounded-bl-lg uppercase tracking-wider">
                    Priority Response
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2 pr-20">{service.name}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">{service.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium mb-6 text-foreground/80">
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-destructive"/> {service.duration}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-lg text-destructive">From ${service.startingPrice}</span>
                    <Button variant="destructive" asChild className="rounded-full shadow-sm">
                      <Link href={`/book?service=${service.slug}`}>Request Now <ArrowRight className="h-4 w-4 ml-2"/></Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Standard Services */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <Wrench className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">Standard Services & Repairs</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoading ? (
               <div className="col-span-3 text-center py-20 text-muted-foreground">Loading services...</div>
            ) : (
              standardServices.map(service => (
                <div key={service.id} className="bg-card border rounded-2xl p-8 hover-elevate transition-all duration-300 flex flex-col h-full">
                  <h3 className="text-xl font-bold font-display mb-3">{service.name}</h3>
                  <p className="text-muted-foreground mb-6 flex-1">{service.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium mb-6 bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary"/> {service.duration}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                    <span className="font-bold text-lg">From ${service.startingPrice}</span>
                    <Button variant="outline" asChild className="rounded-full">
                      <Link href={`/book?service=${service.slug}`}>Book <ArrowRight className="h-4 w-4 ml-1"/></Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
