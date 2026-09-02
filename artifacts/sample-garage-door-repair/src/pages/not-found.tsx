import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-[var(--phi-space-3)]">
      <Card className="phi-card w-full max-w-md">
        <CardContent className="pt-[var(--phi-space-4)]">
          <div className="flex mb-[var(--phi-space-3)] gap-[var(--phi-space-2)]">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="font-display text-[1.618rem] font-bold text-foreground">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-[var(--phi-space-3)] text-sm leading-relaxed text-muted-foreground">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
