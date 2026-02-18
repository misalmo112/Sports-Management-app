/**
 * Student Create Page
 * Create a new student
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCreateStudent } from '../hooks/hooks';
import { useParents } from '../hooks/useParents';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import type { CreateStudentRequest, CreateParentData } from '../types';

export const StudentCreatePage = () => {
  const navigate = useNavigate();
  const [parentMode, setParentMode] = useState<'select' | 'create'>('select');
  const [parentFormData, setParentFormData] = useState<CreateParentData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [formData, setFormData] = useState<CreateStudentRequest>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'MALE',
    emirates_id: '',
    parent: undefined,
    enroll_class_id: undefined,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_notes: '',
    allergies: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [parentErrors, setParentErrors] = useState<Record<string, string>>({});

  const createStudent = useCreateStudent();
  const { data: parentsData } = useParents({ is_active: true, page_size: 100 });
  const { data: classesData } = useClasses({ is_active: true, page_size: 100 });

  const validateParentForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!parentFormData.first_name || parentFormData.first_name.trim().length === 0) {
      newErrors.first_name = 'First name is required';
    } else if (parentFormData.first_name.length > 100) {
      newErrors.first_name = 'First name must be 100 characters or less';
    }

    if (!parentFormData.last_name || parentFormData.last_name.trim().length === 0) {
      newErrors.last_name = 'Last name is required';
    } else if (parentFormData.last_name.length > 100) {
      newErrors.last_name = 'Last name must be 100 characters or less';
    }

    if (!parentFormData.email || parentFormData.email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parentFormData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setParentErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name || formData.first_name.trim().length === 0) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.length > 100) {
      newErrors.first_name = 'First name must be 100 characters or less';
    }

    if (!formData.last_name || formData.last_name.trim().length === 0) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.length > 100) {
      newErrors.last_name = 'Last name must be 100 characters or less';
    }

    if (!formData.date_of_birth || formData.date_of_birth.trim().length === 0) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      const date = new Date(formData.date_of_birth);
      if (isNaN(date.getTime())) {
        newErrors.date_of_birth = 'Please enter a valid date';
      }
    }

    // Validate parent form if creating new parent
    if (parentMode === 'create') {
      if (!validateParentForm()) {
        return false;
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof CreateStudentRequest, value: any) => {
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

  const handleParentChange = (field: keyof CreateParentData, value: any) => {
    setParentFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors for this field
    if (parentErrors[field]) {
      setParentErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // Clear backend errors for parent_data
    if (errors.parent_data) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.parent_data;
        return next;
      });
    }
  };

  const handleParentModeChange = (mode: 'select' | 'create') => {
    setParentMode(mode);
    // Clear parent-related errors when switching modes
    setParentErrors({});
    if (errors.parent_data) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.parent_data;
        return next;
      });
    }
    // Clear parent selection when switching to create mode
    if (mode === 'create') {
      setFormData((prev) => ({ ...prev, parent: undefined }));
    } else {
      setParentFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
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
      const submitData: CreateStudentRequest = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        date_of_birth: formData.date_of_birth || '',
        gender: formData.gender || 'MALE',
        is_active: formData.is_active ?? true,
      };
      if (formData.emirates_id?.trim()) {
        submitData.emirates_id = formData.emirates_id.trim();
      }
      if (formData.enroll_class_id) {
        submitData.enroll_class_id = formData.enroll_class_id;
      }
      
      // Handle parent selection or creation
      if (parentMode === 'create') {
        // Prepare parent_data
        const parentData: CreateParentData = {
          first_name: parentFormData.first_name.trim(),
          last_name: parentFormData.last_name.trim(),
          email: parentFormData.email.trim(),
        };
        if (parentFormData.phone?.trim()) {
          parentData.phone = parentFormData.phone.trim();
        }
        if (parentFormData.address_line1?.trim()) {
          parentData.address_line1 = parentFormData.address_line1.trim();
        }
        if (parentFormData.address_line2?.trim()) {
          parentData.address_line2 = parentFormData.address_line2.trim();
        }
        if (parentFormData.city?.trim()) {
          parentData.city = parentFormData.city.trim();
        }
        if (parentFormData.state?.trim()) {
          parentData.state = parentFormData.state.trim();
        }
        if (parentFormData.postal_code?.trim()) {
          parentData.postal_code = parentFormData.postal_code.trim();
        }
        if (parentFormData.country?.trim()) {
          parentData.country = parentFormData.country.trim();
        }
        submitData.parent_data = parentData;
      } else if (formData.parent) {
        submitData.parent = formData.parent;
      }
      
      if (formData.emergency_contact_name?.trim()) {
        submitData.emergency_contact_name = formData.emergency_contact_name.trim();
      }
      if (formData.emergency_contact_phone?.trim()) {
        submitData.emergency_contact_phone = formData.emergency_contact_phone.trim();
      }
      if (formData.emergency_contact_relationship?.trim()) {
        submitData.emergency_contact_relationship = formData.emergency_contact_relationship.trim();
      }
      if (formData.medical_notes?.trim()) {
        submitData.medical_notes = formData.medical_notes.trim();
      }
      if (formData.allergies?.trim()) {
        submitData.allergies = formData.allergies.trim();
      }

      const student = await createStudent.mutateAsync(submitData);
      navigate(`/dashboard/students/${student.id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
        // Surface nested parent_data validation as parent email error when possible
        const parentDataErrors = validationErrors.parent_data;
        if (Array.isArray(parentDataErrors) && parentDataErrors.length > 0) {
          setParentErrors((prev) => ({ ...prev, email: parentDataErrors[0] }));
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create student'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/students')}>
          â† Back to Students
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Student</CardTitle>
          <CardDescription>Register a new student in the academy</CardDescription>
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
                    value={formData.first_name}
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
                    value={formData.last_name}
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
                  <Label htmlFor="date_of_birth">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    required
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
                      handleChange('gender', value as CreateStudentRequest['gender'])
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
                  value={formData.emirates_id}
                  onChange={(e) => handleChange('emirates_id', e.target.value)}
                  placeholder="XXX-XXXX-XXXXXXXX"
                />
                {errors.emirates_id && (
                  <p className="text-sm text-destructive">{errors.emirates_id[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="enroll_class_id">Enroll in Class (Optional)</Label>
                <Select
                  value={formData.enroll_class_id?.toString() || '__none__'}
                  onValueChange={(value) =>
                    handleChange(
                      'enroll_class_id',
                      value === '__none__' ? undefined : parseInt(value)
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {classesData?.results.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.enroll_class_id && (
                  <p className="text-sm text-destructive">{errors.enroll_class_id[0]}</p>
                )}
              </div>

              <div className="space-y-4">
                <Label>Parent/Guardian</Label>
                
                {/* Parent Mode Selection */}
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="parent-select"
                      name="parent-mode"
                      checked={parentMode === 'select'}
                      onChange={() => handleParentModeChange('select')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="parent-select" className="font-normal cursor-pointer">
                      Select existing parent
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="parent-create"
                      name="parent-mode"
                      checked={parentMode === 'create'}
                      onChange={() => handleParentModeChange('create')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="parent-create" className="font-normal cursor-pointer">
                      Create new parent
                    </Label>
                  </div>
                </div>

                {/* Existing Parent Selection */}
                {parentMode === 'select' && (
                  <div className="space-y-2">
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
                )}

                {/* New Parent Creation Form */}
                {parentMode === 'create' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h4 className="text-sm font-semibold">Parent Information</h4>
                    
                    {/* Show error if parent email already exists */}
                    {parentErrors.email && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {parentErrors.email}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto ml-2 text-sm underline"
                            onClick={() => handleParentModeChange('select')}
                          >
                            Switch to select existing parent
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_first_name">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="parent_first_name"
                          value={parentFormData.first_name}
                          onChange={(e) => handleParentChange('first_name', e.target.value)}
                          required
                        />
                        {parentErrors.first_name && (
                          <p className="text-sm text-destructive">{parentErrors.first_name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parent_last_name">
                          Last Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="parent_last_name"
                          value={parentFormData.last_name}
                          onChange={(e) => handleParentChange('last_name', e.target.value)}
                          required
                        />
                        {parentErrors.last_name && (
                          <p className="text-sm text-destructive">{parentErrors.last_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_email">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="parent_email"
                          type="email"
                          value={parentFormData.email}
                          onChange={(e) => handleParentChange('email', e.target.value)}
                          required
                        />
                        {parentErrors.email && (
                          <p className="text-sm text-destructive">{parentErrors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parent_phone">Phone</Label>
                        <Input
                          id="parent_phone"
                          type="tel"
                          value={parentFormData.phone}
                          onChange={(e) => handleParentChange('phone', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Address Fields (Optional) */}
                    <details className="space-y-2">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        Address (Optional)
                      </summary>
                      <div className="mt-2 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="parent_address_line1">Address Line 1</Label>
                          <Input
                            id="parent_address_line1"
                            value={parentFormData.address_line1}
                            onChange={(e) => handleParentChange('address_line1', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parent_address_line2">Address Line 2</Label>
                          <Input
                            id="parent_address_line2"
                            value={parentFormData.address_line2}
                            onChange={(e) => handleParentChange('address_line2', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="parent_city">City</Label>
                            <Input
                              id="parent_city"
                              value={parentFormData.city}
                              onChange={(e) => handleParentChange('city', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="parent_state">State</Label>
                            <Input
                              id="parent_state"
                              value={parentFormData.state}
                              onChange={(e) => handleParentChange('state', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="parent_postal_code">Postal Code</Label>
                            <Input
                              id="parent_postal_code"
                              value={parentFormData.postal_code}
                              onChange={(e) => handleParentChange('postal_code', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parent_country">Country</Label>
                          <Input
                            id="parent_country"
                            value={parentFormData.country}
                            onChange={(e) => handleParentChange('country', e.target.value)}
                          />
                        </div>
                      </div>
                    </details>
                  </div>
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
                    value={formData.emergency_contact_name}
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
                    value={formData.emergency_contact_phone}
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
                    value={formData.emergency_contact_relationship}
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
                  value={formData.allergies}
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
                  value={formData.medical_notes}
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
                onClick={() => navigate('/dashboard/students')}
                disabled={createStudent.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? 'Creating...' : 'Create Student'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

