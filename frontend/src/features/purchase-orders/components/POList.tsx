// src/features/purchase-orders/components/POList.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowUpDown,
  MoreHorizontal,
  FileText,
  Send,
  CheckCircle,
  Plus,
  // Download,
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Card
} from "../../../components/ui/card";

import { Column, DataTable } from "../../../components/data-display/DataTable";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { usePurchaseOrders } from "../hooks/use-purchase-orders";
import type { PurchaseOrder } from "../types/purchase-order";
// import apiClient from "../../../lib/utils/api-client";
import { StatusBadge } from "../../../components/data-display/StatusBadge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "../../../components/ui/pagination";

export function POList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { submitForApproval, markAsCompleted, getPurchaseOrders } = usePurchaseOrders();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch initial data
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrders({
          page: currentPage,
          limit: pageSize,
          sortBy,
          sortOrder
        });
        setOrders(data.purchaseOrders || []);
      } catch (error) {
        console.error("Failed to fetch purchase orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, pageSize, sortBy, sortOrder]);

  // Handle order actions
  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitForApproval(id);
      // Refresh the order list after submission
      const data = await getPurchaseOrders({
        page: currentPage,
        limit: pageSize
      });
      setOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error("Failed to submit order for approval:", error);
    }
  };

  const handleMarkAsCompleted = async (id: string) => {
    try {
      await markAsCompleted(id);
      // Refresh the order list after completion
      const data = await getPurchaseOrders({
        page: currentPage,
        limit: pageSize
      });
      setOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error("Failed to mark order as completed:", error);
    }
  };

  // Generate Excel export of filtered orders
  // const handleExportExcel = async () => {
  //   try {
  //     const response = await apiClient.get("/purchase-orders/export", {
  //       params: {
  //         search: searchTerm,
  //         status: statusFilter,
  //       },
  //       responseType: 'blob',
  //     });

  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `purchase-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.parentNode?.removeChild(link);
  //   } catch (error) {
  //     console.error("Failed to export orders:", error);
  //   }
  // };

  // Helper function to calculate total amount for an order
  const calculateOrderTotal = (order: PurchaseOrder) => {
    const subtotal = order.items.reduce((acc, item) => {
      return acc + (item.quantity * item.unitPrice);
    }, 0);

    return subtotal + order.taxAmount;
  };

  const columns = [
    {
      header: "Sr. No.",
      accessor: (_row: PurchaseOrder, index?: number) => {
        // Calculate serial number based on current page and position
        return startIndex + (index || 0) + 1;
      },
    },
    {
      header: "PO Number",
      accessor: (row: PurchaseOrder) => row.poNumber || `PO-${row.id.slice(0, 8).toUpperCase()}`,
    },
    {
      header: "Site",
      accessor: (row: PurchaseOrder) => row.site?.name || 'N/A',
    },
    {
      header: "Vendor",
      accessor: (row: PurchaseOrder) => row.vendor.name,
    },
    {
      header: "LOA Number",
      accessor: (row: PurchaseOrder) => row.loa.loaNumber,
    },
    {
      header: ({ sortable }: { sortable: boolean }) => (
        <div className="flex items-center">
          Amount
          {sortable && (
            <Button variant="ghost" className="ml-2 h-8 w-8 p-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      accessor: (row: PurchaseOrder) => {
        const total = calculateOrderTotal(row);
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(total);
      },
    },
    {
      header: "Status",
      accessor: (row: PurchaseOrder) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      header: "Created",
      accessor: (row: PurchaseOrder) => format(new Date(row.createdAt), "PP"),
    },
    {
      header: "Actions",
      accessor: (row: PurchaseOrder) => (

        <div className="flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigate(`/purchase-orders/${row.id}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {row.status === "DRAFT" && (
                <DropdownMenuItem
                  onClick={() => handleSubmitForApproval(row.id)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </DropdownMenuItem>
              )}
              {row.status === "APPROVED" && (
                <DropdownMenuItem
                  onClick={() => handleMarkAsCompleted(row.id)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Completed
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Filter orders with type checking
  // const filteredOrders = useMemo(() => {
  //   if (!Array.isArray(orders)) return [];

  //   return orders.filter((order) => {
  //     if (!order) return false;

  //     const matchesSearch =
  //       searchTerm === "" ||
  //       order.site?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       order.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       order.loa?.loaNumber?.toLowerCase().includes(searchTerm.toLowerCase());

  //     const matchesStatus = statusFilter === "all" || order.status === statusFilter;

  //     return matchesSearch && matchesStatus;
  //   });
  // }, [orders, searchTerm, statusFilter]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter((order) => {
      if (!order) return false;

      // 1️⃣ If filter is "all", hide DELETED
      if (statusFilter === "all" && order.status === "DELETED") {
        return false;
      }

      // 2️⃣ If filter is "DELETED", show only deleted
      if (statusFilter === "DELETED" && order.status !== "DELETED") {
        return false;
      }

      // 3️⃣ Normal search filter
      const matchesSearch =
        searchTerm === "" ||
        order.site?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.loa?.loaNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      // 4️⃣ Normal status filter when not "all" or "DELETED"
      const matchesStatus =
        statusFilter === "all" ||
        statusFilter === "DELETED" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);


  // Calculate pagination values
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 p-4">
          <div className="col-span-2">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
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
                <SelectItem value="totalAmount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="totalAmount-asc">Amount (Low to High)</SelectItem>
                <SelectItem value="poNumber-asc">PO Number (A-Z)</SelectItem>
                <SelectItem value="poNumber-desc">PO Number (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex justify-end">
            <Button onClick={() => navigate('/purchase-orders/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Order
            </Button>
            {/* <Button
                variant="outline"
                className="w-full"
                onClick={handleExportExcel}
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button> */}
          </div>
        </div>
      </Card>

      {/* Purchase Orders Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns as Column<PurchaseOrder>[]}
            data={currentItems}
            loading={loading}
            onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)}
          />

          {/* Pagination */}
          {totalItems > pageSize && (
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
        </div>
      )}
    </div>
  );
}