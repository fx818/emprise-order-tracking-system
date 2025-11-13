import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { TenderForm } from '../components/TenderForm';
import { useTenders } from '../hooks/use-tenders';
import { TenderFormData } from '../types/tender';

export function CreateTenderPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { createTender } = useTenders();

  const handleSubmit = async (tenderData: TenderFormData) => {
    setIsSubmitting(true);
    try {
      await createTender(tenderData); // handles toasts internally
      navigate('/tenders');
    } catch (error) {
      console.error('Failed to create tender:', error);
      // Optional: fallback toast if useTenders doesn’t handle it
      // showError(error.response?.data?.message || "Failed to create tender.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <Helmet>
        <title>Create Tender | Emprise Order Tracking</title>
      </Helmet>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/tenders')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Tenders
          </button>
        </div>
        <TenderForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          title="Create New Tender"
          submitLabel="Create Tender"
        />
      </div>
    </>
  );
} 