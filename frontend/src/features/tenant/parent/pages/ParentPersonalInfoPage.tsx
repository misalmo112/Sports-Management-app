import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useCurrentAccount, useUpdateCurrentAccount } from '@/features/tenant/settings/hooks/hooks';
import type { UpdateCurrentAccountRequest } from '@/features/tenant/settings/types';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import type { Student } from '@/features/tenant/students/types';
import { clearFieldError, extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';
import { usePatchPortalStudent, usePortalStudent } from '../hooks/hooks';
import type { PortalStudentPatchPayload } from '../types';

type ContactFormState = Pick<
  UpdateCurrentAccountRequest,
  'parent_profile' | 'parent_record'
> & {
  parent_profile: NonNullable<UpdateCurrentAccountRequest['parent_profile']>;
  parent_record: NonNullable<UpdateCurrentAccountRequest['parent_record']>;
};

const emptyContactForm: ContactFormState = {
  parent_profile: { phone: '' },
  parent_record: {
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  },
};

export function ParentPersonalInfoPage() {
  const { data: account, isLoading, error, refetch } = useCurrentAccount();
  const updateAccount = useUpdateCurrentAccount();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ is_active: true });

  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const [contactErrors, setContactErrors] = useState<Record<string, string[]>>({});
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    setContactForm({
      parent_profile: {
        phone: account.parent_profile?.phone ?? '',
      },
      parent_record: {
        phone: account.parent_record?.phone ?? '',
        address_line1: account.parent_record?.address_line1 ?? '',
        address_line2: account.parent_record?.address_line2 ?? '',
        city: account.parent_record?.city ?? '',
        state: account.parent_record?.state ?? '',
        postal_code: account.parent_record?.postal_code ?? '',
        country: account.parent_record?.country ?? '',
      },
    });
  }, [account]);

  const submitContact = async (event: FormEvent) => {
    event.preventDefault();
    setContactErrors({});
    setContactSuccess(null);
    try {
      await updateAccount.mutateAsync({
        parent_profile: { phone: contactForm.parent_profile.phone },
        parent_record: { ...contactForm.parent_record },
      });
      setContactSuccess('Your contact details were saved.');
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) {
        setContactErrors(validationErrors);
      } else {
        setContactErrors({
          non_field_errors: [formatErrorMessage(err)],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading your information…" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Failed to load')}
          onRetry={() => refetch()}
          title="Could not load personal information"
        />
      </div>
    );
  }

  const students = studentsData?.results ?? [];

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Personal information"
        subtitle="Update your contact details and each child’s emergency and medical information."
      >
        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Your contact details</CardTitle>
              <CardDescription>
                Profile phone is stored on your login profile; address and primary phone are kept on your
                guardian record at the academy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitContact} className="space-y-5">
                {contactSuccess ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{contactSuccess}</AlertDescription>
                  </Alert>
                ) : null}
                {contactErrors.non_field_errors ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {contactErrors.non_field_errors.map((m) => (
                        <div key={m}>{m}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-phone">Profile phone</Label>
                    <Input
                      id="profile-phone"
                      value={contactForm.parent_profile.phone ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_profile: { ...prev.parent_profile, phone: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="record-phone">Guardian phone</Label>
                    <Input
                      id="record-phone"
                      value={contactForm.parent_record.phone ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_record: { ...prev.parent_record, phone: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="addr1">Address line 1</Label>
                  <Input
                    id="addr1"
                    value={contactForm.parent_record.address_line1 ?? ''}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        parent_record: { ...prev.parent_record, address_line1: e.target.value },
                      }))
                    }
                    disabled={updateAccount.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addr2">Address line 2</Label>
                  <Input
                    id="addr2"
                    value={contactForm.parent_record.address_line2 ?? ''}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        parent_record: { ...prev.parent_record, address_line2: e.target.value },
                      }))
                    }
                    disabled={updateAccount.isPending}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={contactForm.parent_record.city ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_record: { ...prev.parent_record, city: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State / region</Label>
                    <Input
                      id="state"
                      value={contactForm.parent_record.state ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_record: { ...prev.parent_record, state: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="postal">Postal code</Label>
                    <Input
                      id="postal"
                      value={contactForm.parent_record.postal_code ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_record: { ...prev.parent_record, postal_code: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={contactForm.parent_record.country ?? ''}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          parent_record: { ...prev.parent_record, country: e.target.value },
                        }))
                      }
                      disabled={updateAccount.isPending}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateAccount.isPending}>
                    {updateAccount.isPending ? 'Saving…' : 'Save contact details'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Children — safety & medical</h2>
              <p className="text-sm text-muted-foreground">
                You can update emergency contacts and medical notes your academy uses during activities.
              </p>
            </div>
            {studentsLoading ? <LoadingState message="Loading children…" /> : null}
            {!studentsLoading && students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active children linked to your account.</p>
            ) : null}
            {!studentsLoading
              ? students.map((s: Student) => (
                  <ChildSafetyEditor key={s.id} student={s} />
                ))
              : null}
          </section>
        </div>
      </PageShell>
    </div>
  );
}

function ChildSafetyEditor({ student }: { student: Student }) {
  const displayName =
    [student.first_name, student.last_name].filter(Boolean).join(' ') || `Student #${student.id}`;
  const { data, isLoading, error, refetch } = usePortalStudent(student.id);
  const patch = usePatchPortalStudent(student.id);
  const [form, setForm] = useState<PortalStudentPatchPayload>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_notes: '',
    allergies: '',
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      emergency_contact_name: data.emergency_contact_name ?? '',
      emergency_contact_phone: data.emergency_contact_phone ?? '',
      emergency_contact_relationship: data.emergency_contact_relationship ?? '',
      medical_notes: data.medical_notes ?? '',
      allergies: data.allergies ?? '',
    });
  }, [data]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalErrors({});
    setSavedMsg(null);
    try {
      await patch.mutateAsync(form);
      setSavedMsg('Saved.');
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) {
        setLocalErrors(validationErrors);
      } else {
        setLocalErrors({ non_field_errors: [formatErrorMessage(err)] });
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Loading…" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState error={error || new Error('Load failed')} onRetry={() => refetch()} title="" />
        </CardContent>
      </Card>
    );
  }

  const setField = (field: keyof PortalStudentPatchPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (localErrors[field as string]) {
      setLocalErrors((prev) => clearFieldError(prev, field as string));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{displayName}</CardTitle>
        <CardDescription>Emergency contacts and medical information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {savedMsg ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{savedMsg}</AlertDescription>
            </Alert>
          ) : null}
          {localErrors.non_field_errors ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {localErrors.non_field_errors.map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Emergency contact name</Label>
              <Input
                value={form.emergency_contact_name}
                onChange={(e) => setField('emergency_contact_name', e.target.value)}
                disabled={patch.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label>Emergency contact phone</Label>
              <Input
                value={form.emergency_contact_phone}
                onChange={(e) => setField('emergency_contact_phone', e.target.value)}
                disabled={patch.isPending}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Relationship to child</Label>
            <Input
              value={form.emergency_contact_relationship}
              onChange={(e) => setField('emergency_contact_relationship', e.target.value)}
              disabled={patch.isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label>Medical notes</Label>
            <Textarea
              value={form.medical_notes}
              onChange={(e) => setField('medical_notes', e.target.value)}
              disabled={patch.isPending}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Allergies</Label>
            <Textarea
              value={form.allergies}
              onChange={(e) => setField('allergies', e.target.value)}
              disabled={patch.isPending}
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={patch.isPending}>
              {patch.isPending ? 'Saving…' : 'Save for this child'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
