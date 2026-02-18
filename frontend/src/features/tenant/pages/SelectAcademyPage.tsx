/**
 * Select Academy Page (Owner)
 * Allows owner to select which academy to manage
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Building2, Check } from 'lucide-react';
import { useAcademies } from '@/features/platform/tenants/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';

export const SelectAcademyPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAcademies({
    is_active: true,
  });

  const handleSelectAcademy = (academyId: string) => {
    // Store selected academy ID in localStorage
    localStorage.setItem('selected_academy_id', academyId);
    // Redirect to dashboard
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading your academies..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load academies"
          fullPage
        />
      </div>
    );
  }

  const academies = data?.results || [];
  const selectedAcademyId = localStorage.getItem('selected_academy_id');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Select Academy</h1>
        <p className="text-muted-foreground mt-2">Choose an academy to manage</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Academies</CardTitle>
          <CardDescription>Select an academy to access its dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {academies.length === 0 ? (
            <EmptyState
              title="No academies found"
              description="You don't have access to any academies yet."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {academies.map((academy) => (
                <Card
                  key={academy.id}
                  className={`cursor-pointer transition-colors hover:bg-muted ${
                    selectedAcademyId === academy.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectAcademy(academy.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{academy.name}</CardTitle>
                          <CardDescription className="mt-1">{academy.slug}</CardDescription>
                        </div>
                      </div>
                      {selectedAcademyId === academy.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {academy.email && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Email:</span> {academy.email}
                        </div>
                      )}
                      {academy.city && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Location:</span>{' '}
                          {[academy.city, academy.state, academy.country]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        {academy.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Inactive
                          </span>
                        )}
                        {academy.onboarding_completed ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            Onboarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            Setup Required
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      variant={selectedAcademyId === academy.id ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAcademy(academy.id);
                      }}
                    >
                      {selectedAcademyId === academy.id ? 'Selected' : 'Select Academy'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
