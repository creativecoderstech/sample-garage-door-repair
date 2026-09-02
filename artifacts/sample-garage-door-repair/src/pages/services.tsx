import { useListGarageServices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, ChevronRight } from "lucide-react";

export default function ServicesPage() {
  const { data: services } = useListGarageServices();

  return (
    <div className="min-h-screen bg-background noise-overlay py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="max-w-3xl mb-16">
          <h1 className="font-display font-bold text-5xl md:text-6xl mb-6 tracking-tight">Our Services</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Professional repair and installation for every part of your garage door system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services?.map((service) => (
            <div key={service.id} className="group bg-card border rounded-2xl p-8 hover-elevate transition-all duration-300 flex flex-col h-full">
              <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                <Wrench className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
              <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{service.description}</p>
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                <span className="font-bold text-lg">From ${service.startingPrice}</span>
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