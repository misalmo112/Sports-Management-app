/**
 * Coach Media Upload Modal Component
 * Handles multi-file upload with class selection requirement
 */
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useUploadMedia } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { formatBytes, isQuotaError, extractQuotaError, formatQuotaErrorMessage } from '../utils';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface CoachMediaUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CoachMediaUploadModal = ({
  open,
  onOpenChange,
  onSuccess,
}: CoachMediaUploadModalProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  
  // Fetch classes (already filtered by coach on backend)
  const { data: classesData, isLoading: classesLoading } = useClasses({ is_active: true });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setGlobalError(null);

    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (
    id: string,
    updates: Partial<Omit<UploadFile, 'file' | 'id'>>
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    if (!selectedClassId) {
      throw new Error('Please select a class');
    }

    updateFileStatus(uploadFile.id, { status: 'uploading', progress: 0 });

    try {
      const result = await uploadMedia.mutateAsync({
        file: uploadFile.file,
        class_id: parseInt(selectedClassId),
        description: description || undefined,
        onProgress: (progress) => {
          updateFileStatus(uploadFile.id, { progress });
        },
      });

      updateFileStatus(uploadFile.id, {
        status: 'success',
        progress: 100,
      });

      return result;
    } catch (error: unknown) {
      let errorMessage = formatErrorMessage(error);

      // Check for quota errors
      if (isQuotaError(error)) {
        const quotaError = extractQuotaError(error);
        if (quotaError) {
          errorMessage = formatQuotaErrorMessage(quotaError);
          setGlobalError(errorMessage);
        }
      }

      updateFileStatus(uploadFile.id, {
        status: 'error',
        error: errorMessage,
      });

      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    if (!selectedClassId) {
      setGlobalError('Please select a class');
      return;
    }

    setGlobalError(null);
    const pendingFiles = files.filter((f) => f.status === 'pending');

    // Upload files sequentially to avoid overwhelming the server
    for (const file of pendingFiles) {
      try {
        await uploadFile(file);
      } catch (error) {
        // If quota error, stop uploading remaining files
        if (isQuotaError(error)) {
          // Mark remaining files as cancelled
          pendingFiles
            .filter((f) => f.id !== file.id && f.status === 'pending')
            .forEach((f) => {
              updateFileStatus(f.id, {
                status: 'error',
                error: 'Upload cancelled due to quota limit',
              });
            });
          break;
        }
      }
    }

    // Check if all files are done (success or error)
    const allDone = files.every(
      (f) => f.status === 'success' || f.status === 'error'
    );

    if (allDone) {
      const hasSuccess = files.some((f) => f.status === 'success');
      if (hasSuccess) {
        // Wait a bit for the mutation to complete, then close
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1000);
      }
    }
  };

  const handleClose = () => {
    if (uploadMedia.isPending) return; // Don't close during upload

    setFiles([]);
    setSelectedClassId('');
    setDescription('');
    setGlobalError(null);
    onOpenChange(false);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const canUpload = files.length > 0 && pendingCount > 0 && !uploadMedia.isPending && selectedClassId;
  const isUploading = uploadingCount > 0 || uploadMedia.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Select one or more files to upload for a class. You can add a description that
            will apply to all files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Class Selection */}
          <div className="grid gap-2">
            <Label htmlFor="class-select">
              Class <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={isUploading || classesLoading}
            >
              <SelectTrigger id="class-select">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classesData?.results.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id.toString()}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the class this media is associated with
            </p>
          </div>

          {/* File Input */}
          <div className="grid gap-2">
            <Label htmlFor="file-input">Files</Label>
            <Input
              id="file-input"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Select multiple files to upload at once
            </p>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for these files..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Global Error */}
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {successCount > 0 && (
                    <span className="text-green-600">
                      {successCount} success
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-destructive">{errorCount} errors</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-start gap-3 p-2 rounded border bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        {uploadFile.status !== 'uploading' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => removeFile(uploadFile.id)}
                            disabled={isUploading}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(uploadFile.file.size)}
                      </p>

                      {/* Progress */}
                      {uploadFile.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={uploadFile.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadFile.progress}%
                          </p>
                        </div>
                      )}

                      {/* Status Icons */}
                      {uploadFile.status === 'success' && (
                        <div className="flex items-center gap-1 mt-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">Uploaded</span>
                        </div>
                      )}

                      {uploadFile.status === 'error' && uploadFile.error && (
                        <Alert variant="destructive" className="mt-2 py-2">
                          <AlertCircle className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            {uploadFile.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload || isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading
              ? `Uploading... (${uploadingCount})`
              : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
