/**
 * EmptyState component
 * Displays contextual empty state messages with optional action
 */
import { Button } from '@/shared/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  /**
   * Title of the empty state
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Optional icon to display
   */
  icon?: LucideIcon;
  /**
   * Label for the action button
   */
  actionLabel?: string;
  /**
   * Callback when action button is clicked
   */
  onAction?: () => void;
  /**
   * If true, renders as a full-page centered empty state
   * If false, renders as an inline empty state
   */
  fullPage?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  fullPage = false,
  className,
}: EmptyStateProps) => {
  const containerClasses = fullPage
    ? 'flex min-h-[400px] items-center justify-center py-12'
    : 'flex items-center justify-center py-12';

  const content = (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <Icon className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (fullPage) {
    return <div className={cn(containerClasses)}>{content}</div>;
  }

  return <div className={cn(containerClasses)}>{content}</div>;
};
