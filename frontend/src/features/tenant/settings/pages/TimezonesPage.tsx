/**
 * Time zones Settings Page (Academy - view only)
 * Displays platform-defined timezones. Academy timezone is set in Organization settings.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { useMasterTimezones } from '@/shared/hooks/useMasters';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { Building2 } from 'lucide-react';

export const TimezonesPage = () => {
  const { data, isLoading, error, refetch } = useMasterTimezones();
  const timezones = data?.timezones ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading time zones..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState error={error} onRetry={() => refetch()} title="Failed to load time zones" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Time zones</CardTitle>
          <CardDescription>
            Time zones are managed by the platform. Your academy&apos;s timezone is set in
            Organization settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/settings/organization">
                <Building2 className="mr-2 h-4 w-4" />
                Organization settings
              </Link>
            </Button>
          </div>
          <div className="rounded-md border max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timezone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timezones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1} className="text-center py-8 text-muted-foreground">
                      No time zones available.
                    </TableCell>
                  </TableRow>
                ) : (
                  timezones.map((code) => (
                    <TableRow key={code}>
                      <TableCell className="font-medium">{code}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
