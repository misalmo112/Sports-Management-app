/**
 * Parent Overview Page
 * Parent dashboard overview
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Calendar, Users } from 'lucide-react';
import { useOverview } from '../hooks/useOverview';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

export const ParentOverviewPage = () => {
  const { data, isLoading, error, refetch } = useOverview();
  const { formatCurrency } = useAcademyFormat();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading overview..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load overview"
          fullPage
        />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Parent Overview</h1>
        <p className="text-muted-foreground mt-2">Your parent dashboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {data.today_classes && data.today_classes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.today_classes.length}</div>
              <p className="text-xs text-muted-foreground">Classes scheduled today</p>
            </CardContent>
          </Card>
        )}

        {data.attendance_summary && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.attendance_summary.present + data.attendance_summary.absent > 0
                  ? Math.round(
                      (data.attendance_summary.present /
                        (data.attendance_summary.present + data.attendance_summary.absent)) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {data.attendance_summary.present} present, {data.attendance_summary.absent} absent
              </p>
            </CardContent>
          </Card>
        )}

        {data.finance_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.finance_summary.total_due)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.finance_summary.unpaid_invoices} unpaid invoices
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Your children's information and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.today_classes && data.today_classes.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-2">Today's Classes</h3>
                <ul className="list-disc list-inside space-y-1">
                  {data.today_classes.map((classItem: any, idx: number) => (
                    <li key={idx}>{classItem.name || `Class ${idx + 1}`}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">No classes scheduled for today</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
