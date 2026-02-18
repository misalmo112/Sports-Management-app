/**
 * ErrorState component
 * Displays user-friendly error messages with retry functionality
 */
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { cn } from '@/shared/utils/cn';

interface ErrorStateProps {
  /**
   * The error to display (Error, AxiosError, or unknown)
   */
  error: Error | unknown;
  /**
   * Callback function to retry the operation
   */
  onRetry?: () => void;
  /**
   * Optional title for the error alert
   */
  title?: string;
  /**
   * If true, renders as a full-page centered error state
   * If false, renders as an inline error state
   */
  fullPage?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Custom retry button label
   */
  retryLabel?: string;
}

export const ErrorState = ({
  error,
  onRetry,
  title = 'Error',
  fullPage = false,
  className,
  retryLabel = 'Retry',
}: ErrorStateProps) => {
  const errorMessage = formatErrorMessage(error);

  const content = (
    <Alert variant="destructive" className={cn('w-full', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{errorMessage}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-12">
        <div className="w-full max-w-md">{content}</div>
      </div>
    );
  }

  return content;
};
