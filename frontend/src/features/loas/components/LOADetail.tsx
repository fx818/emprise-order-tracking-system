// src/features/loas/components/LOADetail.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
// import { format, isAfter, differenceInDays } from "date-fns";
import {
  FileText,
  ArrowLeft,
  Plus,
  Calendar,
  Trash2, // Added Trash2 icon
  RefreshCw, // Added RefreshCw icon for status update
  Pencil, // Added Pencil icon for edit
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useLOAs } from "../hooks/use-loas";
import { useBills } from "../../bills/hooks/use-bills";
import { BillList } from "../../bills/components/BillList";
import { BillForm } from "../../bills/components/BillForm";
import { BillAnalytics } from "../../bills/components/BillAnalytics";
import { LOAFinancialForm } from "./LOAFinancialForm";
import type { LOA, Invoice } from "../types/loa";
import { cn } from "../../../lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
// import { LOAForm } from "./LOAForm";
import { Badge } from "../../../components/ui/badge";
import { StatusUpdateDialog } from "./StatusUpdateDialog"; // Import the new dialog
import { OtherDocumentUploadDialog } from "./OtherDocumentUploadDialog";
import { FDRCard } from "./FDRCard";
import { LinkFDRDialog } from "./LinkFDRDialog";

// Add formatCurrency helper function
const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Add function to get status badge color
const getStatusBadgeStyle = (status: LOA['status']) => {
  if (!status) return 'bg-gray-100 text-gray-800';

  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-100 text-gray-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'SUPPLY_WORK_COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CHASE_PAYMENT':
      return 'bg-amber-100 text-amber-800';
    case 'CLOSED':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper to display readable status text
const getStatusDisplayText = (status: LOA['status']) => {
  switch (status) {
    case 'NOT_STARTED':
      return '1. Not Started';
    case 'IN_PROGRESS':
      return '2. In Progress';
    case 'SUPPLY_WORK_COMPLETED':
      return '4. Supply/Work Completed';
    case 'CHASE_PAYMENT':
      return '7. Chase Payment';
    case 'CLOSED':
      return '9. Closed';
    default:
      return status;
  }
};

export function LOADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, getLOAById, deleteLOA, deleteAmendment, createOtherDocument, deleteOtherDocument, updatePendingSplit, updateManualFinancials, linkGeneralFdr, unlinkGeneralFdr } = useLOAs();
  const { loading: billsLoading, getBillsByLoaId, createBill, updateBill, deleteBill } = useBills();
  const [loa, setLOA] = useState<LOA | null>(null);
  const [bills, setBills] = useState<Invoice[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAmendmentDialogOpen, setDeleteAmendmentDialogOpen] = useState(false);
  const [amendmentToDelete, setAmendmentToDelete] = useState<{ id: string; number: string } | null>(null);
  // Add state for status update dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  // Bill form state
  const [billFormOpen, setBillFormOpen] = useState(false);
  // Other document upload dialog state
  const [otherDocUploadDialogOpen, setOtherDocUploadDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingBill, setEditingBill] = useState<Invoice | undefined>();
  // Financial data edit dialog state
  const [financialDialogOpen, setFinancialDialogOpen] = useState(false);
  // Link FDR dialog state
  const [linkFDRDialogOpen, setLinkFDRDialogOpen] = useState(false);

  const fetchLOA = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getLOAById(id);

      // Ensure the LOA has a status value
      if (data && !data.status) {
        data.status = 'NOT_STARTED';
      }

      setLOA(data);
    } catch (error) {
      console.error("Error fetching LOA:", error);
      // Redirect to LOA list if LOA not found
      navigate("/loas");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBills = useCallback(async () => {
    if (!id) return;
    try {
      const billsData = await getBillsByLoaId(id);
      setBills(billsData);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchLOA();
    fetchBills();
  }, [fetchLOA, fetchBills]);

  if (loading && !loa) {
    return <LoadingSpinner />;
  }

  if (!loa) {
    return (
      <Alert variant="destructive">
        <AlertDescription>LOA not found</AlertDescription>
      </Alert>
    );
  }

  // // Calculate delivery period progress
  // const totalDays = differenceInDays(
  //   new Date(loa.deliveryPeriod.end),
  //   new Date(loa.deliveryPeriod.start)
  // );
  // const daysElapsed = differenceInDays(
  //   new Date(),
  //   new Date(loa.deliveryPeriod.start)
  // );
  // const progressPercentage = Math.min(
  //   Math.max((daysElapsed / totalDays) * 100, 0),
  //   100
  // );

  // // Check if LOA is overdue
  // const isOverdue = isAfter(new Date(), new Date(loa.deliveryPeriod.end));

  // Calculate total value including amendments
  // const totalValue = loa.amendments.reduce(
  //   (sum, amendment) => sum + (amendment.valueChange || 0),
  //   loa.loaValue
  // );

  // const handleEdit = async (data: LOAFormData) => {
  //   if (!id) return;
  //   try {
  //     await updateLOA(id, data);
  //     // Refresh LOA details
  //     const updatedLOA = await getLOAById(id);
  //     setLOA(updatedLOA);
  //   } catch (error) {
  //     console.error('Error updating LOA:', error);
  //   }
  // };

  const handleDeleteAmendment = async () => {
    if (!amendmentToDelete) return;

    try {
      await deleteAmendment(amendmentToDelete.id);
      // Refresh LOA details after deletion
      fetchLOA();
      setDeleteAmendmentDialogOpen(false);
      setAmendmentToDelete(null);
    } catch (error) {
      console.error('Error deleting amendment:', error);
    }
  };

  // Other document handlers
  const handleUploadOtherDocument = async (data: { title: string; documentFile?: any }) => {
    if (!id || !data.documentFile) return;

    try {
      await createOtherDocument(id, { title: data.title, documentFile: data.documentFile });
      // Refresh LOA details after upload
      fetchLOA();
    } catch (error) {
      console.error('Error uploading other document:', error);
    }
  };

  const handleDeleteOtherDocument = async () => {
    if (!documentToDelete) return;

    try {
      await deleteOtherDocument(documentToDelete.id);
      // Refresh LOA details after deletion
      fetchLOA();
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting other document:', error);
    }
  };

  // Bill handlers
  const handleAddBill = () => {
    setEditingBill(undefined);
    setBillFormOpen(true);
  };

  const handleEditBill = (bill: Invoice) => {
    setEditingBill(bill);
    setBillFormOpen(true);
  };

  const handleBillSubmit = async (data: any) => {
    if (!id) return;

    try {
      if (editingBill) {
        await updateBill(editingBill.id, data);
      } else {
        await createBill(id, data);
      }
      setBillFormOpen(false);
      setEditingBill(undefined);
      fetchBills();
      fetchLOA();
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      await deleteBill(billId);
      fetchBills();
      fetchLOA();
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  // Financial data update handler
  const handleFinancialUpdate = async (data: {
    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;
    recoverablePending: number;
  }) => {
    if (!id) return;

    try {
      // Update manual financial overrides and recoverable pending in a single transaction
      await updateManualFinancials(
        id,
        data.manualTotalBilled,
        data.manualTotalReceived,
        data.manualTotalDeducted,
        data.recoverablePending
      );

      // Refresh LOA details after update
      fetchLOA();
    } catch (error) {
      console.error('Error updating LOA financial data:', error);
      throw error; // Re-throw to let the form handle the error
    }
  };

  // Add function to handle status refresh
  const handleStatusUpdate = async () => {
    fetchLOA();
  };

  const handleLinkFDR = async (fdrId: string) => {
    if (!id) return;
    await linkGeneralFdr(id, fdrId);
    await fetchLOA(); // Refresh LOA to show new linked FDR
  };

  const handleUnlinkFDR = async (fdrId: string) => {
    if (!id) return;
    await unlinkGeneralFdr(id, fdrId);
    await fetchLOA(); // Refresh LOA to remove unlinked FDR
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/loas")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to LOAs
          </Button>
          <h1 className="text-2xl font-bold">LOA Details: {loa.loaNumber}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/loas/${id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit LOA
          </Button>
          <Button
            variant="default"
            onClick={() => navigate(`/loas/${id}/amendments/new`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Amendment
          </Button>
          {/* Add status update button */}
          <Button
            variant="outline"
            onClick={() => setStatusDialogOpen(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
        </div>
      </div>

      {/* Add Status Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Status
              </div>
              <div className="mt-2">
                <Badge className={cn("px-2 py-1", getStatusBadgeStyle(loa.status))}>
                  {getStatusDisplayText(loa.status)}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                LOA Value
              </div>
              <div className="mt-2 text-2xl font-bold">
                {formatCurrency(loa.loaValue)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Delivery Period
              </div>
              <div className="mt-2 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  {format(new Date(loa.deliveryPeriod.start), "PP")} - {format(new Date(loa.deliveryPeriod.end), "PP")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="billing">
            Bills {bills.length > 0 && `(${bills.length})`}
          </TabsTrigger>
          <TabsTrigger value="amendments">
            Amendments ({loa.amendments.length})
          </TabsTrigger>
          <TabsTrigger value="purchaseOrders">
            Purchase Orders ({loa.purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="fdrs">
            FDRs ({((loa.sdFdr ? 1 : 0) + (loa.pgFdr ? 1 : 0) + (loa.generalFdrs?.length || 0))})
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{loa.loaNumber}</CardTitle>
                  <CardDescription>
                    Created on {format(new Date(loa.createdAt), "PPP")}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold">
                    {formatCurrency(loa.loaValue)}
                  </span>
                  <span className="text-sm text-muted-foreground">Total Value</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LOA Details Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    LOA Number
                  </h3>
                  <p className="mt-1">{loa.loaNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Creation Date
                  </h3>
                  <p className="mt-1">
                    {format(new Date(loa.createdAt), "PPP")}
                  </p>
                </div>
                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Customer
                  </h3>
                  <p className="mt-1 font-medium">{loa.site?.zone?.name || 'N/A'}</p>
                  {loa.site?.zone?.headquarters && (
                    <p className="text-sm text-muted-foreground">
                      {loa.site.zone.headquarters}
                    </p>
                  )}
                </div>
                {/* Site Information */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Site
                  </h3>
                  <p className="mt-1">{loa.site?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    Code: {loa.site?.code || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Delivery Period */}
              <div>
                <h3 className="text-lg font-medium mb-2">Delivery Period</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Start Date</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(loa.deliveryPeriod.start), "PPP")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">End Date</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(loa.deliveryPeriod.end), "PPP")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <h3 className="text-lg font-medium mb-2">Due Date</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {loa.dueDate ? format(new Date(loa.dueDate), "PPP") : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Received Date */}
              <div>
                <h3 className="text-lg font-medium mb-2">Order Received Date</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {loa.orderReceivedDate ? format(new Date(loa.orderReceivedDate), "PPP") : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty Period */}
              <div>
                <h3 className="text-lg font-medium mb-2">Warranty Period</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  {/* Warranty Duration */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Duration</div>
                    <div className="text-sm">
                      {loa.warrantyPeriodYears || loa.warrantyPeriodMonths ? (
                        <>
                          {loa.warrantyPeriodYears && loa.warrantyPeriodYears > 0 && (
                            <span>{loa.warrantyPeriodYears} {loa.warrantyPeriodYears === 1 ? 'year' : 'years'}</span>
                          )}
                          {loa.warrantyPeriodYears && loa.warrantyPeriodYears > 0 && loa.warrantyPeriodMonths && loa.warrantyPeriodMonths > 0 && (
                            <span> and </span>
                          )}
                          {loa.warrantyPeriodMonths && loa.warrantyPeriodMonths > 0 && (
                            <span>{loa.warrantyPeriodMonths} {loa.warrantyPeriodMonths === 1 ? 'month' : 'months'}</span>
                          )}
                        </>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>

                  {/* Warranty Dates */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Start Date</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {loa.warrantyStartDate ? format(new Date(loa.warrantyStartDate), "PPP") : "-"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">End Date</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {loa.warrantyEndDate ? format(new Date(loa.warrantyEndDate), "PPP") : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Description */}
              <div>
                <h3 className="text-lg font-medium mb-2">Work Description</h3>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {loa.workDescription}
                </div>
              </div>

              {/* Tags */}
              {loa.tags && loa.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {loa.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EMD Section */}
              <div>
                <h3 className="text-lg font-medium mb-2">Earnest Money Deposit (EMD)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium mr-2 ${loa.hasEmd ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {loa.hasEmd ? 'Required' : 'Not Required'}
                        </span>
                        <span className="font-medium">Amount: {formatCurrency(loa.emdAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Deposit FDR Section */}
              <div>
                <h3 className="text-lg font-medium mb-2">Security Deposit (SD) FDR</h3>
                <div className="bg-muted p-4 rounded-lg">
                  {loa.sdFdr ? (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Bank Name</div>
                          <div className="text-sm font-semibold">{loa.sdFdr.bankName}</div>
                        </div>
                        {loa.sdFdr.fdrNumber && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">FDR/BG Number</div>
                            <div className="text-sm font-semibold">{loa.sdFdr.fdrNumber}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Deposit Amount</div>
                          <div className="text-sm font-semibold">{formatCurrency(loa.sdFdr.depositAmount)}</div>
                        </div>
                        {loa.sdFdr.accountNo && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Account Number</div>
                            <div className="text-sm">{loa.sdFdr.accountNo}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Date of Deposit</div>
                          <div className="text-sm">{format(new Date(loa.sdFdr.dateOfDeposit), "PPP")}</div>
                        </div>
                        {loa.sdFdr.maturityDate && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Maturity Date</div>
                            <div className="text-sm">{format(new Date(loa.sdFdr.maturityDate), "PPP")}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                          <Badge className={`${loa.sdFdr.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {loa.sdFdr.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/fdrs/${loa.sdFdr?.id}`)}
                        >
                          View Full FDR Details
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No Security Deposit FDR linked</div>
                  )}
                </div>
              </div>

              {/* Performance Guarantee FDR Section */}
              <div>
                <h3 className="text-lg font-medium mb-2">Performance Guarantee (PG) FDR</h3>
                <div className="bg-muted p-4 rounded-lg">
                  {loa.pgFdr ? (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Bank Name</div>
                          <div className="text-sm font-semibold">{loa.pgFdr.bankName}</div>
                        </div>
                        {loa.pgFdr.fdrNumber && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">FDR/BG Number</div>
                            <div className="text-sm font-semibold">{loa.pgFdr.fdrNumber}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Deposit Amount</div>
                          <div className="text-sm font-semibold">{formatCurrency(loa.pgFdr.depositAmount)}</div>
                        </div>
                        {loa.pgFdr.accountNo && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Account Number</div>
                            <div className="text-sm">{loa.pgFdr.accountNo}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Date of Deposit</div>
                          <div className="text-sm">{format(new Date(loa.pgFdr.dateOfDeposit), "PPP")}</div>
                        </div>
                        {loa.pgFdr.maturityDate && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Maturity Date</div>
                            <div className="text-sm">{format(new Date(loa.pgFdr.maturityDate), "PPP")}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                          <Badge className={`${loa.pgFdr.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {loa.pgFdr.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/fdrs/${loa.pgFdr?.id}`)}
                        >
                          View Full FDR Details
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No Performance Guarantee FDR linked</div>
                  )}
                </div>
              </div>

              {/* Additional Order Information */}
              <div>
                <h3 className="text-lg font-medium mb-2">Additional Order Information</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  {/* Tender Number */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Tender Number</div>
                    <div className="text-sm">{loa.tenderNo || '-'}</div>
                  </div>

                  {/* Order Point of Contact */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Order Point of Contact</div>
                    <div className="text-sm">{loa.poc?.name || '-'}</div>
                  </div>

                  {/* Inspection Agency */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Inspection Agency</div>
                    <div className="text-sm">{loa.inspectionAgency?.name || '-'}</div>
                  </div>

                  {/* FD/BG Details */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">FD/BG Details</div>
                    <div className="text-sm whitespace-pre-wrap">{loa.fdBgDetails || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="text-lg font-medium mb-2">Remarks</h3>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {loa.remarks || '-'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-4">
            {/* Bill Analytics with Edit Button */}
            <BillAnalytics
              loaValue={loa.loaValue}
              bills={bills}
              totalBilled={loa.totalBilled}
              totalReceived={loa.totalReceived}
              totalDeducted={loa.totalDeducted}
              totalPending={loa.totalPending}
              manualTotalBilled={loa.manualTotalBilled}
              manualTotalReceived={loa.manualTotalReceived}
              manualTotalDeducted={loa.manualTotalDeducted}
              recoverablePending={loa.recoverablePending}
              paymentPending={loa.paymentPending}
              onEditClick={() => setFinancialDialogOpen(true)}
              onRecoverablePendingChange={async (value: number) => {
                if (!id) return;
                try {
                  const displayPending =
                    loa.manualTotalBilled !== undefined &&
                    loa.manualTotalReceived !== undefined &&
                    loa.manualTotalDeducted !== undefined
                      ? Math.max(0, loa.manualTotalBilled - loa.manualTotalReceived - loa.manualTotalDeducted)
                      : loa.totalPending || 0;
                  const paymentPending = Math.max(0, displayPending - value);
                  await updatePendingSplit(id, value, paymentPending);
                  fetchLOA();
                } catch (error) {
                  console.error('Error updating recoverable pending:', error);
                }
              }}
            />

            {/* Bills List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bills & Invoices</CardTitle>
                  <CardDescription>
                    Manage all bills and invoices for this LOA
                  </CardDescription>
                </div>
                <Button onClick={handleAddBill} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bill
                </Button>
              </CardHeader>
              <CardContent>
                <BillList
                  bills={bills}
                  onEdit={handleEditBill}
                  onDelete={handleDeleteBill}
                  loading={billsLoading}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="amendments">
          <Card>
            <CardHeader>
              <CardTitle>Amendments History</CardTitle>
              <CardDescription>
                Track all modifications made to the original LOA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loa.amendments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No amendments have been made to this LOA
                </div>
              ) : (
                <div className="space-y-6">
                  {loa.amendments.map((amendment, index) => (
                    <div
                      key={amendment.id}
                      className={cn(
                        "border-l-2 pl-4 pb-6",
                        index === loa.amendments.length - 1 ? "" : "border-b"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">
                            {amendment.amendmentNumber}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Created on {format(new Date(amendment.createdAt), "PPP")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAmendmentToDelete({
                              id: amendment.id,
                              number: amendment.amendmentNumber
                            });
                            setDeleteAmendmentDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {amendment.tags && amendment.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {amendment.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {amendment.documentUrl && (
                        <a
                          href={amendment.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchaseOrders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                View all purchase orders associated with this LOA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!loa.purchaseOrders || loa.purchaseOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No purchase orders have been created for this LOA
                </div>
              ) : (
                <div className="space-y-4">
                  {loa.purchaseOrders.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{po.poNumber}</h4>
                          <Badge variant={
                            po.status === 'COMPLETED' ? 'default' :
                            po.status === 'IN_PROGRESS' ? 'destructive' :
                            'secondary'
                          }>
                            {po.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created on {format(new Date(po.createdAt), "PPP")}
                        </div>
                        {typeof po.value === 'number' && (
                          <div className="text-sm font-medium">
                            Value: ₹{po.value.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {po.documentUrl && (
                          <a
                            href={po.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View PO document
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fdrs">
          <div className="space-y-4">
            {/* Security Deposit FDR */}
            {loa.sdFdr && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Security Deposit (SD)
                </h3>
                <FDRCard fdr={loa.sdFdr} type="SD" readonly />
              </div>
            )}

            {/* Performance Guarantee FDR */}
            {loa.pgFdr && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Performance Guarantee (PG)
                </h3>
                <FDRCard fdr={loa.pgFdr} type="PG" readonly />
              </div>
            )}

            {/* General FDRs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  General FDRs
                </h3>
                <Button
                  onClick={() => setLinkFDRDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Link FDR
                </Button>
              </div>

              {loa.generalFdrs && loa.generalFdrs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {loa.generalFdrs.map((fdr) => (
                    <FDRCard
                      key={fdr.id}
                      fdr={fdr}
                      type="general"
                      onUnlink={handleUnlinkFDR}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No general FDRs linked to this LOA yet.
                    <br />
                    <Button
                      variant="link"
                      onClick={() => setLinkFDRDialogOpen(true)}
                      className="mt-2"
                    >
                      Link an existing FDR
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Link FDR Dialog */}
          <LinkFDRDialog
            open={linkFDRDialogOpen}
            onClose={() => setLinkFDRDialogOpen(false)}
            onLink={handleLinkFDR}
            loaId={id || ''}
            linkedFdrIds={[
              ...(loa.sdFdr ? [loa.sdFdr.id] : []),
              ...(loa.pgFdr ? [loa.pgFdr.id] : []),
              ...(loa.generalFdrs?.map(f => f.id) || []),
            ]}
          />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Access all documents associated with this LOA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Original LOA Document */}
                {loa.documentUrl && loa.documentUrl !== 'pending' && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Original LOA Document</div>
                        <div className="text-sm text-muted-foreground">
                          Uploaded on {format(new Date(loa.createdAt), "PPP")}
                        </div>
                      </div>
                    </div>
                    <a
                      href={loa.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}


                {/* Amendment Documents */}
                {loa.amendments.map((amendment) => (
                  amendment.documentUrl && (
                    <div key={amendment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            Amendment {amendment.amendmentNumber} Document
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Uploaded on {format(new Date(amendment.createdAt), "PPP")}
                          </div>
                        </div>
                      </div>
                      <a
                        href={amendment.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Document
                      </a>
                    </div>
                  )
                ))}

                {/* Other Documents Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Other Documents</h3>
                    <Button
                      size="sm"
                      onClick={() => setOtherDocUploadDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>

                  {loa.otherDocuments && loa.otherDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {loa.otherDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{doc.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Uploaded on {format(new Date(doc.createdAt), "PPP")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={doc.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Document
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDocumentToDelete({ id: doc.id, title: doc.title })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      No other documents uploaded yet
                    </div>
                  )}
                </div>

                {/* Show message if no documents are available */}
                {(!loa.documentUrl || loa.documentUrl === 'pending') &&
                  loa.amendments.every(a => !a.documentUrl) &&
                  (!loa.otherDocuments || loa.otherDocuments.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No documents have been uploaded for this LOA
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete LOA</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete LOA {loa.loaNumber}? This action cannot be undone.
              <p className="mt-2 text-red-500">Warning: All amendments associated with this LOA will also be permanently deleted.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteLOA(loa.id);
                  navigate('/loas');
                } catch (error) {
                  console.error('Error deleting LOA:', error);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={deleteAmendmentDialogOpen} 
        onOpenChange={setDeleteAmendmentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Amendment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Amendment {amendmentToDelete?.number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteAmendmentDialogOpen(false);
                setAmendmentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAmendment}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Status Update Dialog */}
      {loa && (
        <StatusUpdateDialog
          loa={loa}
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Bill Form Dialog */}
      <BillForm
        open={billFormOpen}
        onOpenChange={setBillFormOpen}
        onSubmit={handleBillSubmit}
        initialData={editingBill}
        loading={billsLoading}
      />

      {/* Other Document Upload Dialog */}
      <OtherDocumentUploadDialog
        isOpen={otherDocUploadDialogOpen}
        onClose={() => setOtherDocUploadDialogOpen(false)}
        onSubmit={handleUploadOtherDocument}
        isSubmitting={loading}
      />

      {/* Delete Other Document Confirmation Dialog */}
      <Dialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocumentToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOtherDocument}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOA Financial Data Edit Dialog */}
      {loa && (
        <LOAFinancialForm
          open={financialDialogOpen}
          onOpenChange={setFinancialDialogOpen}
          loaId={loa.id}
          loaValue={loa.loaValue}
          totalBilled={loa.totalBilled}
          totalReceived={loa.totalReceived}
          totalDeducted={loa.totalDeducted}
          totalPending={loa.totalPending}
          manualTotalBilled={loa.manualTotalBilled}
          manualTotalReceived={loa.manualTotalReceived}
          manualTotalDeducted={loa.manualTotalDeducted}
          recoverablePending={loa.recoverablePending}
          paymentPending={loa.paymentPending}
          onUpdate={handleFinancialUpdate}
          loading={loading}
        />
      )}
    </div>
  );
}
