/**
 * LoadingState component
 * Displays a consistent loading spinner with optional message
 */
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface LoadingStateProps {
  /**
   * Optional message to display below the spinner
   */
  message?: string;
  /**
   * If true, renders as a full-page centered loading state
   * If false, renders as an inline loading state
   */
  fullPage?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export const LoadingState = ({
  message,
  fullPage = false,
  className,
  size = 'md',
}: LoadingStateProps) => {
  const containerClasses = fullPage
    ? 'flex min-h-[400px] items-center justify-center py-12'
    : 'flex items-center justify-center py-8';

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
};
