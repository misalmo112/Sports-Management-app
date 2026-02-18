/**
 * Class Create Page
 * Create a new class
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCreateClass } from '../hooks/hooks';
import { useCoaches } from '@/features/tenant/coaches/hooks/hooks';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import { useSports } from '@/features/tenant/settings/hooks/hooks';
import type { CreateClassRequest } from '../types';

export const ClassCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateClassRequest>({
    name: '',
    description: '',
    coach: undefined,
    sport: undefined,
    location: undefined,
    max_capacity: 20,
    start_date: '',
    end_date: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const createClass = useCreateClass();
  const { data: coachesData, isLoading: isLoadingCoaches } = useCoaches({
    is_active: true,
  });
  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });

  const handleChange = (field: keyof CreateClassRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const classData = await createClass.mutateAsync({
        ...formData,
        coach: formData.coach ? parseInt(formData.coach.toString()) : undefined,
        sport: formData.sport ? parseInt(formData.sport.toString()) : undefined,
        location: formData.location ? parseInt(formData.location.toString()) : undefined,
        max_capacity: formData.max_capacity || 20,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
      navigate(`/dashboard/classes/${classData.id}`);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (typeof errorData === 'object') {
          setErrors(errorData);
        } else {
          setErrors({
            non_field_errors: [errorData || 'Failed to create class'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create class'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/classes')}>
          ← Back to Classes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Class</CardTitle>
          <CardDescription>Create a new class in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                disabled={createClass.isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                disabled={createClass.isPending}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coach">Coach</Label>
                <Select
                  value={formData.coach?.toString() || '__none__'}
                  onValueChange={(value) =>
                    handleChange('coach', value === '__none__' ? undefined : parseInt(value))
                  }
                  disabled={isLoadingCoaches || createClass.isPending}
                >
                  <SelectTrigger id="coach">
                    <SelectValue placeholder="Select a coach (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No coach assigned</SelectItem>
                    {coachesData?.results.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id.toString()}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.coach && (
                  <p className="text-sm text-destructive">{errors.coach[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_capacity">
                  Max Capacity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min="1"
                  value={formData.max_capacity || 20}
                  onChange={(e) =>
                    handleChange('max_capacity', parseInt(e.target.value) || 20)
                  }
                  required
                  disabled={createClass.isPending}
                />
                {errors.max_capacity && (
                  <p className="text-sm text-destructive">{errors.max_capacity[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select
                  value={formData.sport?.toString() || '__none__'}
                  onValueChange={(value) =>
                    handleChange('sport', value === '__none__' ? undefined : parseInt(value))
                  }
                  disabled={createClass.isPending}
                >
                  <SelectTrigger id="sport">
                    <SelectValue placeholder="Select a sport (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No sport assigned</SelectItem>
                    {sportsData?.results.map((sport) => (
                      <SelectItem key={sport.id} value={sport.id.toString()}>
                        {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sport && (
                  <p className="text-sm text-destructive">{errors.sport[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location?.toString() || '__none__'}
                  onValueChange={(value) =>
                    handleChange('location', value === '__none__' ? undefined : parseInt(value))
                  }
                  disabled={createClass.isPending}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select a location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No location assigned</SelectItem>
                    {locationsData?.results.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  disabled={createClass.isPending}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  disabled={createClass.isPending}
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date[0]}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
                disabled={createClass.isPending}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/classes')}
                disabled={createClass.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createClass.isPending}>
                {createClass.isPending ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
