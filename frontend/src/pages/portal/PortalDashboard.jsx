import { useQuery } from '@tanstack/react-query';
import portalAxios from '@/api/portalAxios';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function PortalDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: async () => {
      const response = await portalAxios.get('portal/dashboard/');
      return response.data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load dashboard</AlertTitle>
        <AlertDescription>Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Portal Dashboard</h1>
      <p className="text-sm text-muted-foreground">Welcome to the portal area scaffold.</p>
      <pre className="rounded-md border bg-muted/30 p-4 text-xs">{JSON.stringify(data ?? {}, null, 2)}</pre>
    </section>
  );
}

