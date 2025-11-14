import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { FDRList } from '../components/FDRList';
import { FDRForm } from '../components/FDRForm';
import { FDRDetail } from '../components/FDRDetail';
import { Button } from '../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { useFDRs } from '../hooks/use-fdrs';
import { FDRFormData, FDR } from '../types/fdr';
import { useToast } from '../../../hooks/use-toast-app';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Alert, AlertDescription } from '../../../components/ui/alert';


// ---------------- Error Boundary Component ----------------
function FDRPageErrorBoundary({ error }: { error: Error }) {
  const { showError } = useToast();
  showError(`Something went wrong: ${error.message}`);
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-2">
        ⚠️ Oops! Something went wrong.
      </h2>
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  );
}

// A wrapper to catch unexpected render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <FDRPageErrorBoundary error={this.state.error} />;
    }
    return this.props.children;
  }
}

// ---------------- Main Routes ----------------
export function FDRsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-6 text-center">Loading FDRs...</div>}>
        <Routes>
          <Route index element={<FDRsList />} />
          <Route path="new" element={<NewFDR />} />
          <Route path=":id/edit" element={<EditFDR />} />
          <Route path=":id" element={<FDRDetail />} />
          <Route path="*" element={<Navigate to="." />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

// ---------------- List Page ----------------
function FDRsList() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">FDR Management</h1>
      </div>
      <FDRList />
    </div>
  );
}

// ---------------- Create Page ----------------
function NewFDR() {
  const navigate = useNavigate();
  const { createFDR } = useFDRs();
  const { showError, showSuccess } = useToast();

  const handleSubmit = async (data: FDRFormData) => {
    try {
      await createFDR(data);
      showSuccess('✅ New FDR created successfully');
      navigate('..');
    } catch (error: any) {
      // Errors from hook already show toast, but we handle unexpected ones too
      console.error('Error creating FDR:', error);
      if (!(error instanceof Error)) {
        showError('An unexpected error occurred while creating the FDR.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => navigate('..')} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New FDR</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FDRForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('..')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Edit Page ----------------
function EditFDR() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFDRById, updateFDR } = useFDRs();
  const { showError, showSuccess } = useToast();
  const [fdr, setFdr] = useState<FDR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFDR = async () => {
      if (!id) {
        setError('Invalid FDR ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getFDRById(id);
        setFdr(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching FDR:', err);
        setError(err.message || 'Failed to load FDR details');
        showError('Failed to load FDR details');
      } finally {
        setLoading(false);
      }
    };

    fetchFDR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (data: FDRFormData) => {
    if (!id) return;

    try {
      await updateFDR(id, data);
      showSuccess('✅ FDR updated successfully');
      navigate(`/fdrs/${id}`);
    } catch (error: any) {
      console.error('Error updating FDR:', error);
      if (!(error instanceof Error)) {
        showError('An unexpected error occurred while updating the FDR.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <LoadingSpinner />
        <span className="ml-3 text-muted-foreground">Loading FDR details...</span>
      </div>
    );
  }

  if (error || !fdr) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('..')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Edit FDR</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || 'FDR not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Transform FDR data to FDRFormData format
  const initialData: Partial<FDRFormData> = {
    category: fdr.category,
    bankName: fdr.bankName,
    accountNo: fdr.accountNo || '',
    fdrNumber: fdr.fdrNumber || '',
    accountName: fdr.accountName || '',
    depositAmount: fdr.depositAmount,
    dateOfDeposit: fdr.dateOfDeposit ? new Date(fdr.dateOfDeposit) : new Date(),
    maturityValue: fdr.maturityValue || undefined,
    maturityDate: fdr.maturityDate ? new Date(fdr.maturityDate) : undefined,
    contractNo: fdr.contractNo || '',
    contractDetails: fdr.contractDetails || '',
    poc: fdr.poc || '',
    location: fdr.location || '',
    status: fdr.status,
    tags: fdr.tags || [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => navigate(`/fdrs/${id}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit FDR</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FDRForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/fdrs/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
