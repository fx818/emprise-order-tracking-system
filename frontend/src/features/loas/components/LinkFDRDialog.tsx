import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Search, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useFDRs } from '../../fdrs/hooks/use-fdrs';
import type { FDR } from '../../fdrs/types/fdr';
import { format } from 'date-fns';

interface LinkFDRDialogProps {
  open: boolean;
  onClose: () => void;
  onLink: (fdrId: string) => Promise<void>;
  loaId: string;
  linkedFdrIds?: string[]; // IDs of already linked FDRs to show as disabled
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string | Date): string => {
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

export function LinkFDRDialog({
  open,
  onClose,
  onLink,
  loaId,
  linkedFdrIds = [],
}: LinkFDRDialogProps) {
  const { getAllFDRs, loading } = useFDRs();
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFDRs();
    }
  }, [open]);

  const fetchFDRs = async () => {
    try {
      const data = await getAllFDRs(1000); // Get a large number of FDRs
      setFdrs(data || []);
    } catch (error) {
      console.error('Error fetching FDRs:', error);
    }
  };

  const handleLink = async (fdrId: string) => {
    try {
      setLinking(fdrId);
      await onLink(fdrId);
      onClose();
    } catch (error) {
      console.error('Error linking FDR:', error);
    } finally {
      setLinking(null);
    }
  };

  // Filter FDRs based on search and filters
  const filteredFdrs = fdrs.filter((fdr) => {
    const matchesSearch =
      searchTerm === '' ||
      fdr.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fdr.fdrNumber && fdr.fdrNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fdr.accountNo && fdr.accountNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || fdr.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || fdr.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link FDR to LOA</DialogTitle>
          <DialogDescription>
            Select an existing FDR to link to this LOA. FDRs already linked to this LOA or to other LOAs are shown as disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bank, FDR number, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="FD">Fixed Deposit</SelectItem>
                <SelectItem value="BG">Bank Guarantee</SelectItem>
                <SelectItem value="SD">Security Deposit</SelectItem>
                <SelectItem value="PG">Performance Guarantee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* FDR List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <LoadingSpinner />
              </div>
            ) : filteredFdrs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No FDRs found matching your criteria.
              </div>
            ) : (
              filteredFdrs.map((fdr) => {
                const isLinkedToThisLoa = linkedFdrIds.includes(fdr.id);
                const isLinking = linking === fdr.id;

                // Check if FDR is linked to other LOAs
                const otherLoaLinks: string[] = [];

                // Check general LOA links (excluding current LOA)
                if (fdr.generalLoaLinks) {
                  fdr.generalLoaLinks.forEach(link => {
                    if (link.loaId !== loaId) {
                      otherLoaLinks.push(link.loa.loaNumber);
                    }
                  });
                }

                // Check if it's used as SD in another LOA
                if (fdr.loaForSD) {
                  otherLoaLinks.push(`${fdr.loaForSD.loaNumber} (SD)`);
                }

                // Check if it's used as PG in another LOA
                if (fdr.loaForPG) {
                  otherLoaLinks.push(`${fdr.loaForPG.loaNumber} (PG)`);
                }

                const isLinkedToOtherLoa = otherLoaLinks.length > 0;
                const isDisabled = isLinkedToThisLoa || isLinkedToOtherLoa || isLinking;

                return (
                  <div
                    key={fdr.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isDisabled ? 'bg-muted opacity-60' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{fdr.bankName}</span>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(fdr.category)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {fdr.status}
                        </Badge>
                        {isLinkedToThisLoa && (
                          <Badge variant="default" className="text-xs">
                            Already Linked
                          </Badge>
                        )}
                        {isLinkedToOtherLoa && (
                          <Badge variant="destructive" className="text-xs">
                            Linked to: {otherLoaLinks.join(', ')}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Deposit:</span>{' '}
                          {formatCurrency(fdr.depositAmount)}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {formatDate(fdr.dateOfDeposit)}
                        </div>
                        {fdr.fdrNumber && (
                          <div>
                            <span className="font-medium">FDR#:</span> {fdr.fdrNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLink(fdr.id)}
                      disabled={isDisabled}
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                          Link
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
