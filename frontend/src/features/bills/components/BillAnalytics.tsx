import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrendingDown,
  FileText,
  Clock,
  CheckCircle,
  Pencil,
  Edit2
} from 'lucide-react';
import type { Invoice } from '../../loas/types/loa';
import { BillStatusBadge } from './BillStatusBadge';
import { useState } from 'react';

interface BillAnalyticsProps {
  loaValue: number;
  bills: Invoice[];
  // Calculated from invoices
  totalBilled?: number;
  totalReceived?: number;
  totalDeducted?: number;
  totalPending?: number;
  // Manual overrides
  manualTotalBilled?: number;
  manualTotalReceived?: number;
  manualTotalDeducted?: number;
  // LOA-level pending breakdown
  recoverablePending?: number;
  paymentPending?: number;
  // Edit handlers
  onEditClick?: () => void;
  onRecoverablePendingChange?: (value: number) => void;
}

export function BillAnalytics({
  loaValue,
  bills,
  totalBilled = 0,
  totalReceived = 0,
  totalDeducted = 0,
  totalPending = 0,
  manualTotalBilled,
  manualTotalReceived,
  manualTotalDeducted,
  recoverablePending = 0,
  onEditClick,
  onRecoverablePendingChange,
}: BillAnalyticsProps) {
  const [editingRecoverable, setEditingRecoverable] = useState(false);
  const [recoverableInput, setRecoverableInput] = useState(recoverablePending.toString());

  // Determine which values to display (manual overrides calculated)
  const displayBilled = manualTotalBilled ?? totalBilled;
  const displayReceived = manualTotalReceived ?? totalReceived;
  const displayDeducted = manualTotalDeducted ?? totalDeducted;

  // Calculate manual pending if all manual values exist
  const manualPending = manualTotalBilled !== undefined &&
                        manualTotalReceived !== undefined &&
                        manualTotalDeducted !== undefined
    ? Math.max(0, manualTotalBilled - manualTotalReceived - manualTotalDeducted)
    : undefined;

  const displayPending = manualPending ?? totalPending;

  const billingProgress = loaValue > 0 ? (displayBilled / loaValue) * 100 : 0;

  // Bill counts by status
  const statusCounts = bills.reduce((acc, bill) => {
    acc[bill.status] = (acc[bill.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Helper to format pending display (handles overpayment)
  const formatPendingDisplay = (pending: number) => {
    const isOverpaid = pending < 0;
    const absoluteAmount = Math.abs(pending);

    return {
      isOverpaid,
      displayText: isOverpaid ? 'Overpaid by' : 'Total Amount Pending',
      amount: absoluteAmount,
      cardClass: isOverpaid ? 'border-purple-200 bg-purple-50/50' : 'border-amber-200 bg-amber-50/50',
      textClass: isOverpaid ? 'text-purple-700' : 'text-amber-700',
      boldTextClass: isOverpaid ? 'text-purple-900' : 'text-amber-900',
      borderClass: isOverpaid ? 'border-purple-200' : 'border-amber-200',
      iconClass: isOverpaid ? 'text-purple-600' : 'text-amber-600',
      labelClass: isOverpaid ? 'text-purple-700' : 'text-amber-700',
      infoClass: isOverpaid ? 'text-purple-600' : 'text-amber-600',
      mediumTextClass: isOverpaid ? 'text-purple-800' : 'text-amber-800',
    };
  };

  const pendingDisplay = formatPendingDisplay(displayPending);

  const handleRecoverableSave = () => {
    const value = parseFloat(recoverableInput);
    // Only validate against positive pending
    if (!isNaN(value) && value >= 0 && (displayPending < 0 || value <= displayPending)) {
      onRecoverablePendingChange?.(value);
      setEditingRecoverable(false);
    }
  };

  const calculatedPaymentPending = displayPending - recoverablePending;

  return (
    <div className="space-y-4 mb-6">
      {/* Main Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* LOA Value & Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              LOA Value & Billing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Total Value</span>
                <span className="text-sm font-medium">{formatCurrency(loaValue)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Billed</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(displayBilled)}</span>
              </div>
              <Progress value={billingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {billingProgress.toFixed(1)}% billed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Pending Card with Breakdown */}
        <Card className={pendingDisplay.cardClass + " col-span-2"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className={"text-sm font-medium " + pendingDisplay.boldTextClass}>
                  {pendingDisplay.isOverpaid ? "Overpaid" : "Total Pending"}
                </CardTitle>
                <Clock className={"h-4 w-4 " + pendingDisplay.iconClass} />
              </div>
              <Badge variant={manualPending !== undefined ? "secondary" : "default"} className="text-xs">
                {manualPending !== undefined ? "Manual" : "From Bills"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className={"text-sm " + pendingDisplay.textClass}>{pendingDisplay.displayText}</span>
                <p className={"text-2xl font-bold " + pendingDisplay.textClass}>
                  {formatCurrency(pendingDisplay.amount)}
                </p>
              </div>
              {pendingDisplay.isOverpaid && (
                <p className={"text-xs " + pendingDisplay.textClass + " italic"}>
                  Received + Deducted exceeds Billed amount
                </p>
              )}

              {!pendingDisplay.isOverpaid && (
                <div className={"border-t " + pendingDisplay.borderClass + " pt-3 space-y-2"}>
                  <p className={"text-xs font-medium " + pendingDisplay.mediumTextClass}>Pending Breakdown:</p>

                  {/* Recoverable Pending - Editable */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className={"text-xs " + pendingDisplay.labelClass}>Recoverable:</Label>
                    {editingRecoverable ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={recoverableInput}
                          onChange={(e) => setRecoverableInput(e.target.value)}
                          className="h-7 w-24 text-xs"
                          step="0.01"
                          min="0"
                          max={displayPending}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={handleRecoverableSave}
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setRecoverableInput(recoverablePending.toString());
                            setEditingRecoverable(false);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={"text-sm font-semibold " + pendingDisplay.boldTextClass}>
                          {formatCurrency(recoverablePending)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setRecoverableInput(recoverablePending.toString());
                            setEditingRecoverable(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Payment Pending - Auto-calculated */}
                  <div className="flex items-center justify-between">
                    <Label className={"text-xs " + pendingDisplay.labelClass}>Payment:</Label>
                    <span className={"text-sm font-semibold " + pendingDisplay.boldTextClass}>
                      {formatCurrency(calculatedPaymentPending)}
                    </span>
                  </div>

                  <p className={"text-xs " + pendingDisplay.infoClass + " italic"}>
                    Payment = Total Pending - Recoverable
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bill Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bill Status Breakdown
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <BillStatusBadge status="REGISTERED" />
                </div>
                <span className="font-medium">{statusCounts.REGISTERED || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <BillStatusBadge status="RETURNED" />
                </div>
                <span className="font-medium">{statusCounts.RETURNED || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <BillStatusBadge status="PAYMENT_MADE" />
                </div>
                <span className="font-medium">{statusCounts.PAYMENT_MADE || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Totals Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Update Financial Data Button */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <Pencil className="h-8 w-8 text-blue-500" />
              <Button
                onClick={onEditClick}
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-50"
              >
                Update Financial Data
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Edit all financial values
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Billed Card */}
        <Card className="bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                <Badge variant={manualTotalBilled !== undefined ? "secondary" : "default"} className="text-xs">
                  {manualTotalBilled !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-gray-700">{formatCurrency(displayBilled)}</p>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              {manualTotalBilled !== undefined && totalBilled > 0 && (
                <p className="text-xs text-muted-foreground">
                  Calculated: {formatCurrency(totalBilled)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Received Card */}
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Received</p>
                <Badge variant={manualTotalReceived !== undefined ? "secondary" : "default"} className="text-xs">
                  {manualTotalReceived !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-green-700">{formatCurrency(displayReceived)}</p>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              {manualTotalReceived !== undefined && totalReceived > 0 && (
                <p className="text-xs text-muted-foreground">
                  Calculated: {formatCurrency(totalReceived)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Deductions Card */}
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Deductions</p>
                <Badge variant={manualTotalDeducted !== undefined ? "secondary" : "default"} className="text-xs">
                  {manualTotalDeducted !== undefined ? "Manual" : "From Bills"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-red-700">{formatCurrency(displayDeducted)}</p>
                <TrendingDown className="h-8 w-8 text-red-400" />
              </div>
              {manualTotalDeducted !== undefined && totalDeducted > 0 && (
                <p className="text-xs text-muted-foreground">
                  Calculated: {formatCurrency(totalDeducted)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
