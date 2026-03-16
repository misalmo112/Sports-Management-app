import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, RefreshCw, Upload } from 'lucide-react';

import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useBulkImportSchema } from '../hooks/hooks';
import { commitBulkImport, previewBulkImport } from '../services/api';
import type {
  BulkImportCommitResponse,
  BulkImportDatasetType,
  BulkImportPreviewResponse,
  BulkImportSchema,
} from '../types';

type Notice = { type: 'success' | 'error'; message: string };

const DATASET_LABELS: Record<BulkImportDatasetType, string> = {
  students: 'Students',
  coaches: 'Coaches',
};

const emptyFiles: Record<BulkImportDatasetType, File | null> = {
  students: null,
  coaches: null,
};

const emptyPreviews: Record<BulkImportDatasetType, BulkImportPreviewResponse | null> = {
  students: null,
  coaches: null,
};

const emptyResults: Record<BulkImportDatasetType, BulkImportCommitResponse | null> = {
  students: null,
  coaches: null,
};

export const BulkActionsPage = () => {
  const [activeDataset, setActiveDataset] = useState<BulkImportDatasetType>('students');
  const [selectedFiles, setSelectedFiles] = useState(emptyFiles);
  const [previewByDataset, setPreviewByDataset] = useState(emptyPreviews);
  const [resultByDataset, setResultByDataset] = useState(emptyResults);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const fileInputRefs = useRef<Record<BulkImportDatasetType, HTMLInputElement | null>>({
    students: null,
    coaches: null,
  });

  const { data: schema, isLoading, error, refetch } = useBulkImportSchema(activeDataset);

  const currentPreview = previewByDataset[activeDataset];
  const currentResult = resultByDataset[activeDataset];
  const selectedFile = selectedFiles[activeDataset];

  const handleFileChange = (datasetType: BulkImportDatasetType, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [datasetType]: file }));
    setPreviewByDataset((prev) => ({ ...prev, [datasetType]: null }));
    setResultByDataset((prev) => ({ ...prev, [datasetType]: null }));
    setNotice(null);
  };

  const handleDownloadTemplate = (datasetSchema: BulkImportSchema) => {
    const headers = datasetSchema.template_headers;
    const row = headers.map((header) => csvCell(datasetSchema.sample_row[header] ?? '')).join(',');
    const csv = `${headers.join(',')}\n${row}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${datasetSchema.dataset_type}-import-template.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      setNotice({ type: 'error', message: `Choose a ${DATASET_LABELS[activeDataset].toLowerCase()} CSV before previewing.` });
      return;
    }

    setPreviewPending(true);
    setNotice(null);
    try {
      const response = await previewBulkImport(activeDataset, selectedFile);
      setPreviewByDataset((prev) => ({ ...prev, [activeDataset]: response }));
      setResultByDataset((prev) => ({ ...prev, [activeDataset]: null }));
      setNotice({
        type: response.invalid_rows > 0 ? 'error' : 'success',
        message:
          response.invalid_rows > 0
            ? `${response.valid_rows} valid row(s), ${response.invalid_rows} invalid row(s). Review the issues before importing.`
            : `${response.valid_rows} row(s) validated and ready to import.`,
      });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setPreviewPending(false);
    }
  };

  const handleCommit = async () => {
    if (!currentPreview?.preview_token) {
      setNotice({ type: 'error', message: 'Preview the CSV first.' });
      return;
    }

    setCommitPending(true);
    setNotice(null);
    try {
      const response = await commitBulkImport(activeDataset, currentPreview.preview_token);
      setResultByDataset((prev) => ({ ...prev, [activeDataset]: response }));
      setNotice({
        type: response.failed_count > 0 ? 'error' : 'success',
        message:
          response.failed_count > 0
            ? `${response.created_count} row(s) imported and ${response.failed_count} row(s) failed during commit.`
            : `${response.created_count} row(s) imported successfully.`,
      });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setCommitPending(false);
    }
  };

  const clearCurrentDataset = () => {
    if (fileInputRefs.current[activeDataset]) {
      fileInputRefs.current[activeDataset]!.value = '';
    }
    handleFileChange(activeDataset, null);
  };

  const renderSchemaContent = (datasetSchema: BulkImportSchema) => (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{datasetSchema.label} Upload Schema</CardTitle>
            <CardDescription>
              Review the exact column contract before uploading. Download the template to avoid header drift.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => handleDownloadTemplate(datasetSchema)}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Step 1</p>
                <p className="font-medium">Download the template</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Step 2</p>
                <p className="font-medium">Fill one row per record</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Step 3</p>
                <p className="font-medium">Preview validation</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Step 4</p>
                <p className="font-medium">Confirm import</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasetSchema.columns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-medium">{column.name}</TableCell>
                    <TableCell>
                      <Badge variant={column.required ? 'default' : 'secondary'}>
                        {column.required ? 'Required' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell>{column.format}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{column.description}</p>
                        {column.allowed_values?.length ? (
                          <p className="text-sm text-muted-foreground">
                            Allowed values: {column.allowed_values.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Example Row</CardTitle>
              <CardDescription>Use this as a formatting reference when filling the CSV.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <pre className="text-sm whitespace-pre-wrap break-all">
                {JSON.stringify(datasetSchema.sample_row, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload And Preview</CardTitle>
          <CardDescription>
            The import will not run until the file validates and you confirm the preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              ref={(node) => {
                fileInputRefs.current[activeDataset] = node;
              }}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => handleFileChange(activeDataset, event.target.files?.[0] ?? null)}
              className="max-w-xl"
            />
            <Button onClick={handlePreview} disabled={previewPending || commitPending}>
              <Upload className="mr-2 h-4 w-4" />
              {previewPending ? 'Previewing...' : 'Preview CSV'}
            </Button>
            <Button variant="outline" onClick={clearCurrentDataset} disabled={previewPending || commitPending}>
              Reset
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Selected file: {selectedFile?.name || 'None'}
          </p>

          {currentPreview ? (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">Preview Summary</CardTitle>
                <CardDescription>
                  {currentPreview.total_rows} row(s) detected, {currentPreview.valid_rows} valid, {currentPreview.invalid_rows} invalid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPreview.unknown_columns.length > 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Unknown columns were ignored: {currentPreview.unknown_columns.join(', ')}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPreview.row_results.map((row) => (
                        <TableRow key={row.row_number}>
                          <TableCell className="font-medium">{row.row_number}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'valid' ? 'default' : 'destructive'}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.errors.length === 0 && row.warnings.length === 0 ? (
                              'Ready to import'
                            ) : (
                              <div className="space-y-1">
                                {row.errors.map((errorMessage) => (
                                  <p key={errorMessage} className="text-sm text-destructive">
                                    {errorMessage}
                                  </p>
                                ))}
                                {row.warnings.map((warningMessage) => (
                                  <p key={warningMessage} className="text-sm text-muted-foreground">
                                    {warningMessage}
                                  </p>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button
                    onClick={handleCommit}
                    disabled={commitPending || previewPending || currentPreview.valid_rows === 0}
                  >
                    {commitPending ? 'Importing...' : `Import ${currentPreview.valid_rows} Valid Row(s)`}
                  </Button>
                  <Button variant="outline" onClick={handlePreview} disabled={previewPending || commitPending}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-run Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Result</CardTitle>
                <CardDescription>
                  {currentResult.created_count} created, {currentResult.skipped_count} skipped, {currentResult.failed_count} failed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentResult.row_results.map((row) => (
                        <TableRow key={`${row.row_number}-${row.status}`}>
                          <TableCell className="font-medium">{row.row_number}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'created' ? 'default' : 'destructive'}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.record_id ? `#${row.record_id}` : '—'}</TableCell>
                          <TableCell>
                            {row.errors.length > 0 ? row.errors.join(' | ') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Actions</h1>
          <p className="mt-2 text-muted-foreground">
            Import academy data in bulk with a schema-first CSV workflow.
          </p>
        </div>
      </div>

      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeDataset} onValueChange={(value) => setActiveDataset(value as BulkImportDatasetType)}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
        </TabsList>
        <TabsContent value={activeDataset} className="space-y-6">
          {isLoading ? (
            <LoadingState message={`Loading ${DATASET_LABELS[activeDataset].toLowerCase()} import schema...`} />
          ) : error ? (
            <ErrorState
              error={error}
              onRetry={() => refetch()}
              title={`Failed to load ${DATASET_LABELS[activeDataset].toLowerCase()} import schema`}
            />
          ) : schema ? (
            renderSchemaContent(schema)
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function csvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
