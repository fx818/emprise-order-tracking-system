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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, X, Info, Trash2, Edit3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LOAFinancialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loaId: string;
  loaValue: number;
  // Calculated values from bills
  totalBilled?: number;
  totalReceived?: number;
  totalDeducted?: number;
  totalPending?: number;
  // Manual override values
  manualTotalBilled?: number;
  manualTotalReceived?: number;
  manualTotalDeducted?: number;
  // Pending breakdown
  recoverablePending?: number | null;
  paymentPending?: number | null;
  onUpdate: (data: {
    manualTotalBilled?: number;
    manualTotalReceived?: number;
    manualTotalDeducted?: number;
    recoverablePending: number;
  }) => Promise<void>;
  loading?: boolean;
}

export function LOAFinancialForm({
  open,
  onOpenChange,
  loaId: _loaId,
  loaValue,
  totalBilled = 0,
  totalReceived = 0,
  totalDeducted = 0,
  totalPending = 0,
  manualTotalBilled,
  manualTotalReceived,
  manualTotalDeducted,
  recoverablePending,
  paymentPending: _paymentPending,
  onUpdate,
  loading = false,
}: LOAFinancialFormProps) {
  const [formData, setFormData] = useState({
    manualTotalBilled: manualTotalBilled ?? undefined,
    manualTotalReceived: manualTotalReceived ?? undefined,
    manualTotalDeducted: manualTotalDeducted ?? undefined,
    recoverablePending: recoverablePending || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        manualTotalBilled: manualTotalBilled ?? undefined,
        manualTotalReceived: manualTotalReceived ?? undefined,
        manualTotalDeducted: manualTotalDeducted ?? undefined,
        recoverablePending: recoverablePending || 0,
      });
      setErrors({});
    }
  }, [open, manualTotalBilled, manualTotalReceived, manualTotalDeducted, recoverablePending]);

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [field]: numValue === undefined || isNaN(numValue) ? undefined : numValue,
    }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Calculate display values (manual overrides calculated)
  const displayBilled = formData.manualTotalBilled ?? totalBilled;
  const displayReceived = formData.manualTotalReceived ?? totalReceived;
  const displayDeducted = formData.manualTotalDeducted ?? totalDeducted;

  // Calculate display pending (either manual calculation or calculated from bills)
  const displayPending =
    formData.manualTotalBilled !== undefined &&
    formData.manualTotalReceived !== undefined &&
    formData.manualTotalDeducted !== undefined
      ? Math.max(0, formData.manualTotalBilled - formData.manualTotalReceived - formData.manualTotalDeducted)
      : totalPending;

  // Auto-calculate payment pending
  const calculatedPaymentPending = Math.max(0, displayPending - (formData.recoverablePending || 0));

  const clearManualOverrides = () => {
    setFormData((prev) => ({
      ...prev,
      manualTotalBilled: undefined,
      manualTotalReceived: undefined,
      manualTotalDeducted: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate manual values are non-negative if provided
    if (formData.manualTotalBilled !== undefined && formData.manualTotalBilled < 0) {
      newErrors.manualTotalBilled = 'Cannot be negative';
    }
    if (formData.manualTotalReceived !== undefined && formData.manualTotalReceived < 0) {
      newErrors.manualTotalReceived = 'Cannot be negative';
    }
    if (formData.manualTotalDeducted !== undefined && formData.manualTotalDeducted < 0) {
      newErrors.manualTotalDeducted = 'Cannot be negative';
    }

    // Validate recoverable pending
    if (formData.recoverablePending < 0) {
      newErrors.recoverablePending = 'Cannot be negative';
    }
    if (formData.recoverablePending > displayPending) {
      newErrors.recoverablePending = `Cannot exceed Total Pending (${formatCurrency(displayPending)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await onUpdate({
        manualTotalBilled: formData.manualTotalBilled,
        manualTotalReceived: formData.manualTotalReceived,
        manualTotalDeducted: formData.manualTotalDeducted,
        recoverablePending: formData.recoverablePending,
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error('Failed to update LOA financial data:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      manualTotalBilled: manualTotalBilled ?? undefined,
      manualTotalReceived: manualTotalReceived ?? undefined,
      manualTotalDeducted: manualTotalDeducted ?? undefined,
      recoverablePending: recoverablePending || 0,
    });
    setErrors({});
    onOpenChange(false);
  };

  const hasManualOverrides =
    formData.manualTotalBilled !== undefined ||
    formData.manualTotalReceived !== undefined ||
    formData.manualTotalDeducted !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LOA Financial Overview</DialogTitle>
          <DialogDescription>
            View LOA-level financial summary and manage pending breakdown
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Order Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Order Overview</h3>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Total Receivables (Order Value)</span>
                <span className="text-lg font-bold text-blue-900">{formatCurrency(loaValue)}</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                This is the total value of the LOA/PO
              </p>
            </div>
          </div>

          <Separator />

          {/* Section 2: Billing Summary (Editable with manual overrides) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Billing Summary</h3>
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </div>
              {hasManualOverrides && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearManualOverrides}
                  className="text-xs h-7"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Manual Overrides
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter manual overrides for historical data, or leave blank to use calculated values from bills
            </p>

            {/* Total Billed Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manualTotalBilled" className="text-sm">
                  Total Billed
                </Label>
                <Badge variant={formData.manualTotalBilled !== undefined ? "secondary" : "default"} className="text-xs">
                  {formData.manualTotalBilled !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    id="manualTotalBilled"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.manualTotalBilled ?? ''}
                    onChange={(e) => handleNumberChange('manualTotalBilled', e.target.value)}
                    placeholder={`Calculated: ${formatCurrency(totalBilled)}`}
                  />
                  {errors.manualTotalBilled && (
                    <p className="text-sm text-red-600 mt-1">{errors.manualTotalBilled}</p>
                  )}
                </div>
                <div className="w-36 text-right">
                  <p className="text-xs text-muted-foreground">Display:</p>
                  <p className="text-base font-semibold">{formatCurrency(displayBilled)}</p>
                </div>
              </div>
              {totalBilled > 0 && (
                <p className="text-xs text-muted-foreground">Calculated from bills: {formatCurrency(totalBilled)}</p>
              )}
            </div>

            {/* Total Received Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manualTotalReceived" className="text-sm">
                  Total Received
                </Label>
                <Badge variant={formData.manualTotalReceived !== undefined ? "secondary" : "default"} className="text-xs">
                  {formData.manualTotalReceived !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    id="manualTotalReceived"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.manualTotalReceived ?? ''}
                    onChange={(e) => handleNumberChange('manualTotalReceived', e.target.value)}
                    placeholder={`Calculated: ${formatCurrency(totalReceived)}`}
                  />
                  {errors.manualTotalReceived && (
                    <p className="text-sm text-red-600 mt-1">{errors.manualTotalReceived}</p>
                  )}
                </div>
                <div className="w-36 text-right">
                  <p className="text-xs text-muted-foreground">Display:</p>
                  <p className="text-base font-semibold text-green-700">{formatCurrency(displayReceived)}</p>
                </div>
              </div>
              {totalReceived > 0 && (
                <p className="text-xs text-muted-foreground">Calculated from bills: {formatCurrency(totalReceived)}</p>
              )}
            </div>

            {/* Total Deducted Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manualTotalDeducted" className="text-sm">
                  Total Deductions
                </Label>
                <Badge variant={formData.manualTotalDeducted !== undefined ? "secondary" : "default"} className="text-xs">
                  {formData.manualTotalDeducted !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    id="manualTotalDeducted"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.manualTotalDeducted ?? ''}
                    onChange={(e) => handleNumberChange('manualTotalDeducted', e.target.value)}
                    placeholder={`Calculated: ${formatCurrency(totalDeducted)}`}
                  />
                  {errors.manualTotalDeducted && (
                    <p className="text-sm text-red-600 mt-1">{errors.manualTotalDeducted}</p>
                  )}
                </div>
                <div className="w-36 text-right">
                  <p className="text-xs text-muted-foreground">Display:</p>
                  <p className="text-base font-semibold text-orange-700">{formatCurrency(displayDeducted)}</p>
                </div>
              </div>
              {totalDeducted > 0 && (
                <p className="text-xs text-muted-foreground">Calculated from bills: {formatCurrency(totalDeducted)}</p>
              )}
            </div>

            {/* Total Pending - Calculated Display */}
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-md">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold text-amber-900">Total Pending</Label>
                <p className="text-xl font-bold text-amber-900">{formatCurrency(displayPending)}</p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                = Billed - Received - Deducted
              </p>
            </div>
          </div>

          <Separator />

          {/* Section 3: Pending Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Pending Breakdown</h3>
              <span className="text-red-500">*</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Specify how much of the pending amount is recoverable (SD/FDR/Other). Payment pending is automatically calculated.
            </p>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Payment Pending = Total Pending - Recoverable Pending
              </AlertDescription>
            </Alert>

            {/* Recoverable Pending - Editable */}
            <div className="space-y-2">
              <Label htmlFor="recoverablePending" className="text-sm">
                Recoverable Pending
                <span className="text-xs text-muted-foreground ml-2">(SD/FDR/Other)</span>
              </Label>
              <Input
                id="recoverablePending"
                type="number"
                step="0.01"
                min="0"
                max={displayPending}
                value={formData.recoverablePending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNumberChange('recoverablePending', e.target.value)}
                placeholder="0.00"
              />
              {errors.recoverablePending && (
                <p className="text-sm text-red-600">{errors.recoverablePending}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(displayPending)}
              </p>
            </div>

            {/* Payment Pending - Auto-calculated (Read-only) */}
            <div className="space-y-2">
              <Label className="text-sm">
                Payment Pending
                <span className="text-xs text-muted-foreground ml-2">(Auto-calculated)</span>
              </Label>
              <div className="p-3 bg-muted border border-input rounded-md">
                <p className="text-lg font-semibold">{formatCurrency(calculatedPaymentPending)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatCurrency(displayPending)} - {formatCurrency(formData.recoverablePending)}
                </p>
              </div>
            </div>
          </div>
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
