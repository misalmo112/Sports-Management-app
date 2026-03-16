import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils/testUtils';
import { BulkActionsPage } from '../BulkActionsPage';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return actual;
});

vi.mock('../../hooks/hooks', () => ({
  useBulkImportSchema: () => ({
    data: {
      dataset_type: 'students',
      label: 'Students',
      required_columns: ['first_name', 'last_name'],
      template_headers: ['first_name', 'last_name', 'date_of_birth'],
      columns: [
        {
          name: 'first_name',
          required: true,
          format: 'Text',
          description: 'Student first name.',
        },
        {
          name: 'date_of_birth',
          required: false,
          format: 'YYYY-MM-DD',
          description: 'Student date of birth.',
        },
      ],
      sample_row: {
        first_name: 'Sara',
        last_name: 'Ali',
        date_of_birth: '2014-05-20',
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  previewBulkImport: vi.fn(),
  commitBulkImport: vi.fn(),
}));

describe('BulkActionsPage', () => {
  it('renders schema-first bulk import guidance', () => {
    render(<BulkActionsPage />);

    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
    expect(screen.getByText('Students Upload Schema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download template/i })).toBeInTheDocument();
    expect(screen.getByText('first_name')).toBeInTheDocument();
    expect(screen.getByText('YYYY-MM-DD')).toBeInTheDocument();
    expect(screen.getByText('Example Row')).toBeInTheDocument();
  });
});
