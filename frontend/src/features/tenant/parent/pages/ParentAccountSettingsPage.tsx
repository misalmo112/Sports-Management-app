import { AccountSettingsPage } from '@/features/tenant/settings/pages/AccountSettingsPage';

export function ParentAccountSettingsPage() {
  return (
    <AccountSettingsPage
      pageTitle="Account & security"
      pageSubtitle="Update the email and password you use to sign in to the parent dashboard."
      profileCardTitle="Sign-in details"
      profileCardDescription="Your email is your sign-in identity. Keep your name accurate for academy records."
      passwordCardDescription="Choose a strong password. Other parents or staff are not affected."
    />
  );
}
