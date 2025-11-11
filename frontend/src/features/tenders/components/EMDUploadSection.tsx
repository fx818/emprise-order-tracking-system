import { useState } from 'react';
import { Upload, FileText, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { extractFDRData } from '../../emds/components/fdr-extracter';

interface EMDUploadSectionProps {
  onDataExtracted: (data: {
    amount: number | null;
    submissionDate: string | null;
    maturityDate: string | null;
    bankName: string;
  }) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
  existingDocumentUrl?: string;
}

export function EMDUploadSection({ onDataExtracted, onFileChange, disabled, existingDocumentUrl }: EMDUploadSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload an image file (JPEG, PNG, GIF) or PDF');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    onFileChange?.(selectedFile); // Notify parent component
    setError(null);
    setExtracted(false);
  };

  const handleExtractData = async () => {
    if (!file) return;

    setExtracting(true);
    setError(null);

    try {
      const extractedData = await extractFDRData(file);

      if (!extractedData.amount && !extractedData.maturityDate && !extractedData.submissionDate) {
        setError('Could not extract data from the document. Please enter details manually.');
      } else {
        onDataExtracted(extractedData);
        setExtracted(true);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError('Failed to extract data. Please try again or enter details manually.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emd-document">Upload EMD/FDR Document (Optional)</Label>
          {existingDocumentUrl && !file && (
            <div className="mb-2 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Existing EMD Document</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(existingDocumentUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="emd-document"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={disabled || extracting}
              className="flex-1"
            />
            {file && !extracted && (
              <Button
                type="button"
                onClick={handleExtractData}
                disabled={extracting || disabled}
                variant="secondary"
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extract Data
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {existingDocumentUrl ? 'Upload a new file to replace the existing EMD document. AI will extract the amount, dates, and bank name automatically.' : 'Upload an FDR/EMD document image or PDF. AI will extract the amount, dates, and bank name automatically.'}
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">{file.name}</span>
            {extracted && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-xs">Extracted</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {extracted && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Data extracted successfully! Review the auto-filled fields below.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
