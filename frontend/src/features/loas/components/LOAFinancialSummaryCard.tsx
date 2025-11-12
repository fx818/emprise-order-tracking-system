import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, TrendingDown, Clock, Edit } from 'lucide-react';
import type { LOA } from '../types/loa';

interface LOAFinancialSummaryCardProps {
  loa: LOA;
  onEditFinancials?: () => void;
  className?: string;
}

export function LOAFinancialSummaryCard({
  loa,
  onEditFinancials,
  className = '',
}: LOAFinancialSummaryCardProps) {
  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalReceivables = loa.loaValue;
  const totalBilled = loa.totalBilled || 0;
  const totalReceived = loa.totalReceived || 0;
  const totalDeducted = loa.totalDeducted || 0;
  const totalPending = loa.totalPending || 0;
  const recoverablePending = loa.recoverablePending || 0;
  const paymentPending = loa.paymentPending || 0;

  // Calculate percentages
  const billedPercentage = totalReceivables > 0 ? (totalBilled / totalReceivables) * 100 : 0;
  const receivedPercentage = totalReceivables > 0 ? (totalReceived / totalReceivables) * 100 : 0;
  const pendingPercentage = totalReceivables > 0 ? (totalPending / totalReceivables) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Overview
            </CardTitle>
            <CardDescription>LOA-level financial summary</CardDescription>
          </div>
          {onEditFinancials && (
            <Button variant="outline" size="sm" onClick={onEditFinancials}>
              <Edit className="h-4 w-4 mr-2" />
              Manage Pending
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Overview */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Order Overview</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">Total Receivables</span>
              <span className="text-2xl font-bold text-blue-900">{formatCurrency(totalReceivables)}</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">Order value from LOA/PO</p>
          </div>
        </div>

        <Separator />

        {/* Billing Summary */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Billing Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Total Billed */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Total Billed</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(totalBilled)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {billedPercentage.toFixed(1)}% of receivables
              </p>
            </div>

            {/* Total Received */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-green-700" />
                <span className="text-xs font-medium text-green-700">Total Received</span>
              </div>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalReceived)}</p>
              <p className="text-xs text-green-700 mt-1">
                {receivedPercentage.toFixed(1)}% of receivables
              </p>
            </div>

            {/* Total Deducted */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-orange-700" />
                <span className="text-xs font-medium text-orange-700">Total Deducted</span>
              </div>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(totalDeducted)}</p>
              <p className="text-xs text-orange-700 mt-1">
                From billed amounts
              </p>
            </div>

            {/* Total Pending */}
            <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-medium text-amber-700">Total Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-amber-700 mt-1">
                {pendingPercentage.toFixed(1)}% of receivables
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Pending Breakdown */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Pending Breakdown</h3>
          <div className="space-y-3">
            {/* Recoverable Pending */}
            <div className="flex justify-between items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-900">Recoverable Pending</p>
                <p className="text-xs text-purple-700">SD/FDR/Other recoverable amounts</p>
              </div>
              <span className="text-lg font-bold text-purple-900">{formatCurrency(recoverablePending)}</span>
            </div>

            {/* Payment Pending */}
            <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-900">Payment Pending</p>
                <p className="text-xs text-red-700">Outstanding payment from customer</p>
              </div>
              <span className="text-lg font-bold text-red-900">{formatCurrency(paymentPending)}</span>
            </div>

            {/* Validation check */}
            {Math.abs(recoverablePending + paymentPending - totalPending) > 0.01 && (
              <div className="p-2 bg-amber-100 border border-amber-300 rounded text-xs text-amber-800">
                ⚠️ Pending breakdown does not match total pending. Please update the split.
              </div>
            )}
          </div>
        </div>

        {/* Summary Formula */}
        <div className="pt-2">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground font-mono">
              Total Pending = Invoice Amount - Received - Deducted
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Total Pending = Recoverable + Payment Pending
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
