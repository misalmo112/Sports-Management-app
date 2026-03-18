import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';

type ChecklistItem = {
  key:
    | 'members_imported'
    | 'staff_invited'
    | 'first_program_created'
    | 'age_categories_configured'
    | 'attendance_defaults_configured';
  title: string;
  description: string;
  href: string;
};

const ITEMS: ChecklistItem[] = [
  {
    key: 'members_imported',
    title: 'Import or add members',
    description: 'Get your roster ready by adding students/members.',
    href: '/dashboard/settings/bulk-actions',
  },
  {
    key: 'staff_invited',
    title: 'Invite staff/coaches',
    description: 'Add admins/coaches so they can start working.',
    href: '/dashboard/users',
  },
  {
    key: 'first_program_created',
    title: 'Create your first class/program',
    description: 'Create a class so you can enroll members and take attendance.',
    href: '/dashboard/classes/new',
  },
  {
    key: 'age_categories_configured',
    title: 'Configure age categories',
    description: 'Optional: set up age categories for organization and reporting.',
    href: '/dashboard/settings/bulk-actions',
  },
  {
    key: 'attendance_defaults_configured',
    title: 'Review attendance defaults',
    description: 'Optional: verify attendance workflows and staff access.',
    href: '/dashboard/attendance',
  },
];

export const SetupChecklistPage = () => {
  const { state, isLoading, error, update, isUpdating } = useOnboardingChecklist();

  const toggle = async (key: ChecklistItem['key'], nextValue: boolean) => {
    await update({ [key]: nextValue } as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading setup checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>We couldn’t load your checklist right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount =
    state ?
      ITEMS.filter((i) => Boolean((state as any)[i.key])).length
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Finish setup</CardTitle>
            <CardDescription>
              Optional steps to get your academy roster-ready. ({completedCount}/{ITEMS.length} completed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ITEMS.map((item) => {
                const checked = Boolean(state && (state as any)[item.key]);
                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={checked}
                        onCheckedChange={(v) => toggle(item.key, Boolean(v))}
                        disabled={isUpdating}
                        aria-label={`Mark ${item.title} as complete`}
                      />
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                    <Button asChild variant="secondary">
                      <Link to={item.href}>Go</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

