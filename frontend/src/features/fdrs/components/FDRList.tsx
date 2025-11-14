import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  ArrowUpDown,
  MoreHorizontal,
  FileText,
  AlertTriangle,
  Upload,
  RefreshCw,
  XCircle,
  Pencil,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Column, DataTable } from "../../../components/data-display/DataTable";
import { Card } from "../../../components/ui/card";
import type { FDR } from "../types/fdr";
import apiClient from "../../../lib/utils/api-client";
import { ExpiryNotification } from "./ExpiryNotification";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
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
import { BulkImportFDR } from "./BulkImportFDR";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Running", value: "RUNNING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Returned", value: "RETURNED" },
];

const categoryOptions = [
  { label: "All Categories", value: "all" },
  { label: "FD", value: "FD" },
  { label: "BG", value: "BG" },
];

const maturityOptions = [
  { label: "All", value: "all" },
  { label: "Next 30 Days", value: "30" },
  { label: "Next 60 Days", value: "60" },
  { label: "Next 90 Days", value: "90" },
];

export function FDRList() {
  const navigate = useNavigate();
  const [searchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [maturityFilter, setMaturityFilter] = useState("all");
  const [fdrs, setFDRs] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  /**
   * Fetch FDRs from API with full error handling
   */
  const fetchFDRs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/fdrs", {
        params: {
          limit: 10000,
          page: 1,
        },
      });

      const data = response?.data?.data?.data;
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format received from server");
      }

      setFDRs(data);
    } catch (err: any) {
      console.error("Failed to fetch FDRs:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to load FDR records. Please try again later.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDRs();
  }, []);

  /**
   * Define columns for the data table
   */
  const columns: Column<FDR>[] = [
    {
      header: "S.No.",
      accessor: (_row: FDR, index?: number) => {
        const serialNumber = (currentPage - 1) * pageSize + (index || 0) + 1;
        return <span className="font-medium">{serialNumber}</span>;
      },
    },
    {
      header: "Category",
      accessor: (row: FDR) => (
        <span className="font-medium">{row.category}</span>
      ),
    },
    { header: "Bank Name", accessor: "bankName" },
    { header: "FDR Number", accessor: (row: FDR) => row.fdrNumber || "-" },
    { header: "Account Name", accessor: (row: FDR) => row.accountName || "-" },
    {
      header: ({ sortable }) => (
        <div className="flex items-center">
          Deposit Amount
          {sortable && (
            <Button variant="ghost" className="ml-2 h-8 w-8 p-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      accessor: (row: FDR) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.depositAmount),
    },
    {
      header: "Date of Deposit",
      accessor: (row: FDR) => format(new Date(row.dateOfDeposit), "PP"),
    },
    {
      header: "Maturity Date",
      accessor: (row: FDR) => {
        if (!row.maturityDate) return "-";
        const maturityDate = new Date(row.maturityDate);
        const daysUntilMaturity = differenceInDays(maturityDate, new Date());
        return (
          <div className="flex items-center">
            <span>{format(maturityDate, "PP")}</span>
            {daysUntilMaturity <= 30 && daysUntilMaturity > 0 && (
              <AlertTriangle className="ml-2 h-4 w-4 text-yellow-500" />
            )}
          </div>
        );
      },
    },
    { header: "POC", accessor: (row: FDR) => row.poc || "-" },
    { header: "Location", accessor: (row: FDR) => row.location || "-" },
    {
      header: "Status",
      accessor: (row: FDR) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: (row: FDR) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/fdrs/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/fdrs/${row.id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  /**
   * Filter FDRs based on filters
   */
  const filteredFDRs = Array.isArray(fdrs)
    ? fdrs.filter((fdr) => {
        const matchesSearch =
          searchTerm === "" ||
          fdr.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (fdr.fdrNumber &&
            fdr.fdrNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (fdr.location &&
            fdr.location.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus =
          statusFilter === "all" || fdr.status === statusFilter;
        const matchesCategory =
          categoryFilter === "all" || fdr.category === categoryFilter;

        const matchesMaturity = () => {
          if (maturityFilter === "all") return true;
          if (!fdr.maturityDate) return false;
          const daysUntilMaturity = differenceInDays(
            new Date(fdr.maturityDate),
            new Date()
          );
          return daysUntilMaturity <= parseInt(maturityFilter);
        };

        return matchesSearch && matchesStatus && matchesCategory && matchesMaturity();
      })
    : [];

  // Pagination calculations
  const totalItems = filteredFDRs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = filteredFDRs.slice(startIndex, endIndex);

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Bulk import success handler
  const handleBulkImportSuccess = () => {
    setBulkImportOpen(false);
    fetchFDRs();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Maturity Filter */}
          <Select value={maturityFilter} onValueChange={setMaturityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by maturity" />
            </SelectTrigger>
            <SelectContent>
              {maturityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Import FDRs</DialogTitle>
                </DialogHeader>
                <BulkImportFDR onSuccess={handleBulkImportSuccess} />
              </DialogContent>
            </Dialog>

            <Button onClick={() => navigate("/fdrs/new")}>
              Create New FDR
            </Button>
          </div>
        </div>
      </Card>

      {/* Expiry Notifications */}
      <ExpiryNotification fdrs={fdrs} />

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFDRs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* FDR Table */}
      {!loading && !error && (
        <div className="space-y-4">
          {totalItems > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                {totalItems} FDR{totalItems !== 1 ? "s" : ""}
              </div>

              <DataTable
                columns={columns}
                data={currentItems}
                onRowClick={(row) => navigate(`/fdrs/${row.id}`)}
              />

              {totalItems > pageSize && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1)
                            handlePageChange(currentPage - 1);
                        }}
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, idx) => {
                      const page = idx + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(currentPage - page) <= 1
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(page);
                              }}
                              isActive={page === currentPage}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      if (
                        page === 2 ||
                        page === totalPages - 1
                      ) {
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
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages)
                            handlePageChange(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-gray-500 border rounded-md">
              No FDR records found matching your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
