import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Card, CardContent } from "../../../components/ui/card";
import { useFDRs } from "../hooks/use-fdrs";
import type { BulkImportFDRResult } from "../types/fdr";

interface BulkImportFDRProps {
  onSuccess?: () => void;
}

export function BulkImportFDR({ onSuccess }: BulkImportFDRProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportFDRResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { bulkImportFDRs } = useFDRs();

  // ✅ Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload an Excel (.xlsx or .xls) file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File too large. Please upload a file smaller than 5MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  // ✅ Handle upload logic
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a valid Excel file before uploading.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const importResult = await bulkImportFDRs(file);

      if (!importResult) {
        throw new Error("Invalid server response. Please try again.");
      }

      setResult(importResult);
    } catch (err: any) {
      console.error("Bulk import error:", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to import FDRs. Please try again later.";
      setError(message);
      setResult(null);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Reset upload state
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          Upload an Excel file (.xlsx or .xls) with the following columns:
          <br />
          <span className="text-xs mt-2 block">
            Category, Bank, Account No., FD/BG No., Account Name, Deposit Amount,
            Date of Deposit, Maturity Value, Contract No., Contract Details, POC,
            Location, EMD, SD, Status
          </span>
        </AlertDescription>
      </Alert>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Try Again
          </Button>
        </div>
      )}

      {/* File Upload Section */}
      {!result && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="whitespace-nowrap"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>

              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: <strong>{file.name}</strong> (
                  {(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <SummaryCard
              title="Total Rows"
              value={result.totalRows}
              color="text-gray-800"
            />
            <SummaryCard
              title="Successful"
              value={result.successCount}
              color="text-green-600"
              icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            />
            <SummaryCard
              title="Failed"
              value={result.failureCount}
              color="text-red-600"
              icon={<XCircle className="h-5 w-5 text-red-500" />}
            />
            <SummaryCard
              title="Skipped"
              value={result.skippedCount}
              color="text-yellow-600"
              icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
            />
          </div>

          {/* Success Details */}
          {result.createdFdrs?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Successfully Imported FDRs
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">FDR Number</th>
                        <th className="text-left p-2">Bank</th>
                        <th className="text-left p-2">Location</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.createdFdrs.map((fdr, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{fdr.fdrNumber || "-"}</td>
                          <td className="p-2">{fdr.bankName}</td>
                          <td className="p-2">{fdr.location || "-"}</td>
                          <td className="p-2 text-right">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(fdr.depositAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Details */}
          {result.errors?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  Import Errors
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Row</th>
                        <th className="text-left p-2">FDR Number</th>
                        <th className="text-left p-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{err.row}</td>
                          <td className="p-2">{err.fdrNumber || "-"}</td>
                          <td className="p-2 text-red-600">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              Upload Another File
            </Button>
            {result.successCount > 0 && onSuccess && (
              <Button onClick={onSuccess}>View Imported FDRs</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ✅ Small helper component for summary cards
 */
function SummaryCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          {icon && <div className="flex items-center justify-center mb-2">{icon}</div>}
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
