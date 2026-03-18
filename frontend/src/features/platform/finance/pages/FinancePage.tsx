import { useSearchParams } from 'react-router-dom';
import { CreditCard, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

import { useFinanceSummary } from '../hooks/useFinanceSummary';
import { MONTH_OPTIONS, formatCurrency, formatExpenseCategory } from '../utils';

export const FinancePage = () => {
  const currentDate = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedYear = Number(searchParams.get('year') || currentDate.getFullYear());
  const selectedMonth = Number(searchParams.get('month') || currentDate.getMonth() + 1);
  const yearOptions = Array.from({ length: 7 }, (_, index) => currentDate.getFullYear() - 3 + index);

  const { data: summary, isLoading, error, refetch } = useFinanceSummary(selectedYear, selectedMonth);

  const updatePeriod = (year: number, month: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('year', String(year));
    nextParams.set('month', String(month));
    setSearchParams(nextParams);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading platform finance summary..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load finance summary"
          fullPage
        />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const plValue = parseFloat(summary.pl);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="mt-2 text-muted-foreground">Platform financial overview</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Year</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => updatePeriod(Number(value), selectedMonth)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Month</span>
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => updatePeriod(selectedYear, Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.mrr)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.arr)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net P&amp;L</CardTitle>
            {plValue >= 0 ? (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${plValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.pl)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subs</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active_subscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.churn_count}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Paid operating costs for the selected month</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.expense_breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground">No expenses logged this month.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.expense_breakdown.map((item) => (
                    <TableRow key={`${item.category}-${item.total}`}>
                      <TableCell>{formatExpenseCategory(item.category)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
