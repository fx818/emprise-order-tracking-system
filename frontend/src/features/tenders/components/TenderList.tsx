import { useState, useEffect, useMemo } from 'react';
import { MoreHorizontal, Plus, FileText, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';

import { Tender, EMDReturnStatus } from '../types/tender';
import { Column, DataTable } from '../../../components/data-display/DataTable';
import { StatusBadge } from '../../../components/data-display/StatusBadge';
import { Badge } from '../../../components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { useTenders } from '../hooks/use-tenders';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "../../../components/ui/pagination";

export function TenderList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tenderToDelete, setTenderToDelete] = useState<string | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const { loading, getAllTenders, deleteTender } = useTenders();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const getEMDReturnStatusBadge = (status: EMDReturnStatus | null | undefined) => {
    if (!status) return <Badge variant="secondary" className="text-xs">Pending</Badge>;

    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      case 'RELEASED':
        return <Badge className="bg-green-500 text-xs">Released</Badge>;
      case 'RETAINED_AS_SD':
        return <Badge variant="destructive" className="text-xs">Retained as SD</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const data = await getAllTenders(statusFilter !== 'ALL' ? statusFilter : undefined);
        setTenders(data || []);
      } catch (error) {
        console.error('Failed to fetch tenders:', error);
      }
    };

    fetchTenders();
  }, [statusFilter]);

  const handleDelete = (id: string) => {
    setTenderToDelete(id);
  };

  const confirmDelete = async () => {
    if (tenderToDelete) {
      try {
        await deleteTender(tenderToDelete);
        setTenders(tenders.filter(tender => tender.id !== tenderToDelete));
        setTenderToDelete(null);
      } catch (error) {
        console.error('Failed to delete tender:', error);
      }
    }
  };

  const columns: Column<Tender>[] = [
    {
      header: "Tender Number",
      accessor: "tenderNumber",
    },
    {
      header: "Due Date",
      accessor: (row) => format(new Date(row.dueDate), 'dd MMM yyyy'),
    },
    {
      header: "Description",
      accessor: "description",
    },
    {
      header: "EMD Required",
      accessor: (row) => row.hasEMD ? 'Yes' : 'No',
    },
    {
      header: ({ sortable }) => (
        <div className="flex items-center">
          EMD Amount
          {sortable && (
            <Button variant="ghost" className="ml-2 h-8 w-8 p-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      accessor: (row) => 
        row.hasEMD && row.emdAmount 
          ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(row.emdAmount)
          : '-'
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "EMD Status",
      accessor: (row) => row.hasEMD ? getEMDReturnStatusBadge(row.emdReturnStatus) : '-',
    },
    {
      header: "Actions",
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/tenders/${row.id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/tenders/${row.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filteredTenders = useMemo(() => {
    if (!Array.isArray(tenders)) return [];
    
    return tenders.filter((tender) => {
      const matchesSearch = searchQuery === '' ||
        tender.tenderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tender.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || tender.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tenders, searchQuery, statusFilter]);

  // Calculate pagination values
  const totalItems = filteredTenders.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = filteredTenders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-8">
          <div className="flex gap-6 flex-1">
            <Input
              placeholder="Search by tender number or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="RETENDERED">Retendered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="AWARDED">Awarded</SelectItem>
                <SelectItem value="NOT_AWARDED">Not Awarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/tenders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tender
          </Button>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={currentItems}
            onRowClick={(row) => navigate(`/tenders/${row.id}`)}
            emptyMessage="No tenders found"
          />
          
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  
                  // Show first page, last page, and pages around current page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // Show ellipsis for gaps
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <AlertDialog open={!!tenderToDelete} onOpenChange={(open: boolean) => !open && setTenderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tender.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 