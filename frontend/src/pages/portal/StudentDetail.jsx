import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import portalAxios from '@/api/portalAxios';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function StudentDetail() {
  const { studentId = 'me' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'student', studentId],
    queryFn: async () => {
      const response = await portalAxios.get(`portal/students/${studentId}/`);
      return response.data;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Student not available</AlertTitle>
        <AlertDescription>Student details could not be loaded.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Student Detail</h1>
      <pre className="rounded-md border bg-muted/30 p-4 text-xs">{JSON.stringify(data ?? {}, null, 2)}</pre>
    </section>
  );
}

