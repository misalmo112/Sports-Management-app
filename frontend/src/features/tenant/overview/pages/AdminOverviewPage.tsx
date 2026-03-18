/**
 * Admin Overview Page
 * Admin dashboard overview
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertTriangle, Calendar, DollarSign, GraduationCap, Users, UserCog, BookOpen, FileText, Receipt, FileBarChart, Settings, ClipboardCheck, HardDrive, TrendingUp } from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';
import { Link } from 'react-router-dom';
import { useOverview } from '../hooks/useOverview';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

export const AdminOverviewPage = () => {
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
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground mt-2">Academy management dashboard</p>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert, idx) => (
            <Alert
              key={idx}
              variant={alert.severity?.toLowerCase() === 'high' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {data.counts && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Link to="/dashboard/students">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.counts.students}</div>
                <p className="text-xs text-muted-foreground">Active students</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/management/staff">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coaches</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.counts.coaches}</div>
                <p className="text-xs text-muted-foreground">Active coaches</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/users">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.counts.admins}</div>
                <p className="text-xs text-muted-foreground">Admin users</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/classes">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.counts.classes}</div>
                <p className="text-xs text-muted-foreground">Classes (current)</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

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
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.finance_summary.unpaid_invoices}</div>
                <p className="text-xs text-muted-foreground">Invoices pending payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.finance_summary.total_due)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.finance_summary.overdue_invoices} overdue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected (30 days)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.finance_summary.collected_last_30_days ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Revenue last 30 days</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {data.usage && data.quota && (data.quota.max_students > 0 || data.quota.storage_bytes_limit > 0) && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usage</CardTitle>
              <CardDescription>Plan usage and storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.quota.max_students > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Students</span>
                    <span>{data.usage.students_count} / {data.quota.max_students}</span>
                  </div>
                  <Progress value={Math.min(100, (data.usage.students_count / data.quota.max_students) * 100)} />
                </div>
              )}
              {data.quota.max_coaches > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Coaches</span>
                    <span>{data.usage.coaches_count} / {data.quota.max_coaches}</span>
                  </div>
                  <Progress value={Math.min(100, (data.usage.coaches_count / data.quota.max_coaches) * 100)} />
                </div>
              )}
              {data.quota.storage_bytes_limit > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage</span>
                    <span>{data.usage.storage_used_gb} GB / {(data.quota.storage_bytes_limit / (1024 ** 3)).toFixed(2)} GB</span>
                  </div>
                  <Progress value={Math.min(100, (data.usage.storage_used_bytes / data.quota.storage_bytes_limit) * 100)} />
                </div>
              )}
              <Link to="/dashboard/settings/usage" className="text-xs text-primary hover:underline flex items-center gap-1">
                <HardDrive className="h-3 w-3" /> View usage details
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {data.activity && (
        <div className="mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity (30 days)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.activity.new_students_30d} new students, {data.activity.new_enrollments_30d} new enrollments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick links</CardTitle>
            <CardDescription>Jump to main sections</CardDescription>
          </CardHeader>
          <CardContent>
            <nav className="flex flex-wrap gap-2">
              <Link to="/dashboard/students" className="text-sm text-primary hover:underline flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Students
              </Link>
              <Link to="/dashboard/classes" className="text-sm text-primary hover:underline flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Classes
              </Link>
              <Link to="/dashboard/attendance" className="text-sm text-primary hover:underline flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" /> Attendance
              </Link>
              <Link to="/dashboard/finance/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
                <FileText className="h-3 w-3" /> Invoices
              </Link>
              <Link to="/dashboard/finance/receipts" className="text-sm text-primary hover:underline flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Receipts
              </Link>
              <Link to="/dashboard/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
                <FileBarChart className="h-3 w-3" /> Reports
              </Link>
              <Link to="/dashboard/settings" className="text-sm text-primary hover:underline flex items-center gap-1">
                <Settings className="h-3 w-3" /> Settings
              </Link>
            </nav>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Academy overview and statistics</CardDescription>
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
