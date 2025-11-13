import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { FDRList } from '../components/FDRList';
import { FDRForm } from '../components/FDRForm';
import { FDRDetail } from '../components/FDRDetail';
import { Button } from '../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { useFDRs } from '../hooks/use-fdrs';
import { FDRFormData } from '../types/fdr';
import { useToast } from '../../../hooks/use-toast-app';


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
