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
    <div className="min-h-screen bg-background noise-overlay py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="max-w-3xl mb-16 reveal-on-scroll">
          <h1 className="font-display font-bold text-5xl md:text-6xl mb-6 tracking-tight">Our Work</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Browse our recent garage door installations and repair projects across the area. Quality craftsmanship you can trust.
          </p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-20 bg-card border rounded-2xl reveal-on-scroll">
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