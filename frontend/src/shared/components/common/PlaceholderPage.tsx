/**
 * Placeholder page used until module implementation is ready.
 */
import { PageShell } from './PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  status?: 'TODO' | 'BLOCKED' | 'IN PROGRESS';
  helperText?: string;
}

export function PlaceholderPage({
  title,
  subtitle,
  status = 'TODO',
  helperText,
}: PlaceholderPageProps) {
  return (
    <PageShell
      title={title}
      subtitle={subtitle ?? 'Design placeholder with layout and data hooks.'}
      actions={
        <Button variant="outline" className="rounded-full px-4">
          {status}
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="glass-panel border border-border/70">
          <CardHeader>
            <CardTitle>Module Canvas</CardTitle>
            <CardDescription>
              Use this area for list or table components and filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Primary actions, search, and filters belong here.</p>
            <p>Attach API hooks once backend endpoints are ready.</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border border-border/70">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Status and implementation hints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Current status: {status}</p>
            <p>{helperText ?? 'Connect data and refine components in the next phase.'}</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
