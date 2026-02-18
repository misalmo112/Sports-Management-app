/**
 * Media Gallery Component
 * Displays media files in a grid layout
 */
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { formatBytes, isImage, isVideo } from '../utils';
import type { MediaFile } from '../types';
import { Image, Video, File, Calendar } from 'lucide-react';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onMediaClick?: (mediaFile: MediaFile) => void;
}

export const MediaGallery = ({ mediaFiles, onMediaClick }: MediaGalleryProps) => {
  const { formatDateTime } = useAcademyFormat();
  const getMediaIcon = (mimeType?: string) => {
    if (isImage(mimeType)) {
      return <Image className="h-8 w-8 text-muted-foreground" />;
    }
    if (isVideo(mimeType)) {
      return <Video className="h-8 w-8 text-muted-foreground" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  if (mediaFiles.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {mediaFiles.map((file) => (
        <Card
          key={file.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onMediaClick?.(file)}
        >
          <CardContent className="p-4">
            {/* Thumbnail or Icon */}
            <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              {isImage(file.mime_type) && file.file_url ? (
                <img
                  src={file.file_url}
                  alt={file.file_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '';
                      parent.appendChild(getMediaIcon(file.mime_type) as any);
                    }
                  }}
                />
              ) : (
                getMediaIcon(file.mime_type)
              )}
            </div>

            {/* File Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium truncate flex-1" title={file.file_name}>
                  {file.file_name}
                </h4>
                {!file.is_active && (
                  <Badge variant="secondary" className="shrink-0">
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDateTime(file.created_at)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatBytes(file.file_size)}</span>
                {file.mime_type && (
                  <Badge variant="outline" className="text-xs">
                    {file.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                )}
              </div>

              {file.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {file.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
