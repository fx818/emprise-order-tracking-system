import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  MoreHorizontal,
  CheckCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  // DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";
import {
  Card
} from "../../../components/ui/card";
import { Column, DataTable } from "../../../components/data-display/DataTable";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import type { LOA } from "../types/loa";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import { calculateDaysFromNowIST } from "../../../lib/utils/date";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "../../../components/ui/pagination";
import { useLOAs } from "../hooks/use-loas";
const statusOptions = [
  { label: "All Status", value: "ALL" },
  { label: "1. Not Started", value: "NOT_STARTED" },
  { label: "2. In Progress", value: "IN_PROGRESS" },
  { label: "3. Supply/Work Delayed", value: "SUPPLY_WORK_DELAYED" },
  { label: "4. Supply/Work Completed", value: "SUPPLY_WORK_COMPLETED" },
  { label: "5. Application Pending", value: "APPLICATION_PENDING" },
  { label: "6. Upload Bill", value: "UPLOAD_BILL" },
  { label: "7. Chase Payment", value: "CHASE_PAYMENT" },
  { label: "8. Retrieve EMD/Security", value: "RETRIEVE_EMD_SECURITY" },
  { label: "9. Closed", value: "CLOSED" },
];

interface LOAListProps {
  // No props needed anymore
}

export function LOAList(_props: LOAListProps = {}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loaTypeFilter, setLoaTypeFilter] = useState<string>("active"); // active, completed, overdue

  const [loas, setLOAs] = useState<LOA[]>([]);
  const { loading, getLOAs, deleteLOA, updateLOA } = useLOAs();
  const [error, setError] = useState<string | null>(null);
  const [loaToDelete, setLoaToDelete] = useState<LOA | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  // @ts-expect-error - totalItems is used for tracking, will be displayed in future updates
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchLOAs = async () => {
      try {
        // Determine which status to filter by based on LOA type
        let effectiveStatus: string | undefined;

        if (loaTypeFilter === "completed") {
          effectiveStatus = "CLOSED";
        } else if (loaTypeFilter === "active") {
          effectiveStatus = "ACTIVE";
        } else if (loaTypeFilter === "overdue") {
          // For overdue, we'll fetch ALL active LOAs and filter on frontend
          effectiveStatus = "ACTIVE";
        } else if (statusFilter && statusFilter !== "all") {
          effectiveStatus = statusFilter;
        }

        // For active/overdue filters, fetch all LOAs (large limit) to filter on frontend
        const fetchParams = (loaTypeFilter === "overdue" || loaTypeFilter === "active") ? {
          page: 1,
          limit: 10000, // Fetch all active LOAs
          search: searchQuery || undefined,
          status: effectiveStatus,
          sortBy,
          sortOrder
        } : {
          page: currentPage,
          limit: pageSize,
          search: searchQuery || undefined,
          status: effectiveStatus,
          sortBy,
          sortOrder
        };

        const data = await getLOAs(fetchParams);

        let filteredLoas = data.loas || [];

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison

        // If active filter is selected, show only LOAs with positive days to due date (not overdue)
        if (loaTypeFilter === "active") {
          filteredLoas = filteredLoas.filter((loa: LOA) => {
            if (!loa.dueDate) return true; // Include LOAs without due date
            const dueDate = new Date(loa.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate >= now; // Include today and future dates
          });

          // Apply pagination on the filtered results
          const totalFiltered = filteredLoas.length;
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          filteredLoas = filteredLoas.slice(startIndex, endIndex);

          setTotalItems(totalFiltered);
          setTotalPages(Math.ceil(totalFiltered / pageSize));
        }
        // If overdue filter is selected, filter LOAs with due dates in the past
        else if (loaTypeFilter === "overdue") {
          filteredLoas = filteredLoas.filter((loa: LOA) => {
            if (!loa.dueDate) return false;
            const dueDate = new Date(loa.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < now;
          });

          // Apply pagination on the filtered results
          const totalFiltered = filteredLoas.length;
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          filteredLoas = filteredLoas.slice(startIndex, endIndex);

          setTotalItems(totalFiltered);
          setTotalPages(Math.ceil(totalFiltered / pageSize));
        } else {
          setTotalItems(data.total || 0);
          setTotalPages(data.totalPages || 0);
        }

        setLOAs(filteredLoas);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch LOAs:", error);
        setError('Failed to fetch LOAs. Please try again.');
        setLOAs([]);
      }
    };

    fetchLOAs();
  }, [currentPage, pageSize, searchQuery, statusFilter, loaTypeFilter, sortBy, sortOrder]);

  const handleDeleteClick = async (loa: LOA) => {
    try {
      await deleteLOA(loa.id);
      const data = await getLOAs({
        page: currentPage,
        limit: pageSize
      });
      setLOAs(data.loas || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Error deleting LOA:', error);
    }
  };

  const handleMarkCompleted = async (loaId: string) => {
    try {
      await updateLOA(loaId, { status: 'CLOSED' });

      // Determine which status to filter by for refresh
      let effectiveStatus: string | undefined;

      if (loaTypeFilter === "completed") {
        effectiveStatus = "CLOSED";
      } else if (loaTypeFilter === "active" || loaTypeFilter === "overdue") {
        effectiveStatus = "ACTIVE";
      } else if (statusFilter && statusFilter !== "all") {
        effectiveStatus = statusFilter;
      }

      // Refresh the list
      const data = await getLOAs({
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        status: effectiveStatus,
        sortBy,
        sortOrder
      });

      let filteredLoas = data.loas || [];

      // If overdue filter is selected, filter LOAs with due dates in the past
      if (loaTypeFilter === "overdue") {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        filteredLoas = filteredLoas.filter((loa: LOA) => {
          if (!loa.dueDate) return false;
          const dueDate = new Date(loa.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < now;
        });
      }

      setLOAs(filteredLoas);
      setTotalItems(loaTypeFilter === "overdue" ? filteredLoas.length : (data.total || 0));
      setTotalPages(loaTypeFilter === "overdue" ? Math.ceil(filteredLoas.length / pageSize) : (data.totalPages || 0));
    } catch (error) {
      console.error('Error marking LOA as completed:', error);
      setError('Failed to mark LOA as completed. Please try again.');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Helper function to get status badge style
  const getStatusBadgeStyle = (status: LOA['status']) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'SUPPLY_WORK_DELAYED':
        return 'bg-orange-100 text-orange-800';
      case 'SUPPLY_WORK_COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'APPLICATION_PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'UPLOAD_BILL':
        return 'bg-cyan-100 text-cyan-800';
      case 'CHASE_PAYMENT':
        return 'bg-amber-100 text-amber-800';
      case 'RETRIEVE_EMD_SECURITY':
        return 'bg-indigo-100 text-indigo-800';
      case 'CLOSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to display readable status text
  const getStatusDisplayText = (status: LOA['status']) => {
    switch (status) {
      case 'NOT_STARTED':
        return '1. Not Started';
      case 'IN_PROGRESS':
        return '2. In Progress';
      case 'SUPPLY_WORK_DELAYED':
        return '3. Supply/Work Delayed';
      case 'SUPPLY_WORK_COMPLETED':
        return '4. Supply/Work Completed';
      case 'APPLICATION_PENDING':
        return '5. Application Pending';
      case 'UPLOAD_BILL':
        return '6. Upload Bill';
      case 'CHASE_PAYMENT':
        return '7. Chase Payment';
      case 'RETRIEVE_EMD_SECURITY':
        return '8. Retrieve EMD/Security';
      case 'CLOSED':
        return '9. Closed';
      default:
        return status;
    }
  };

  const columns: Column<LOA>[] = [
    {
      header: "Sr. No.",
      accessor: (_row: LOA, index?: number) => {
        return (currentPage - 1) * pageSize + (index || 0) + 1;
      },
    },
    {
      header: "Order Status",
      accessor: (row: LOA) => (
        <Badge className={cn("px-2 py-1", getStatusBadgeStyle(row.status))}>
          {getStatusDisplayText(row.status)}
        </Badge>
      ),
    },
    {
      header: "Days to Due Date",
      accessor: (row: LOA) => {
        // If LOA is completed/closed, show "Completed"
        if (row.status === 'CLOSED') {
          return <span className="text-muted-foreground">Completed</span>;
        }

        // If no due date, show "-"
        if (!row.dueDate) {
          return <span>-</span>;
        }

        // Calculate days from today (IST) to due date
        const calculatedDays = calculateDaysFromNowIST(row.dueDate);

        if (calculatedDays === null) {
          return <span>-</span>;
        }

        // Color code based on days remaining
        if (calculatedDays < 0) {
          return (
            <span className="text-red-600 font-semibold">
              Overdue ({Math.abs(calculatedDays)} days)
            </span>
          );
        } else if (calculatedDays === 0) {
          return <span className="text-orange-600 font-semibold">Due Today</span>;
        } else if (calculatedDays <= 7) {
          return <span className="text-yellow-600 font-semibold">{calculatedDays} days</span>;
        } else {
          return <span className="text-green-600">{calculatedDays} days</span>;
        }
      },
    },
    {
      header: "Order Due Date",
      accessor: (row: LOA) => row.dueDate ? format(new Date(row.dueDate), "PP") : "-",
    },
    {
      header: "Order Received Date",
      accessor: (row: LOA) => row.orderReceivedDate ? format(new Date(row.orderReceivedDate), "PP") : "-",
    },
    {
      header: "Order Value",
      accessor: (row: LOA) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.loaValue),
    },
    {
      header: "PO/LOA Number",
      accessor: "loaNumber",
    },
    {
      header: "Site",
      accessor: (row: LOA) => row.site?.name || "-",
    },
    {
      header: "Description of Work",
      accessor: (row: LOA) => (
        <div className="max-w-xs truncate" title={row.workDescription}>
          {row.workDescription}
        </div>
      ),
    },
    {
      header: "EMD",
      accessor: (row: LOA) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.emdAmount || 0),
    },
    {
      header: "Security Deposit",
      accessor: (row: LOA) => row.hasSd ? (row.sdFdr ?
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.sdFdr.depositAmount || 0) : "Yes") : "-",
    },
    {
      header: "Tender No.",
      accessor: (row: LOA) => (
        <div className="max-w-xs truncate" title={row.tenderNo || undefined}>
          {row.tenderNo || "-"}
        </div>
      ),
    },
    {
      header: "Order POC",
      accessor: (row: LOA) => (
        <div className="max-w-xs truncate" title={row.poc?.name || undefined}>
          {row.poc?.name || "-"}
        </div>
      ),
    },
    {
      header: "Remarks",
      accessor: (row: LOA) => (
        <div className="max-w-xs truncate" title={row.remarks || undefined}>
          {row.remarks || "-"}
        </div>
      ),
    },
    {
      header: "Last Invoice Amount",
      accessor: (row: LOA) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.invoices?.[0]?.invoiceAmount || 0),
    },
    {
      header: "Actual Amount Received",
      accessor: (row: LOA) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.totalReceived || 0),
    },
    {
      header: "Amount Pending",
      accessor: (row: LOA) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.totalPending || 0),
    },
    {
      header: "Actions",
      accessor: (row: LOA) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/loas/${row.id}`)}>
              View Details
            </DropdownMenuItem>
            {row.status !== 'CLOSED' && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkCompleted(row.id);
                }}
                className="text-green-600"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Completed
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setLoaTypeFilter("all");
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <p>{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Input
                placeholder="Search LOA number, site, work..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={loaTypeFilter}
                onValueChange={setLoaTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All LOAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LOAs</SelectItem>
                  <SelectItem value="active">Active LOAs</SelectItem>
                  <SelectItem value="completed">Completed LOAs</SelectItem>
                  <SelectItem value="overdue">Overdue LOAs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.slice(1).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Date (Newest)</SelectItem>
                  <SelectItem value="createdAt-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="loaValue-desc">Value (High to Low)</SelectItem>
                  <SelectItem value="loaValue-asc">Value (Low to High)</SelectItem>
                  <SelectItem value="dueDate-asc">Due Date (Increasing)</SelectItem>
                  <SelectItem value="dueDate-desc">Due Date (Decreasing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button onClick={() => navigate("/loas/new")} className="flex-1">
                Create New
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* LOA Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {loas.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No LOAs found
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={loas}
                onRowClick={(row) => navigate(`/loas/${row.id}`)}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }}
                      />
                    </PaginationItem>

                    {/* First Page */}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(1);
                        }}
                        isActive={currentPage === 1}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>

                    {/* Show ellipsis if there are many pages before current */}
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Pages around current page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page !== 1 && page !== totalPages && Math.abs(currentPage - page) <= 1)
                      .map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page);
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                    {/* Show ellipsis if there are many pages after current */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Last Page */}
                    {totalPages > 1 && (
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(totalPages);
                          }}
                          isActive={currentPage === totalPages}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) handlePageChange(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!loaToDelete} onOpenChange={() => setLoaToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete LOA</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete LOA {loaToDelete?.loaNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoaToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (loaToDelete) {
                  handleDeleteClick(loaToDelete);
                  setLoaToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
