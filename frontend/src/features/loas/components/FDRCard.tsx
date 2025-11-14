import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Unlink, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import type { FDRSummary } from '../types/loa';
import { useState } from 'react';

interface FDRCardProps {
  fdr: FDRSummary;
  type?: 'SD' | 'PG' | 'general';
  onUnlink?: (fdrId: string) => Promise<void>;
  readonly?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'PP');
  } catch {
    return 'Invalid Date';
  }
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    SD: 'Security Deposit',
    PG: 'Performance Guarantee',
    FD: 'Fixed Deposit',
    BG: 'Bank Guarantee',
  };
  return labels[category] || category;
};

const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'RUNNING':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'RETURNED':
      return 'outline';
    default:
      return 'default';
  }
};

export function FDRCard({ fdr, type = 'general', onUnlink, readonly = false }: FDRCardProps) {
  const navigate = useNavigate();
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetails = () => {
    navigate(`/fdrs/${fdr.id}`);
  };

  const handleUnlink = async () => {
    if (!onUnlink) return;

    try {
      setIsUnlinking(true);
      await onUnlink(fdr.id);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error unlinking FDR:', error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const getTypeLabel = (): string => {
    if (type === 'SD') return 'Security Deposit (SD)';
    if (type === 'PG') return 'Performance Guarantee (PG)';
    return getCategoryLabel(fdr.category);
  };

  const showUnlinkButton = type === 'general' && !readonly && onUnlink;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              {getTypeLabel()}
            </CardTitle>
            {type === 'general' && fdr.linkedAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  Linked {format(new Date(fdr.linkedAt), 'PP')}
                  {fdr.linkedBy && ` by ${fdr.linkedBy.name}`}
                </span>
              </div>
            )}
          </div>
          <Badge variant={getStatusColor(fdr.status)}>
            {fdr.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Bank Name</p>
            <p className="text-sm font-medium">{fdr.bankName}</p>
          </div>
          {fdr.fdrNumber && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">FDR/BG Number</p>
              <p className="text-sm font-medium">{fdr.fdrNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Deposit Amount</p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(fdr.depositAmount)}
            </p>
          </div>
          {fdr.accountNo && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Account Number</p>
              <p className="text-sm">{fdr.accountNo}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Date of Deposit</p>
            <p className="text-sm">{formatDate(fdr.dateOfDeposit)}</p>
          </div>
          {fdr.maturityDate && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Maturity Date</p>
              <p className="text-sm">{formatDate(fdr.maturityDate)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View Details
          </Button>

          {showUnlinkButton && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Unlink
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Unlink</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to unlink this FDR from this LOA? This action
                    will not delete the FDR, only remove the association with this LOA.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleUnlink}
                    disabled={isUnlinking}
                  >
                    {isUnlinking ? 'Unlinking...' : 'Unlink FDR'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
