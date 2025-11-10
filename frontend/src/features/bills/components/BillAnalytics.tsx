import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingDown,
  FileText,
  AlertCircle,
  CheckCircle,
  Pencil
} from 'lucide-react';
import type { Invoice } from '../../loas/types/loa';
import { BillStatusBadge } from './BillStatusBadge';

interface BillAnalyticsProps {
  loaValue: number;
  receivablePending?: number;
  bills: Invoice[];
  // LOA-level totals (across all bills)
  loaActualAmountReceived?: number;
  loaAmountDeducted?: number;
  loaAmountPending?: number;
  loaDeductionReason?: string;
  // Edit handler
  onEditClick?: () => void;
}

export function BillAnalytics({
  loaValue,
  receivablePending = 0,
  bills,
  loaActualAmountReceived = 0,
  loaAmountDeducted = 0,
  loaAmountPending = 0,
  onEditClick,
}: BillAnalyticsProps) {
  // Calculate only total billed from individual bills
  const totalBilled = bills.reduce((sum, bill) => sum + (bill.invoiceAmount || 0), 0);

  // All financial calculations come from LOA-level values
  // Bills only record invoice information, they don't calculate amounts
  const totalReceived = loaActualAmountReceived || 0;
  const totalDeductions = loaAmountDeducted || 0;
  const totalPaymentPending = loaAmountPending || 0;

  const billingProgress = loaValue > 0 ? (totalBilled / loaValue) * 100 : 0;

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
                <span className="text-lg font-bold text-blue-700">{formatCurrency(totalBilled)}</span>
              </div>
              <Progress value={billingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {billingProgress.toFixed(1)}% billed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Receivable Pending (SD/FDR/Other) */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">
                Receivable Pending
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(receivablePending)}
              </p>
              <p className="text-xs text-blue-600">SD / FDR / Other Sources</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Pending (From Bills) */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-900">
                Payment Pending
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(totalPaymentPending)}
              </p>
              <p className="text-xs text-amber-600">
                LOA Total (Manual Entry)
              </p>
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
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <Pencil className="h-8 w-8 text-blue-500" />
              <Button
                onClick={onEditClick}
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-500 hover"
              >
                Update Financial Data
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Edit LOA-level totals
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Received</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(totalReceived)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deductions</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(totalDeductions)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
                <p className="text-xl font-bold text-gray-700">{bills.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
