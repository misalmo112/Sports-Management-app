/**
 * Searchable select dropdown for long lists (timezones, currencies, countries).
 * Renders a trigger and a dropdown with a search input and filtered options.
 */
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils/cn';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** Placeholder for the search input inside the dropdown */
  searchPlaceholder?: string;
  /** Empty message when no options match search */
  emptyMessage?: string;
  /** Loading state – shows loading message instead of options */
  isLoading?: boolean;
  loadingMessage?: string;
  className?: string;
  /** Optional empty option (e.g. "Select country" with value __none__) */
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  id,
  disabled = false,
  required = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  isLoading = false,
  loadingMessage = 'Loading...',
  className,
  allowEmpty = false,
  emptyOptionLabel = 'Select...',
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const displayValue = React.useMemo(() => {
    if (allowEmpty && (value === '__none__' || value === '')) return null;
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : value || null;
  }, [options, value, allowEmpty]);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Focus search when opening
  React.useEffect(() => {
    if (open) {
      setSearch('');
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const selectValue = (v: string) => {
    onValueChange(v);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' && filteredOptions.length === 1) {
      e.preventDefault();
      selectValue(filteredOptions[0].value);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&>span]:line-clamp-1'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
      >
        <span className={displayValue ? '' : 'text-muted-foreground'}>
          {displayValue ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[16rem] rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="border-b p-1">
            <Input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="h-8 border-0 focus-visible:ring-1"
            />
          </div>
          <div
            ref={listRef}
            className="max-h-60 overflow-auto p-1"
          >
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {loadingMessage}
              </div>
            ) : (
              <>
                {allowEmpty && (
                  <button
                    type="button"
                    onClick={() => selectValue('__none__')}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none',
                      (value === '__none__' || value === '')
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {emptyOptionLabel}
                  </button>
                )}
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={value === opt.value}
                      onClick={() => selectValue(opt.value)}
                      className={cn(
                        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none',
                        value === opt.value
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
