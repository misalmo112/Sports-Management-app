/**
 * Currencies Settings Page (Academy - view only)
 * Displays platform-defined currencies. Academy currency is set in Organization settings.
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
import { useMasterCurrencies } from '@/shared/hooks/useMasters';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { Building2 } from 'lucide-react';

export const CurrenciesPage = () => {
  const { data, isLoading, error, refetch } = useMasterCurrencies();
  const currencies = data?.currencies ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading currencies..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState error={error} onRetry={() => refetch()} title="Failed to load currencies" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
          <CardDescription>
            Currencies are managed by the platform. Your academy&apos;s currency is set in
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1} className="text-center py-8 text-muted-foreground">
                      No currencies available.
                    </TableCell>
                  </TableRow>
                ) : (
                  currencies.map((code) => (
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
