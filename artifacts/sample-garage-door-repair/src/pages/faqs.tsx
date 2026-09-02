import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronDown, Phone, ShieldCheck } from 'lucide-react';
import { useListFaqs } from '@/lib/demo-store';
import { useGetBusinessSettings } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';

export default function FaqsPage() {
  const { data: faqs } = useListFaqs();
  const { data: settings } = useGetBusinessSettings();
  const [openId, setOpenId] = useState<string | null>(faqs?.[0]?.id ?? null);

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <section className="phi-section-tight border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="phi-container">
          <div className="phi-copy">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              Clear answers from local experts
            </div>
            <h1 className="phi-page-title mt-6">Frequently Asked Questions</h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">
              Helpful answers about appointments, estimates, safety, warranties, and professional garage-door service.
            </p>
          </div>
        </div>
      </section>

       <section className="phi-section">
        <div className="phi-container grid gap-[var(--phi-space-5)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25.956rem)]">
          <div className="space-y-[var(--phi-space-3)]">
            {faqs?.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <article key={faq.id} className={`phi-card overflow-hidden border bg-card transition-all ${isOpen ? 'border-primary/30 shadow-lg' : 'hover:border-primary/20'}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left font-display text-lg font-bold"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                  >
                    {faq.question}
                    <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="phi-card h-fit border bg-secondary p-[var(--phi-space-4)] text-secondary-foreground shadow-xl lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Still have a question?</p>
            <h2 className="mt-4 font-display text-3xl font-bold">Talk with a garage-door specialist.</h2>
            <p className="mt-4 leading-relaxed text-secondary-foreground/70">
              If a door is crooked, hanging, or has a loose cable or broken spring, stop operating it and call for professional service.
            </p>
            <Button asChild size="lg" className="mt-7 w-full font-bold">
              <a href={`tel:${settings?.phone ?? ''}`}><Phone className="mr-2 h-4 w-4" /> Call {settings?.phone}</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="mt-3 w-full border-secondary-foreground/20 bg-transparent font-bold text-secondary-foreground hover:bg-secondary-foreground/10">
              <Link href="/#booking">Request Service</Link>
            </Button>
          </aside>
        </div>
      </section>
    </div>
  );
}