import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LOAList } from '../components/LOAList';
import { LOADetail } from '../components/LOADetail';
import { LOAForm } from '../components/LOAForm';
import { AmendmentForm } from '../components/AmendmentForm';
import { BulkImportDialog } from '../components/BulkImportDialog';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { ArrowLeft, Upload } from 'lucide-react';
import { LOA, LOAFormData, AmendmentFormData } from '../types/loa';
import { useToast } from '../../../hooks/use-toast-app';
import { useLOAs } from '../hooks/use-loas';
import { Alert, AlertDescription } from '../../../components/ui/alert';

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';

export function LOAsPage() {
  return (
    <Routes>
      <Route index element={<LOAsList />} />
      <Route path="new" element={<NewLOA />} />
      <Route path=":id" element={<LOADetail />} />
      <Route path=":id/edit" element={<EditLOA />} />
      <Route path=":id/amendments/new" element={<NewAmendment />} />
      <Route path="*" element={<Navigate to="/loas" replace />} />
    </Routes>
  );
}

function LOAsList() {
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBulkImportSuccess = () => {
    // Trigger a refresh of the LOA list by changing the key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">PO/LOA Management</h1>
        <Button
          variant="outline"
          onClick={() => setBulkImportOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </div>

      <LOAList key={refreshKey} />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={handleBulkImportSuccess}
      />
    </div>
  );
}

function NewLOA() {
  const navigate = useNavigate();
  const { createLOA } = useLOAs();
  const { showSuccess } = useToast();

  const handleSubmit = async (data: LOAFormData) => {
    try {
      await createLOA(data);
      showSuccess('LOA created successfully');
      navigate('..');
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error creating LOA:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('..')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New LOA</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <LOAForm
            onSubmit={handleSubmit}
            onClose={() => navigate('..')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function EditLOA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLOAById, updateLOA } = useLOAs();
  const [loa, setLOA] = useState<LOA | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLOA = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await getLOAById(id);
        setLOA(data);
      } catch (error) {
        console.error("Error fetching LOA:", error);
        navigate('/loas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLOA();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading LOA details...</p>
        </div>
      </div>
    );
  }

  if (!loa) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive">
          <AlertDescription>LOA not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Transform LOA data to LOAFormData structure
  const firstInvoice = loa.invoices && loa.invoices.length > 0 ? loa.invoices[0] : null;

  const initialFormData = {
    siteId: loa.site?.id || '',
    loaNumber: loa.loaNumber,
    loaValue: loa.loaValue,
    deliveryPeriod: loa.deliveryPeriod,
    dueDate: loa.dueDate || null,
    orderReceivedDate: loa.orderReceivedDate || null,
    workDescription: loa.workDescription,
    tags: loa.tags || [],
    remarks: loa.remarks || '',
    tenderNo: loa.tenderNo || '',
    tenderId: loa.tenderId || loa.tender?.id || '',
    pocId: loa.pocId || loa.poc?.id || '',
    fdBgDetails: loa.fdBgDetails || '',
    hasEmd: loa.hasEmd,
    emdAmount: loa.emdAmount,
    hasSd: loa.hasSd,
    sdFdrId: loa.sdFdrId,
    hasPg: loa.hasPg,
    pgFdrId: loa.pgFdrId,
    // Warranty fields
    warrantyPeriodMonths: loa.warrantyPeriodMonths || null,
    warrantyPeriodYears: loa.warrantyPeriodYears || null,
    warrantyStartDate: loa.warrantyStartDate || null,
    warrantyEndDate: loa.warrantyEndDate || null,
    // Map invoice fields from the first invoice
    invoiceNumber: firstInvoice?.invoiceNumber || '',
    invoiceAmount: firstInvoice?.invoiceAmount || null,
    billLinks: firstInvoice?.billLinks || '',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(`/loas/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to LOA
        </Button>
        <h1 className="text-2xl font-bold">Edit LOA: {loa.loaNumber}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <LOAForm
            initialData={initialFormData}
            initialSiteName={loa.site?.name}
            existingDocumentUrl={loa.documentUrl}
            existingInvoicePdfUrl={firstInvoice?.invoicePdfUrl}
            onSubmit={async (data) => {
            try {
              await updateLOA(id!, data);
              navigate(`/loas/${id}`);
            } catch (error) {
              console.error('Error updating LOA:', error);
            }
          }}
            onClose={() => navigate(`/loas/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function NewAmendment() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createAmendment, getLOAById } = useLOAs();
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loa, setLOA] = useState<LOA | null>(null);

  useEffect(() => {
    const fetchLOA = async () => {
      if (!id) return;
      try {
        const data = await getLOAById(id);
        setLOA(data);
      } catch (error) {
        console.error("Error fetching LOA:", error);
        navigate(`/loas/${id}`);
      }
    };

    fetchLOA();
  }, [id]);

  const handleSubmit = async (data: AmendmentFormData) => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('amendmentNumber', data.amendmentNumber);
      if (data.documentFile) {
        formData.append('documentFile', data.documentFile);
      }
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => formData.append('tags[]', tag));
      }
      // Call createAmendment with data object
      await createAmendment(id, {
        amendmentNumber: data.amendmentNumber,
        tags: data.tags || [],
        documentFile: data.documentFile
      });
      
      // Wait for the amendment to be created before navigating
      const updatedLOA = await getLOAById(id);
      if (updatedLOA.amendments.some((a: any) => a.amendmentNumber === data.amendmentNumber)) {
        showSuccess('Amendment created successfully');
        navigate(`/loas/${id}`);
      } else {
        throw new Error('Amendment creation failed');
      }
    } catch (error) {
      console.error("Error creating amendment:", error);
      showError('Failed to create amendment');
      setIsSubmitting(false);
    }
  };

  if (!loa) return null;

  return (
    <AmendmentForm
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/loas/${id}`)}
      isSubmitting={isSubmitting}
    />
  );
}           