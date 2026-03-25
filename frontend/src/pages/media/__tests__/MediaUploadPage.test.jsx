import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/utils/testUtils';
import MediaUploadPage from '../MediaUploadPage';
import apiClient from '@/shared/services/api';
import { getClasses } from '@/features/tenant/classes/services/api';

vi.mock('lucide-react', async (importOriginal) => importOriginal());

vi.mock('@/shared/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/features/tenant/classes/services/api', () => ({
  getClasses: vi.fn(),
}));

describe('MediaUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClasses.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 10, name: 'Class A' }],
    });
  });

  it('handles per-file success and error independently', async () => {
    const user = userEvent.setup();
    apiClient.post.mockImplementation((_url, formData, config) => {
      const file = formData.get('file');
      config?.onUploadProgress?.({ loaded: 50, total: 100 });
      config?.onUploadProgress?.({ loaded: 100, total: 100 });

      if (file?.name === 'fail.jpg') {
        return Promise.reject(new Error('server failed'));
      }
      return Promise.resolve({ data: { id: 'ok-1' } });
    });

    render(<MediaUploadPage />);

    await user.click(screen.getByRole('button', { name: /class/i }));
    await user.click(screen.getByRole('option', { name: 'Class A' }));

    const fileInput = screen.getByLabelText('Files', { selector: 'input' });
    await user.upload(fileInput, [
      new File(['ok-data'], 'ok.jpg', { type: 'image/jpeg' }),
      new File(['fail-data'], 'fail.jpg', { type: 'image/jpeg' }),
    ]);

    await user.click(screen.getByRole('button', { name: /upload 2 files/i }));

    await waitFor(() => {
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
      expect(screen.getByText(/server failed/i)).toBeInTheDocument();
    });

    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('registers beforeunload during upload and removes it after completion', async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    let resolveUpload;
    apiClient.post.mockImplementation((_url, _formData, config) => {
      config?.onUploadProgress?.({ loaded: 25, total: 100 });
      return new Promise((resolve) => {
        resolveUpload = resolve;
      });
    });

    render(<MediaUploadPage />);

    await user.click(screen.getByRole('button', { name: /class/i }));
    await user.click(screen.getByRole('option', { name: 'Class A' }));

    const fileInput = screen.getByLabelText('Files', { selector: 'input' });
    await user.upload(fileInput, new File(['data'], 'pending.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: /upload 1 file/i }));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    const beforeUnloadHandler = addSpy.mock.calls.find(
      ([eventName]) => eventName === 'beforeunload'
    )?.[1];
    const event = { preventDefault: vi.fn(), returnValue: undefined };
    beforeUnloadHandler(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe('');

    resolveUpload({ data: { id: 'done-1' } });

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('beforeunload', beforeUnloadHandler);
    });
  });
});
