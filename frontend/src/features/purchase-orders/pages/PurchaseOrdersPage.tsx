// src/features/purchase-orders/pages/PurchaseOrdersPage.tsx
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ArrowLeft} from 'lucide-react';
import { POList } from '../components/POList';
import { POForm } from '../components/POForm';
import { PODetail } from '../components/PODetail';
import { usePurchaseOrders } from '../hooks/use-purchase-orders';
import { useToast } from '../../../hooks/use-toast';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderFormData } from '../types/purchase-order';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import EditPODocumentPage from './EditPODocumentPage';

// Main container component for purchase order management
export function PurchaseOrdersPage() {
  return (
    <Routes>
      {/* Main listing route */}
      <Route index element={<POListPage />} />
      
      {/* Route for creating new purchase orders */}
      <Route path="new" element={<POFormPage mode="create" />} />

      <Route path=":id/edit-documents" element={<EditPODocumentPage />} />
      
      {/* Route for editing purchase orders */}
      <Route path=":id/edit" element={<POFormPage mode="edit" />} />
      
      {/* Route for viewing purchase order details */}
      <Route path=":id" element={<PODetail />} />

      {/* <Route path=":id/edit-documents" element={<EditPODocumentPage />} /> */}
      
      {/* Catch any invalid routes and redirect to the main listing */}
      <Route path="*" element={<Navigate to="/purchase-orders" />} />
    </Routes>
  );
}

// Component for displaying the main purchase orders listing
function POListPage() {
  // const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Order Management</h1>
        {/* <Button onClick={() => navigate('/purchase-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Order
        </Button> */}
      </div>
      <POList />
    </div>
  );
}

interface POFormPageProps {
  mode: 'create' | 'edit';
}

// Component for creating/editing purchase orders
function POFormPage({ mode }: POFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createPurchaseOrder, updatePurchaseOrder, getPurchaseOrder } = usePurchaseOrders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<PurchaseOrder | undefined>();

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (mode === 'edit' && id) {
        try {
          setLoading(true);
          const orderData = await getPurchaseOrder(id);
          
          if (orderData.status !== 'DRAFT') {
            setError('Only purchase orders in DRAFT status can be edited');
            return;
          }

          setInitialData(orderData);
        } catch (error) {
          console.error('Error fetching purchase order:', error);
          toast({
            title: "Error",
            description: "Failed to fetch purchase order details",
            variant: "destructive",
          });
          navigate('/purchase-orders');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPurchaseOrder();
  }, [mode, id]);

  const handleSubmit = async (data: PurchaseOrderFormData) => {
    try {
      if (mode === 'edit' && id) {
        await updatePurchaseOrder(id, data);
        toast({
          title: "Success",
          description: "Purchase order updated successfully",
        });
      } else {
        await createPurchaseOrder(data);
        toast({
          title: "Success",
          description: "Purchase order created successfully",
        });
      }
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save purchase order",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/purchase-orders')} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === 'edit' ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <POForm
            mode={mode}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/purchase-orders')}
          />
        </CardContent>
      </Card>
    </div>
  );
}