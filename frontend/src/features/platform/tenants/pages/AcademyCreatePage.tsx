/**
 * Academy Create Page (Platform - SUPERADMIN)
 * Create a new academy
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCreateAcademy } from '../hooks/hooks';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import type { CreateAcademyRequest } from '../types';

export const AcademyCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateAcademyRequest>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    timezone: 'UTC',
    owner_email: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const createAcademy = useCreateAcademy();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (!formData.slug || formData.slug.trim().length === 0) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 255) {
      newErrors.slug = 'Slug must be 255 characters or less';
    }

    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.website && formData.website.trim().length > 0) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid URL';
      }
    }

    if (!formData.owner_email || formData.owner_email.trim().length === 0) {
      newErrors.owner_email = 'Owner email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.owner_email)) {
        newErrors.owner_email = 'Please enter a valid email address';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof CreateAcademyRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data - remove empty strings for optional fields
      const submitData: CreateAcademyRequest = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        owner_email: formData.owner_email.trim().toLowerCase(),
      };

      if (formData.phone?.trim()) {
        submitData.phone = formData.phone.trim();
      }
      if (formData.website?.trim()) {
        submitData.website = formData.website.trim();
      }
      if (formData.address_line1?.trim()) {
        submitData.address_line1 = formData.address_line1.trim();
      }
      if (formData.address_line2?.trim()) {
        submitData.address_line2 = formData.address_line2.trim();
      }
      if (formData.city?.trim()) {
        submitData.city = formData.city.trim();
      }
      if (formData.state?.trim()) {
        submitData.state = formData.state.trim();
      }
      if (formData.postal_code?.trim()) {
        submitData.postal_code = formData.postal_code.trim();
      }
      if (formData.country?.trim()) {
        submitData.country = formData.country.trim();
      }
      if (formData.timezone?.trim()) {
        submitData.timezone = formData.timezone.trim();
      }

      const academy = await createAcademy.mutateAsync(submitData);
      navigate(`/dashboard/platform/academies/${academy.id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create academy'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/academies')}>
          ← Back to Academies
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Academy</CardTitle>
          <CardDescription>Register a new academy in the platform</CardDescription>
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

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Academy Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                  {(errors.name || clientErrors.name) && (
                    <p className="text-sm text-destructive">
                      {errors.name?.[0] || clientErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">
                    Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value.toLowerCase())}
                    placeholder="academy-slug"
                    required
                  />
                  {(errors.slug || clientErrors.slug) && (
                    <p className="text-sm text-destructive">
                      {errors.slug?.[0] || clientErrors.slug}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Academy Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                  {(errors.email || clientErrors.email) && (
                    <p className="text-sm text-destructive">
                      {errors.email?.[0] || clientErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone[0]}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
                {(errors.website || clientErrors.website) && (
                  <p className="text-sm text-destructive">
                    {errors.website?.[0] || clientErrors.website}
                  </p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleChange('address_line1', e.target.value)}
                />
                {errors.address_line1 && (
                  <p className="text-sm text-destructive">{errors.address_line1[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleChange('address_line2', e.target.value)}
                />
                {errors.address_line2 && (
                  <p className="text-sm text-destructive">{errors.address_line2[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                  />
                  {errors.postal_code && (
                    <p className="text-sm text-destructive">{errors.postal_code[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    placeholder="UTC"
                  />
                  {errors.timezone && (
                    <p className="text-sm text-destructive">{errors.timezone[0]}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Owner Information</h3>
              <div className="space-y-2">
                <Label htmlFor="owner_email">
                  Owner Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => handleChange('owner_email', e.target.value)}
                  placeholder="owner@example.com"
                  required
                />
                {(errors.owner_email || clientErrors.owner_email) && (
                  <p className="text-sm text-destructive">
                    {errors.owner_email?.[0] || clientErrors.owner_email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  An invitation email will be sent to this address
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/platform/academies')}
                disabled={createAcademy.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAcademy.isPending}>
                {createAcademy.isPending ? 'Creating...' : 'Create Academy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
