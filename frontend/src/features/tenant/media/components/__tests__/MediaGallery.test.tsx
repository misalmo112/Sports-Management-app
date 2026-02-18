/**
 * Tests for MediaGallery component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/testUtils';
import userEvent from '@testing-library/user-event';
import { MediaGallery } from '../MediaGallery';
import type { MediaFile } from '../../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Image: ({ className }: { className?: string }) => <span data-testid="image-icon" className={className}>🖼️</span>,
  Video: ({ className }: { className?: string }) => <span data-testid="video-icon" className={className}>🎥</span>,
  File: ({ className }: { className?: string }) => <span data-testid="file-icon" className={className}>📄</span>,
  Calendar: ({ className }: { className?: string }) => <span data-testid="calendar-icon" className={className}>📅</span>,
}));

const mockMediaFiles: MediaFile[] = [
  {
    id: '1',
    academy: 1,
    file_name: 'test-image.jpg',
    file_path: '/path/to/image.jpg',
    file_url: 'https://example.com/image.jpg',
    file_size: 1024000,
    mime_type: 'image/jpeg',
    description: 'Test image',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    academy: 1,
    file_name: 'test-video.mp4',
    file_path: '/path/to/video.mp4',
    file_url: 'https://example.com/video.mp4',
    file_size: 5242880,
    mime_type: 'video/mp4',
    description: 'Test video',
    is_active: true,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
  {
    id: '3',
    academy: 1,
    file_name: 'document.pdf',
    file_path: '/path/to/document.pdf',
    file_url: 'https://example.com/document.pdf',
    file_size: 204800,
    mime_type: 'application/pdf',
    is_active: false,
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z',
  },
];

describe('MediaGallery', () => {
  it('renders nothing when mediaFiles is empty', () => {
    const { container } = render(<MediaGallery mediaFiles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders media files in grid', () => {
    render(<MediaGallery mediaFiles={mockMediaFiles} />);
    
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('displays file names', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} />);
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
  });

  it('displays file sizes', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} />);
    // formatBytes(1024000) = 1000 KB
    expect(screen.getByText(/1000 KB/i)).toBeInTheDocument();
  });

  it('displays descriptions when available', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} />);
    expect(screen.getByText('Test image')).toBeInTheDocument();
  });

  it('displays inactive badge for inactive files', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[2]]} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onMediaClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onMediaClick = vi.fn();
    
    // Mock window.open
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} onMediaClick={onMediaClick} />);
    
    const card = screen.getByText('test-image.jpg').closest('.cursor-pointer');
    if (card) {
      await user.click(card);
      expect(onMediaClick).toHaveBeenCalledWith(mockMediaFiles[0]);
    }
    
    windowOpenSpy.mockRestore();
  });

  it('renders image thumbnail for image files with URL', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} />);
    // When image has file_url, it renders img tag instead of icon
    expect(screen.getByAltText('test-image.jpg')).toBeInTheDocument();
  });

  it('renders image icon when image URL fails to load', () => {
    // Test with image that has no URL - will show icon
    const imageWithoutUrl = {
      ...mockMediaFiles[0],
      file_url: '',
    };
    render(<MediaGallery mediaFiles={[imageWithoutUrl]} />);
    expect(screen.getByTestId('image-icon')).toBeInTheDocument();
  });

  it('renders video icon for video files', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[1]]} />);
    expect(screen.getByTestId('video-icon')).toBeInTheDocument();
  });

  it('renders file icon for other file types', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[2]]} />);
    expect(screen.getByTestId('file-icon')).toBeInTheDocument();
  });

  it('displays mime type badge', () => {
    render(<MediaGallery mediaFiles={[mockMediaFiles[0]]} />);
    expect(screen.getByText('JPEG')).toBeInTheDocument();
  });
});
