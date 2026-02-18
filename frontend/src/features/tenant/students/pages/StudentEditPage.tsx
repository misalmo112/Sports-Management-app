/**
 * Student Edit Page
 * Edit student information
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useStudent, useUpdateStudent } from '../hooks/hooks';
import { useParents } from '../hooks/useParents';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import type { UpdateStudentRequest } from '../types';

export const StudentEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: student, isLoading: isLoadingStudent, error: studentError } = useStudent(id);
  const updateStudent = useUpdateStudent();
  const { data: parentsData } = useParents({ is_active: true, page_size: 100 });

  const [formData, setFormData] = useState<UpdateStudentRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // Populate form when student data loads
  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        date_of_birth: student.date_of_birth || '',
        gender: student.gender,
        emirates_id: student.emirates_id || '',
        parent: student.parent,
        emergency_contact_name: student.emergency_contact_name || '',
        emergency_contact_phone: student.emergency_contact_phone || '',
        emergency_contact_relationship: student.emergency_contact_relationship || '',
        medical_notes: student.medical_notes || '',
        allergies: student.allergies || '',
        is_active: student.is_active,
      });
    }
  }, [student]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.first_name !== undefined) {
      if (!formData.first_name || formData.first_name.trim().length === 0) {
        newErrors.first_name = 'First name is required';
      } else if (formData.first_name.length > 100) {
        newErrors.first_name = 'First name must be 100 characters or less';
      }
    }

    if (formData.last_name !== undefined) {
      if (!formData.last_name || formData.last_name.trim().length === 0) {
        newErrors.last_name = 'Last name is required';
      } else if (formData.last_name.length > 100) {
        newErrors.last_name = 'Last name must be 100 characters or less';
      }
    }

    if (formData.date_of_birth && formData.date_of_birth.trim().length > 0) {
      const date = new Date(formData.date_of_birth);
      if (isNaN(date.getTime())) {
        newErrors.date_of_birth = 'Please enter a valid date';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof UpdateStudentRequest, value: any) => {
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

    if (!id) return;

    try {
      // Prepare data - remove empty strings for optional fields
      const submitData: UpdateStudentRequest = {};

      if (formData.first_name !== undefined) {
        submitData.first_name = formData.first_name.trim();
      }
      if (formData.last_name !== undefined) {
        submitData.last_name = formData.last_name.trim();
      }
      if (formData.date_of_birth !== undefined) {
        submitData.date_of_birth = formData.date_of_birth || undefined;
      }
      if (formData.gender !== undefined) {
        submitData.gender = formData.gender;
      }
      if (formData.emirates_id !== undefined) {
        submitData.emirates_id = formData.emirates_id?.trim() || undefined;
      }
      if (formData.parent !== undefined) {
        submitData.parent = formData.parent || undefined;
      }
      if (formData.emergency_contact_name !== undefined) {
        submitData.emergency_contact_name = formData.emergency_contact_name?.trim() || undefined;
      }
      if (formData.emergency_contact_phone !== undefined) {
        submitData.emergency_contact_phone = formData.emergency_contact_phone?.trim() || undefined;
      }
      if (formData.emergency_contact_relationship !== undefined) {
        submitData.emergency_contact_relationship =
          formData.emergency_contact_relationship?.trim() || undefined;
      }
      if (formData.medical_notes !== undefined) {
        submitData.medical_notes = formData.medical_notes?.trim() || undefined;
      }
      if (formData.allergies !== undefined) {
        submitData.allergies = formData.allergies?.trim() || undefined;
      }
      if (formData.is_active !== undefined) {
        submitData.is_active = formData.is_active;
      }

      await updateStudent.mutateAsync({ id, data: submitData });
      navigate(`/dashboard/students/${id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to update student'],
        });
      }
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading student..." />
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={studentError || new Error('Student not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load student"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/students/${id}`)}>
          ← Back to Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Student</CardTitle>
          <CardDescription>
            {student.full_name || `${student.first_name} ${student.last_name}`}
          </CardDescription>
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

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    required
                  />
                  {(errors.first_name || clientErrors.first_name) && (
                    <p className="text-sm text-destructive">
                      {errors.first_name?.[0] || clientErrors.first_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    required
                  />
                  {(errors.last_name || clientErrors.last_name) && (
                    <p className="text-sm text-destructive">
                      {errors.last_name?.[0] || clientErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  />
                  {(errors.date_of_birth || clientErrors.date_of_birth) && (
                    <p className="text-sm text-destructive">
                      {errors.date_of_birth?.[0] || clientErrors.date_of_birth}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender || 'MALE'}
                    onValueChange={(value) =>
                      handleChange('gender', value as UpdateStudentRequest['gender'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-destructive">{errors.gender[0]}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="space-y-2">
                <Label htmlFor="emirates_id">Emirates ID</Label>
                <Input
                  id="emirates_id"
                  type="text"
                  value={formData.emirates_id || ''}
                  onChange={(e) => handleChange('emirates_id', e.target.value)}
                  placeholder="XXX-XXXX-XXXXXXXX"
                />
                {errors.emirates_id && (
                  <p className="text-sm text-destructive">{errors.emirates_id[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">Parent/Guardian</Label>
                <Select
                  value={formData.parent?.toString() || '__none__'}
                  onValueChange={(value) =>
                    handleChange('parent', value === '__none__' ? undefined : parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {parentsData?.results.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {parent.full_name} ({parent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parent && (
                  <p className="text-sm text-destructive">{errors.parent[0]}</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Emergency Contact</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name || ''}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  />
                  {errors.emergency_contact_name && (
                    <p className="text-sm text-destructive">
                      {errors.emergency_contact_name[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone || ''}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  />
                  {errors.emergency_contact_phone && (
                    <p className="text-sm text-destructive">
                      {errors.emergency_contact_phone[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                  <Input
                    id="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship || ''}
                    onChange={(e) =>
                      handleChange('emergency_contact_relationship', e.target.value)
                    }
                  />
                  {errors.emergency_contact_relationship && (
                    <p className="text-sm text-destructive">
                      {errors.emergency_contact_relationship[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Medical Information</h3>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies || ''}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  rows={2}
                  placeholder="List any known allergies..."
                />
                {errors.allergies && (
                  <p className="text-sm text-destructive">{errors.allergies[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_notes">Medical Notes</Label>
                <Textarea
                  id="medical_notes"
                  value={formData.medical_notes || ''}
                  onChange={(e) => handleChange('medical_notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional medical information..."
                />
                {errors.medical_notes && (
                  <p className="text-sm text-destructive">{errors.medical_notes[0]}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="font-normal">
                  Active
                </Label>
              </div>
              {errors.is_active && (
                <p className="text-sm text-destructive">{errors.is_active[0]}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/students/${id}`)}
                disabled={updateStudent.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStudent.isPending}>
                {updateStudent.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
