import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { TenderForm, EMDData } from '../components/TenderForm';
import { useTenders } from '../hooks/use-tenders';
import { TenderFormData } from '../types/tender';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { useEMDs } from '../../emds/hooks/use-emds';

export function EditTenderPage() {
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<TenderFormData>>({});
  const navigate = useNavigate();
  const { updateTender, getTenderById } = useTenders();
  const { getAllEMDs, updateEMD, createEMD } = useEMDs();

  useEffect(() => {
    let isMounted = true;
    
    const fetchTender = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const tender = await getTenderById(id);
        
        if (isMounted) {
          setDefaultValues({
            tenderNumber: tender.tenderNumber,
            dueDate: new Date(tender.dueDate),
            description: tender.description,
            hasEMD: tender.hasEMD,
            emdAmount: tender.emdAmount !== undefined ? tender.emdAmount : null,
            emdBankName: tender.emdBankName || undefined,
            emdSubmissionDate: tender.emdSubmissionDate ? new Date(tender.emdSubmissionDate) : undefined,
            emdMaturityDate: tender.emdMaturityDate ? new Date(tender.emdMaturityDate) : undefined,
            tags: tender.tags || [],
            siteId: tender.siteId || undefined,
            documentUrl: tender.documentUrl,
            nitDocumentUrl: tender.nitDocumentUrl || undefined,
            emdDocumentUrl: tender.emdDocumentUrl || undefined,
          });
        }
      } catch (error) {
        console.error('Failed to fetch tender', error);
        if (isMounted) {
          navigate('/tenders');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTender();
    
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleSubmit = async (tenderData: TenderFormData, emdData?: EMDData) => {
    if (!id) return;

    try {
      setIsSubmitting(true);

      // Step 1: Update the tender
      await updateTender(id, tenderData);

      // Step 2: Handle EMD data if present
      if (emdData) {
        // Check if EMD exists for this tender
        const allEMDs = await getAllEMDs();
        const existingEMD = allEMDs.find((e) => e.tenderId === id);

        if (existingEMD) {
          // Update existing EMD
          await updateEMD(existingEMD.id, {
            amount: emdData.amount,
            bankName: emdData.bankName,
            submissionDate: emdData.submissionDate,
            maturityDate: emdData.maturityDate,
            documentFile: emdData.documentFile,
            tags: emdData.tags
          });
        } else {
          // Create new EMD
          await createEMD({
            amount: emdData.amount,
            bankName: emdData.bankName,
            submissionDate: emdData.submissionDate,
            maturityDate: emdData.maturityDate,
            documentFile: emdData.documentFile,
            tenderId: id, // Link to tender
            tags: emdData.tags
          });
        }
      }

      navigate('/tenders');
    } catch (error) {
      console.error('Failed to update tender/EMD', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Helmet>
        <title>Edit Tender | Emprise Order Tracking</title>
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
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          title="Edit Tender"
          submitLabel="Update Tender"
        />
      </div>
    </>
  );
} 