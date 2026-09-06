import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { BookingForm } from "@/components/booking-form";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function ContactPage() {
  return (
    <ContentBoundary>
      <ContactPageContent />
    </ContentBoundary>
  );
}

function ContactPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const contactPage = content.find(c => c.kind === "page" && c.slug === "contact" && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";
  
  return (
    <>
      <Metadata 
        title={contactPage?.seoTitle || "Contact Us"}
        description={contactPage?.seoDescription || contactPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={contactPage?.title || "Contact Us"} 
        subtitle={contactPage?.summary || "Get in touch with our team today"}
        breadcrumbs={[{ label: "Contact" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-6xl">
          {contactPage?.body && (
            <div className="text-center max-w-3xl mx-auto mb-16 text-lg text-muted-foreground font-medium leading-relaxed space-y-4">
              {contactPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            
            {/* Contact Details */}
            <div className="flex flex-col gap-8">
              <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Contact Information</h2>
              
              <div className="flex flex-col gap-6">
                {settings?.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Phone</h4>
                      <a href={`tel:${settings.phone}`} className="text-xl font-medium hover:text-primary transition-colors">{settings.phone}</a>
                    </div>
                  </div>
                )}
                
                {settings?.email && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Email</h4>
                      <a href={`mailto:${settings.email}`} className="text-xl font-medium hover:text-primary transition-colors">{settings.email}</a>
                    </div>
                  </div>
                )}
                
                {settings?.serviceArea && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Service Area</h4>
                      <p className="text-xl font-medium">{settings.serviceArea}</p>
                    </div>
                  </div>
                )}
                
                {isVerified && settings?.trustProfile?.hours && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Operating Hours</h4>
                      <p className="text-xl font-medium whitespace-pre-wrap">{settings.trustProfile.hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Booking Form */}
            <div id="booking" className="bg-card border border-border shadow-lg p-6 md:p-10 rounded-xl relative overflow-hidden scroll-mt-24">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
              <h2 className="font-display text-3xl uppercase tracking-tighter mb-2 relative z-10">Send a Request</h2>
              <p className="text-muted-foreground mb-8 relative z-10">Fill out the form below to get started.</p>
              
              <div className="relative z-10">
                <BookingForm />
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
