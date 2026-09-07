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
  const hasContactInfo = Boolean(
    settings?.phone ||
    settings?.email ||
    settings?.serviceArea ||
    (isVerified && settings?.trustProfile?.hours),
  );
  
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
            <div className="text-center max-w-3xl mx-auto mb-[var(--phi-space-6)] text-lg text-muted-foreground font-medium leading-relaxed space-y-[var(--phi-space-3)]">
              {contactPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className={`grid grid-cols-1 gap-[var(--phi-space-5)] lg:gap-[var(--phi-space-6)] ${hasContactInfo ? "lg:grid-cols-2" : ""}`}>
            
            {/* Contact Details */}
            {hasContactInfo && <div className="flex flex-col gap-[var(--phi-space-4)]">
              <h2 className="garage-display text-4xl uppercase tracking-wide mb-[var(--phi-space-3)]">Contact Information</h2>
              
              <div className="flex flex-col gap-[var(--phi-space-4)]">
                {settings?.phone && (
                  <div className="flex items-start gap-[var(--phi-space-3)]">
                    <div className="w-12 h-12 bg-primary rounded flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-sm">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Phone</h4>
                      <a href={`tel:${settings.phone}`} className="text-xl font-medium hover:text-primary transition-colors">{settings.phone}</a>
                    </div>
                  </div>
                )}
                
                {settings?.email && (
                  <div className="flex items-start gap-[var(--phi-space-3)]">
                    <div className="w-12 h-12 bg-primary rounded flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Email</h4>
                      <a href={`mailto:${settings.email}`} className="text-xl font-medium hover:text-primary transition-colors">{settings.email}</a>
                    </div>
                  </div>
                )}
                
                {settings?.serviceArea && (
                  <div className="flex items-start gap-[var(--phi-space-3)]">
                    <div className="w-12 h-12 bg-primary rounded flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-sm">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Service Area</h4>
                      <p className="text-xl font-medium">{settings.serviceArea}</p>
                    </div>
                  </div>
                )}
                
                {isVerified && settings?.trustProfile?.hours && (
                  <div className="flex items-start gap-[var(--phi-space-3)]">
                    <div className="w-12 h-12 bg-primary rounded flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-1">Operating Hours</h4>
                      <p className="text-xl font-medium whitespace-pre-wrap">{settings.trustProfile.hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>}
            
            {/* Booking Form */}
            <div id="booking" className={`relative w-full scroll-mt-24 ${hasContactInfo ? "" : "mx-auto max-w-3xl"}`}>
              <BookingForm />
            </div>
          </div>
          </div>
        </div>
    </>
  );
}
