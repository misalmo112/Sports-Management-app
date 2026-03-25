import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { API_ENDPOINTS } from '@/shared/constants/api';
import apiClient from '@/shared/services/api';
import { getClasses } from '@/features/tenant/classes/services/api';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const getFileId = (file) => `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FILE_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function MediaUploadPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [captureDate, setCaptureDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [classError, setClassError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', 'list', { is_active: true, page_size: 200 }],
    queryFn: () => getClasses({ is_active: true, page_size: 200 }),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const classOptions = useMemo(
    () =>
      (classesData?.results ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [classesData]
  );

  const isUploading = useMemo(
    () => files.some((item) => item.status === FILE_STATUS.UPLOADING),
    [files]
  );

  useEffect(() => {
    if (!isUploading) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading]);

  const addFiles = (fileList) => {
    if (!fileList?.length) return;
    const nextFiles = Array.from(fileList).map((file) => ({
      id: getFileId(file),
      file,
      progress: 0,
      status: FILE_STATUS.PENDING,
      message: '',
    }));
    setFiles((prev) => [...prev, ...nextFiles]);
  };

  const updateFile = (id, updates) => {
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeFile = (id) => {
    if (isUploading) return;
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFilePickerChange = (event) => {
    addFiles(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const uploadSingleFile = async (uploadItem) => {
    updateFile(uploadItem.id, {
      status: FILE_STATUS.UPLOADING,
      progress: 0,
      message: '',
    });

    const formData = new FormData();
    formData.append('class_id', selectedClassId);
    formData.append('capture_date', captureDate);
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    formData.append('file', uploadItem.file);

    try {
      await apiClient.post(API_ENDPOINTS.TENANT.MEDIA.UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          updateFile(uploadItem.id, { progress });
        },
      });

      updateFile(uploadItem.id, {
        status: FILE_STATUS.SUCCESS,
        progress: 100,
        message: 'Uploaded',
      });
      return true;
    } catch (error) {
      const fallbackMessage = 'Upload failed';
      const apiMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        fallbackMessage;

      updateFile(uploadItem.id, {
        status: FILE_STATUS.ERROR,
        message: String(apiMessage),
      });
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (!selectedClassId) {
      setClassError('Class is required.');
      return;
    }
    setClassError('');

    const pendingFiles = files.filter((item) => item.status === FILE_STATUS.PENDING);
    if (!pendingFiles.length) return;

    const results = await Promise.allSettled(pendingFiles.map((item) => uploadSingleFile(item)));
    const hasSuccess = results.some(
      (result) => result.status === 'fulfilled' && result.value === true
    );

    if (hasSuccess) {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    }
  };

  const pendingCount = files.filter((item) => item.status === FILE_STATUS.PENDING).length;
  const successCount = files.filter((item) => item.status === FILE_STATUS.SUCCESS).length;
  const errorCount = files.filter((item) => item.status === FILE_STATUS.ERROR).length;

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Media</h1>
          <p className="text-muted-foreground mt-2">
            Upload files to academy media, with class and capture date metadata.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/media">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Media
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media Upload Form</CardTitle>
          <CardDescription>
            Each file is uploaded separately. One file failing does not stop other uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="media-upload-class">
              Class <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              id="media-upload-class"
              value={selectedClassId}
              onValueChange={(value) => {
                setSelectedClassId(value);
                if (classError) setClassError('');
              }}
              options={classOptions}
              placeholder="Select a class"
              searchPlaceholder="Search classes..."
              emptyMessage="No classes found."
              isLoading={classesLoading}
              loadingMessage="Loading classes..."
              required
            />
            {classError ? <p className="text-sm text-destructive">{classError}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="capture-date">Capture Date</Label>
            <Input
              id="capture-date"
              type="date"
              value={captureDate}
              onChange={(event) => setCaptureDate(event.target.value)}
              disabled={isUploading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="upload-description">Description (optional)</Label>
            <Textarea
              id="upload-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a shared description for all selected files..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="media-file-input">Files</Label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
              }`}
              aria-label="File drop zone"
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="font-medium">Drag and drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to select files</p>
            </div>
            <Input
              id="media-file-input"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilePickerChange}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline">{files.length} selected</Badge>
            {successCount > 0 ? <Badge className="bg-green-600">{successCount} success</Badge> : null}
            {errorCount > 0 ? <Badge variant="destructive">{errorCount} failed</Badge> : null}
          </div>

          {files.length > 0 ? (
            <div className="space-y-3 rounded-md border p-3">
              {files.map((item) => (
                <div key={item.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    {item.status === FILE_STATUS.PENDING && !isUploading ? (
                      <Button variant="ghost" size="sm" onClick={() => removeFile(item.id)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  {(item.status === FILE_STATUS.UPLOADING || item.status === FILE_STATUS.SUCCESS) && (
                    <div className="space-y-1">
                      <Progress value={item.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{item.progress}%</p>
                    </div>
                  )}

                  {item.status === FILE_STATUS.UPLOADING && (
                    <Badge variant="outline">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  {item.status === FILE_STATUS.SUCCESS && (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {item.message}
                    </Badge>
                  )}
                  {item.status === FILE_STATUS.ERROR && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{item.message || 'Upload failed'}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={handleUploadAll} disabled={!files.length || !pendingCount || isUploading}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
