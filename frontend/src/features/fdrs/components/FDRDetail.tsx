import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays, isValid } from "date-fns";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { useToast } from "../../../hooks/use-toast-app";
import { useFDRs } from "../hooks/use-fdrs";
import type { FDR } from "../types/fdr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";

export function FDRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [fdr, setFDR] = useState<FDR | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { getFDRById, updateFDRStatus, deleteFDR } = useFDRs();

  // ✅ Fetch details with full error handling
  const fetchFDRDetails = async () => {
    if (!id) {
      showError("Invalid FDR ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getFDRById(id);
      if (!data) {
        throw new Error("No FDR found with this ID");
      }
      setFDR(data);
    } catch (error: any) {
      console.error("Error fetching FDR:", error);
      showError(error.message || "Failed to fetch FDR details");
      setFDR(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDRDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ Safe date formatting
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "Invalid Date";
      return format(date, "PPP");
    } catch {
      return "Invalid Date";
    }
  };

  // ✅ Safe currency formatting
  const formatCurrency = (value: number | undefined | null): string => {
    if (value == null || isNaN(value)) return "N/A";
    try {
      return `₹${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } catch {
      return "₹0.00";
    }
  };

  // ✅ Handle delete safely
  const handleDelete = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      await deleteFDR(id);
      showSuccess("FDR deleted successfully");
      navigate("/fdrs");
    } catch (error: any) {
      console.error("Error deleting FDR:", error);
      showError(error.message || "Failed to delete FDR");
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Handle status update safely
  const handleStatusUpdate = async (status: FDR["status"]) => {
    if (!id) return;
    try {
      setIsUpdatingStatus(true);
      await updateFDRStatus(id, status);
      await fetchFDRDetails();
      showSuccess(`FDR marked as ${status}`);
    } catch (error: any) {
      console.error("Error updating FDR status:", error);
      showError(error.message || "Failed to update FDR status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ✅ Render loading, empty, or valid data
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!fdr) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>FDR not found or failed to load details.</AlertDescription>
      </Alert>
    );
  }

  const daysUntilMaturity =
    fdr.maturityDate && isValid(new Date(fdr.maturityDate))
      ? differenceInDays(new Date(fdr.maturityDate), new Date())
      : null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/fdrs")}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to FDRs
          </Button>
        </div>

        <div className="flex space-x-4">
          {fdr.status === "RUNNING" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate("COMPLETED")}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate("RETURNED")}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Mark as Returned
              </Button>
            </>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this FDR? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Maturity Warning */}
      {daysUntilMaturity !== null &&
        daysUntilMaturity <= 30 &&
        daysUntilMaturity > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This FDR will mature in {daysUntilMaturity} days (
              {formatDate(fdr.maturityDate)})
            </AlertDescription>
          </Alert>
        )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Category">
            <Badge
              variant={fdr.category === "FD" ? "default" : "secondary"}
            >
              {fdr.category === "FD" ? "Fixed Deposit" : "Bank Guarantee"}
            </Badge>
          </Field>

          <Field label="Status">
            <Badge>{fdr.status}</Badge>
          </Field>

          <Field label="Bank Name">{fdr.bankName || "N/A"}</Field>
          <Field label="Account Number">{fdr.accountNo || "N/A"}</Field>
          <Field label="FDR/BG Number">{fdr.fdrNumber || "N/A"}</Field>
          <Field label="Account Name">{fdr.accountName || "N/A"}</Field>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Deposit Amount">
            {formatCurrency(fdr.depositAmount)}
          </Field>
          <Field label="Maturity Value">
            {formatCurrency(fdr.maturityValue)}
          </Field>
          <Field label="Date of Deposit">{formatDate(fdr.dateOfDeposit)}</Field>
          <Field label="Maturity Date">{formatDate(fdr.maturityDate)}</Field>
        </CardContent>
      </Card>

      {/* Contract/Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contract/Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Contract Number">{fdr.contractNo || "N/A"}</Field>
          <Field label="Point of Contact">{fdr.poc || "N/A"}</Field>
          <Field label="Location">{fdr.location || "N/A"}</Field>
          <Field label="Contract Details" span>
            {fdr.contractDetails || "N/A"}
          </Field>
        </CardContent>
      </Card>

      {/* Document */}
      {fdr.documentUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Document</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a
                href={fdr.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Document
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {Array.isArray(fdr.tags) && fdr.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {fdr.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** ✅ Reusable Field component for cleaner code */
function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-sm mt-1 break-words">{children}</div>
    </div>
  );
}

