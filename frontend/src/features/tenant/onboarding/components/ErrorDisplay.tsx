/**
 * Component for displaying onboarding errors
 */
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';

interface ErrorDisplayProps {
  error?: Error | null;
  apiErrors?: Record<string, string[]>;
  title?: string;
}

export const ErrorDisplay = ({ error, apiErrors, title = 'Error' }: ErrorDisplayProps) => {
  if (!error && (!apiErrors || Object.keys(apiErrors).length === 0)) {
    return null;
  }

  const errorMessages: string[] = [];

  if (error) {
    errorMessages.push(error.message || 'An error occurred');
  }

  if (apiErrors) {
    Object.entries(apiErrors).forEach(([field, messages]) => {
      messages.forEach((msg) => {
        errorMessages.push(`${field}: ${msg}`);
      });
    });
  }

  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1">
          {errorMessages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
