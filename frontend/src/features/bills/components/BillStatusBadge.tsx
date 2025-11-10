import { Badge } from '@/components/ui/badge';
import type { BillStatus } from '../../loas/types/loa';

interface BillStatusBadgeProps {
  status: BillStatus;
}

export function BillStatusBadge({ status }: BillStatusBadgeProps) {
  const getStatusColor = (status: BillStatus): string => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'RETURNED':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'PAYMENT_MADE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusLabel = (status: BillStatus): string => {
    switch (status) {
      case 'REGISTERED':
        return 'Registered';
      case 'RETURNED':
        return 'Returned';
      case 'PAYMENT_MADE':
        return 'Payment Made';
      default:
        return status;
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
