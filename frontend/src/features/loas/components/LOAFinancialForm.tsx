import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LOAFinancialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loaId: string;
  loaValue: number;
  receivablePending?: number | null;
  actualAmountReceived?: number | null;
  amountDeducted?: number | null;
  amountPending?: number | null;
  deductionReason?: string;
  onUpdate: (data: {
    receivablePending?: number;
    actualAmountReceived?: number;
    amountDeducted?: number;
    amountPending?: number;
    deductionReason?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function LOAFinancialForm({
  open,
  onOpenChange,
  loaId: _loaId,
  loaValue,
  receivablePending,
  actualAmountReceived,
  amountDeducted,
  amountPending,
  deductionReason,
  onUpdate,
  loading = false,
}: LOAFinancialFormProps) {
  const [formData, setFormData] = useState({
    receivablePending: receivablePending || 0,
    actualAmountReceived: actualAmountReceived || 0,
    amountDeducted: amountDeducted || 0,
    amountPending: amountPending || 0,
    deductionReason: deductionReason || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        receivablePending: receivablePending || 0,
        actualAmountReceived: actualAmountReceived || 0,
        amountDeducted: amountDeducted || 0,
        amountPending: amountPending || 0,
        deductionReason: deductionReason || '',
      });
      setErrors({});
    }
  }, [open, receivablePending, actualAmountReceived, amountDeducted, amountPending, deductionReason]);

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue,
    }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const calculateSuggestedPending = () => {
    const totalReceivables = loaValue;
    const received = formData.actualAmountReceived || 0;
    const deducted = formData.amountDeducted || 0;
    return Math.max(0, totalReceivables - received - deducted);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate non-negative numbers
    if (formData.receivablePending < 0) {
      newErrors.receivablePending = 'Cannot be negative';
    }
    if (formData.actualAmountReceived < 0) {
      newErrors.actualAmountReceived = 'Cannot be negative';
    }
    if (formData.amountDeducted < 0) {
      newErrors.amountDeducted = 'Cannot be negative';
    }
    if (formData.amountPending < 0) {
      newErrors.amountPending = 'Cannot be negative';
    }

    // Require deduction reason if amount deducted > 0
    if (formData.amountDeducted > 0 && !formData.deductionReason.trim()) {
      newErrors.deductionReason = 'Required when amount is deducted';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await onUpdate({
        receivablePending: formData.receivablePending,
        actualAmountReceived: formData.actualAmountReceived,
        amountDeducted: formData.amountDeducted,
        amountPending: formData.amountPending,
        deductionReason: formData.deductionReason || undefined,
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error('Failed to update LOA financial data:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      receivablePending: receivablePending || 0,
      actualAmountReceived: actualAmountReceived || 0,
      amountDeducted: amountDeducted || 0,
      amountPending: amountPending || 0,
      deductionReason: deductionReason || '',
    });
    setErrors({});
    onOpenChange(false);
  };

  const suggestedPending = calculateSuggestedPending();
  const showCalculationHint = suggestedPending !== formData.amountPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update LOA Financial Data</DialogTitle>
          <DialogDescription>
            Manually update LOA-level financial totals (across all bills)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receivablePending">
                Receivable Pending
                <span className="text-xs text-muted-foreground ml-2">(SD/FDR/Other)</span>
              </Label>
              <Input
                id="receivablePending"
                type="number"
                step="0.01"
                min="0"
                value={formData.receivablePending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange('receivablePending', e.target.value)}
                placeholder="0.00"
              />
              {errors.receivablePending && (
                <p className="text-sm text-red-600">{errors.receivablePending}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualAmountReceived">Actual Amount Received</Label>
              <Input
                id="actualAmountReceived"
                type="number"
                step="0.01"
                min="0"
                value={formData.actualAmountReceived}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange('actualAmountReceived', e.target.value)}
                placeholder="0.00"
              />
              {errors.actualAmountReceived && (
                <p className="text-sm text-red-600">{errors.actualAmountReceived}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountDeducted">Amount Deducted</Label>
              <Input
                id="amountDeducted"
                type="number"
                step="0.01"
                min="0"
                value={formData.amountDeducted}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange('amountDeducted', e.target.value)}
                placeholder="0.00"
              />
              {errors.amountDeducted && (
                <p className="text-sm text-red-600">{errors.amountDeducted}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPending">Amount Pending</Label>
              <Input
                id="amountPending"
                type="number"
                step="0.01"
                min="0"
                value={formData.amountPending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange('amountPending', e.target.value)}
                placeholder="0.00"
              />
              {errors.amountPending && (
                <p className="text-sm text-red-600">{errors.amountPending}</p>
              )}
            </div>
          </div>

          {showCalculationHint && (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <strong>Suggested Amount Pending:</strong> {formatCurrency(suggestedPending)}
                <br />
                <span className="text-xs text-muted-foreground">
                  Formula: LOA Value ({formatCurrency(loaValue)}) - Received ({formatCurrency(formData.actualAmountReceived)}) - Deducted ({formatCurrency(formData.amountDeducted)})
                </span>
              </AlertDescription>
            </Alert>
          )}

          {formData.amountDeducted > 0 && (
            <div className="space-y-2">
              <Label htmlFor="deductionReason">
                Deduction Reason
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="deductionReason"
                value={formData.deductionReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    deductionReason: e.target.value,
                  }))
                }
                placeholder="Enter reason for deduction"
                rows={3}
              />
              {errors.deductionReason && (
                <p className="text-sm text-red-600">{errors.deductionReason}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
