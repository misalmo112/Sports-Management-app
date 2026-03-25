import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/utils/testUtils';
import MediaGalleryPage from '../MediaGalleryPage';
import apiClient from '@/shared/services/api';
import { getClasses } from '@/features/tenant/classes/services/api';

vi.mock('lucide-react', async (importOriginal) => importOriginal());

vi.mock('@/shared/services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/features/tenant/classes/services/api', () => ({
  getClasses: vi.fn(),
}));

const baseListResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'm1',
      file_name: 'image-one.jpg',
      file_url: 'https://cdn.test/image-one.jpg',
      file_size: 2048,
      mime_type: 'image/jpeg',
      capture_date: '2026-03-10',
      class_detail: { id: 1, name: 'Class A' },
      is_active: true,
    },
    {
      id: 'm2',
      file_name: 'video-one.mp4',
      file_url: 'https://cdn.test/video-one.mp4',
      file_size: 4096,
      mime_type: 'video/mp4',
      capture_date: '2026-03-20',
      class_detail: { id: 2, name: 'Class B' },
      is_active: true,
    },
  ],
};

describe('MediaGalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClasses.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, name: 'Class A' },
        { id: 2, name: 'Class B' },
      ],
    });
    apiClient.get.mockResolvedValue({ data: baseListResponse });
    apiClient.patch.mockResolvedValue({ data: {} });
    apiClient.post.mockResolvedValue({ data: {} });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('filters by file type and date range', async () => {
    const user = userEvent.setup();
    render(<MediaGalleryPage />);

    expect(await screen.findByText('image-one.jpg')).toBeInTheDocument();
    expect(screen.getByText('video-one.mp4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Images' }));
    expect(screen.getByText('image-one.jpg')).toBeInTheDocument();
    expect(screen.queryByText('video-one.mp4')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.type(screen.getByLabelText('Date from'), '2026-03-15');
    expect(screen.queryByText('image-one.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('video-one.mp4')).toBeInTheDocument();
  });

  it('deactivates a single media item and removes card', async () => {
    const user = userEvent.setup();
    render(<MediaGalleryPage />);

    expect(await screen.findByText('image-one.jpg')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/tenant/media/m1/', { is_active: false });
    });
    expect(screen.queryByText('image-one.jpg')).not.toBeInTheDocument();
  });

  it('bulk deactivates selected items and falls back to patch when bulk endpoint is missing', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValueOnce({ response: { status: 404 } });

    render(<MediaGalleryPage />);
    expect(await screen.findByText('image-one.jpg')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Select image-one.jpg'));
    await user.click(screen.getByLabelText('Select video-one.mp4'));
    await user.click(screen.getByRole('button', { name: /deactivate selected/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/tenant/media/bulk-deactivate/', {
        ids: ['m1', 'm2'],
      });
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/tenant/media/m1/', { is_active: false });
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/tenant/media/m2/', { is_active: false });
    });

    expect(screen.queryByText('image-one.jpg')).not.toBeInTheDocument();
    expect(screen.queryByText('video-one.mp4')).not.toBeInTheDocument();
  });
});
