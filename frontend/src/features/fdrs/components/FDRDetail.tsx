import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";

export function FDRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [fdr, setFDR] = useState<FDR | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { getFDRById, updateFDRStatus, deleteFDR } = useFDRs();

  const fetchFDRDetails = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const data = await getFDRById(id);
      setFDR(data);
    } catch (error) {
      showError("Failed to fetch FDR details");
      console.error("Error fetching FDR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDRDetails();
  }, [id]);

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return format(date, "PPP");
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (value: number | undefined): string => {
    if (!value) return 'N/A';
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleDelete = async () => {
    try {
      if (!id) return;
      setIsDeleting(true);
      await deleteFDR(id);
      navigate('/fdrs');
    } catch (error) {
      console.error('Error deleting FDR:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async (status: FDR['status']) => {
    try {
      if (!id) return;
      setIsUpdatingStatus(true);
      await updateFDRStatus(id, status);
      await fetchFDRDetails();
    } catch (error) {
      console.error('Error updating FDR status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!fdr) {
    return (
      <Alert variant="destructive">
        <AlertDescription>FDR not found</AlertDescription>
      </Alert>
    );
  }

  const daysUntilMaturity = fdr.maturityDate ? differenceInDays(new Date(fdr.maturityDate), new Date()) : null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/fdrs")} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to FDRs
          </Button>
        </div>
        <div className="flex space-x-4">
          {fdr.status === 'RUNNING' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('COMPLETED')}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('RETURNED')}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Mark as Returned
              </Button>
            </>
          )}
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
                  Are you sure you want to delete this FDR? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Maturity Warning */}
      {daysUntilMaturity !== null && daysUntilMaturity <= 30 && daysUntilMaturity > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This FDR will mature in {daysUntilMaturity} days ({formatDate(fdr.maturityDate)})
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Category</p>
            <Badge variant={fdr.category === 'FD' ? 'default' : 'secondary'}>
              {fdr.category === 'FD' ? 'Fixed Deposit' : 'Bank Guarantee'}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge>{fdr.status}</Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
            <p className="text-sm">{fdr.bankName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Account Number</p>
            <p className="text-sm">{fdr.accountNo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">FDR/BG Number</p>
            <p className="text-sm">{fdr.fdrNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Account Name</p>
            <p className="text-sm">{fdr.accountName || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Deposit Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(fdr.depositAmount)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maturity Value</p>
            <p className="text-lg font-semibold">{formatCurrency(fdr.maturityValue)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date of Deposit</p>
            <p className="text-sm">{formatDate(fdr.dateOfDeposit)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maturity Date</p>
            <p className="text-sm">{formatDate(fdr.maturityDate)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Deposit Amount</p>
            <p className="text-sm">{formatCurrency(fdr.depositAmount)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maturity Value</p>
            <p className="text-sm">{formatCurrency(fdr.maturityValue)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Contract/Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contract/Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Contract Number</p>
            <p className="text-sm">{fdr.contractNo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Point of Contact</p>
            <p className="text-sm">{fdr.poc || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Location</p>
            <p className="text-sm">{fdr.location || 'N/A'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Contract Details</p>
            <p className="text-sm whitespace-pre-wrap">{fdr.contractDetails || 'N/A'}</p>
          </div>
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
              <a href={fdr.documentUrl} target="_blank" rel="noopener noreferrer">
                View Document
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {fdr.tags && fdr.tags.length > 0 && (
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
