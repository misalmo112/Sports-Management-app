import { useQuery } from '@tanstack/react-query';
import portalAxios from '@/api/portalAxios';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function InvoiceList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: async () => {
      const response = await portalAxios.get('portal/invoices/');
      return response.data;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invoices unavailable</AlertTitle>
        <AlertDescription>Could not load portal invoices.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <pre className="rounded-md border bg-muted/30 p-4 text-xs">{JSON.stringify(data ?? [], null, 2)}</pre>
    </section>
  );
}

