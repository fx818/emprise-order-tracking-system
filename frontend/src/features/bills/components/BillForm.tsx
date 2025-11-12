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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Invoice, BillStatus } from '../../loas/types/loa';
import type { CreateBillData, UpdateBillData } from '../hooks/use-bills';
import { calculatePending } from '../hooks/use-bills';

interface BillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBillData | UpdateBillData) => void;
  initialData?: Invoice;
  loading?: boolean;
}

export function BillForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading = false,
}: BillFormProps) {
  const [formData, setFormData] = useState<CreateBillData>({
    invoiceNumber: '',
    invoiceAmount: undefined,
    amountReceived: 0,
    amountDeducted: 0,
    deductionReason: '',
    billLinks: '',
    remarks: '',
    status: 'REGISTERED',
  });

  const [pdfFile, setPdfFile] = useState<File | undefined>();

  // Calculate pending amount
  const pendingAmount = calculatePending(
    formData.invoiceAmount,
    formData.amountReceived,
    formData.amountDeducted
  );

  // Update form data when initialData or open state changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          invoiceNumber: initialData.invoiceNumber || '',
          invoiceAmount: initialData.invoiceAmount || undefined,
          amountReceived: initialData.amountReceived || 0,
          amountDeducted: initialData.amountDeducted || 0,
          deductionReason: initialData.deductionReason || '',
          billLinks: initialData.billLinks || '',
          remarks: initialData.remarks || '',
          status: initialData.status || 'REGISTERED',
        });
      } else {
        // Reset form for new bill
        setFormData({
          invoiceNumber: '',
          invoiceAmount: undefined,
          amountReceived: 0,
          amountDeducted: 0,
          deductionReason: '',
          billLinks: '',
          remarks: '',
          status: 'REGISTERED',
        });
      }
      setPdfFile(undefined);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      invoicePdfFile: pdfFile,
    });
  };

  const handleNumberChange = (field: keyof CreateBillData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? undefined : parseFloat(value),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the bill information below.' : 'Enter the bill information below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Enter invoice number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as BillStatus })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTERED">Registered</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                  <SelectItem value="PAYMENT_MADE">Payment Made</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceAmount">Invoice Amount</Label>
            <Input
              id="invoiceAmount"
              type="number"
              step="0.01"
              value={formData.invoiceAmount || ''}
              onChange={(e) => handleNumberChange('invoiceAmount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received</Label>
              <Input
                id="amountReceived"
                type="number"
                step="0.01"
                value={formData.amountReceived || 0}
                onChange={(e) => handleNumberChange('amountReceived', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountDeducted">Amount Deducted</Label>
              <Input
                id="amountDeducted"
                type="number"
                step="0.01"
                value={formData.amountDeducted || 0}
                onChange={(e) => handleNumberChange('amountDeducted', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {(formData.amountDeducted || 0) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="deductionReason">Deduction Reason</Label>
              <Input
                id="deductionReason"
                value={formData.deductionReason}
                onChange={(e) => setFormData({ ...formData, deductionReason: e.target.value })}
                placeholder="Enter reason for deduction"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount Pending (Calculated)</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                = Invoice Amount - Received - Deducted
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billLinks">Bill Links</Label>
            <Input
              id="billLinks"
              value={formData.billLinks}
              onChange={(e) => setFormData({ ...formData, billLinks: e.target.value })}
              placeholder="Enter bill links or references"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter any additional remarks"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoicePdfFile">Invoice PDF</Label>
            <Input
              id="invoicePdfFile"
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0])}
            />
            {initialData?.invoicePdfUrl && (
              <p className="text-sm text-muted-foreground">
                Current file:{' '}
                <a
                  href={initialData.invoicePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View PDF
                </a>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Bill' : 'Create Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
