import { useEffect, useRef } from 'react';
import { useGetBusinessSettings } from '@workspace/api-client-react';

export default function GalleryPage() {
  const { data: settings } = useGetBusinessSettings();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [settings?.galleryImages]);

  const images = settings?.galleryImages || [];

  return (
    <div className="min-h-screen bg-background noise-overlay phi-section">
      <div className="phi-container">
        <div className="phi-copy mb-[var(--phi-space-6)] reveal-on-scroll">
          <h1 className="phi-page-title mb-6">Our Work</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Browse our recent garage door installations and repair projects across the area. Quality craftsmanship you can trust.
          </p>
        </div>

        {images.length === 0 ? (
          <div className="phi-card text-center py-[var(--phi-space-6)] bg-card border reveal-on-scroll">
            <p className="text-muted-foreground">No gallery images available yet.</p>
          </div>
        ) : (
          <div className="gallery-grid reveal-on-scroll">
            {images.map((img, i) => (
              <figure key={i} className="gallery-tile group">
                <img src={img} alt={`Garage door project ${i + 1}`} loading="lazy" />
                <figcaption className="translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  Project {i + 1}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}