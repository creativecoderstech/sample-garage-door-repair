import { useEffect, useRef } from 'react';
import { useListTasks } from '@/lib/demo-store';

export default function BeforeAfterPage() {
  const { data: tasks } = useListTasks();
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
  }, [tasks]);

  return (
    <div className="min-h-screen bg-background noise-overlay phi-section">
      <div className="phi-container">
        <div className="phi-copy mb-[var(--phi-space-5)] reveal-on-scroll">
          <h1 className="phi-page-title mb-6">Before & After</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Explore matched garage-door transformations photographed at the same properties before and after installation.
          </p>
            <p className="phi-eyebrow mt-5 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-primary">
            Matched online project photography
          </p>
        </div>

        {(!tasks || tasks.length === 0) ? (
          <div className="phi-card text-center py-[var(--phi-space-6)] bg-card border reveal-on-scroll">
            <p className="text-muted-foreground">No before & after tasks available yet.</p>
          </div>
        ) : (
          <div className="ba-grid reveal-on-scroll">
            {tasks.map((task) => (
              <article key={task.id} className="ba-card flex flex-col group">
                <div className="ba-compare">
                  <div className="ba-pane">
                    <span className="ba-tag ba-tag-before shadow-sm">Before</span>
                    <img src={task.beforeImageUrl} alt={`Before ${task.title}`} loading="lazy" />
                  </div>
                  <div className="ba-pane">
                    <span className="ba-tag ba-tag-after shadow-sm">After</span>
                    <img src={task.afterImageUrl} alt={`After ${task.title}`} loading="lazy" />
                  </div>
                </div>
                <div className="ba-meta">
                  <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{task.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}