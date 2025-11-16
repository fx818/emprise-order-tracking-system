// src/features/items/components/ItemDetail.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building,
  Package,
  ShoppingCart,
  BarChart3,
  Edit,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { DataTable } from "../../../components/data-display/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../hooks/use-toast-app";
import { useItems } from "../hooks/use-items";
import type { Item, ItemVendor } from "../types/item";
import { PriceHistory } from "../../../components/data-display/PriceHistory";
import apiClient from "../../../lib/utils/api-client";

interface PriceHistoryData {
  currentPrice: number;
  priceHistory: Array<{
    purchaseDate: string;
    poNumber: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    status: string;
  }>;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<ItemVendor | null>(null);
  const [newVendorPrice, setNewVendorPrice] = useState<string>("");
  const { getItem, updateVendor, removeVendor, deleteItem } = useItems();
  const fetchedRef = useRef(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vendorPriceHistories, setVendorPriceHistories] = useState<Record<string, PriceHistoryData>>({});
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    async function loadItem() {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await getItem(id);
        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
        showError("Failed to fetch item details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchedRef.current = true;
    loadItem();
  }, [id, getItem, showError]);

  useEffect(() => {
    const fetchAllVendorsPriceHistory = async () => {
      if (!item?.id || !item.vendors.length) return;

      try {
        const histories = await Promise.all(
          item.vendors.map(async (vendor) => {
            const response = await apiClient.get(`/items/${item.id}/price-history?vendorId=${vendor.vendor.id}`);
            return { vendorId: vendor.vendor.id, data: response.data.data };
          })
        );

        const historyMap = histories.reduce((acc, { vendorId, data }) => ({
          ...acc,
          [vendorId]: data
        }), {});

        setVendorPriceHistories(historyMap);
      } catch (error) {
        console.error('Error fetching price histories:', error);
        showError("Failed to fetch price histories");
      }
    };

    fetchAllVendorsPriceHistory();
  }, [item?.id, item?.vendors]);

  const handleUpdateVendorPrice = async () => {
    if (!item || !selectedVendor) return;

    try {
      setIsUpdatingPrice(true);
      await updateVendor(item.id, selectedVendor.vendor.id, {
        unitPrice: parseFloat(newVendorPrice),
      });
      const updatedItem = await getItem(item.id);
      setItem(updatedItem);
      setSelectedVendor(null);
      setNewVendorPrice("");
    } catch (error) {
      showError("Failed to update vendor price");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleRemoveVendor = async (vendorId: string) => {
    if (!item) return;

    try {
      setIsLoading(true);
      await removeVendor(item.id, vendorId);
      const updatedItem = await getItem(item.id);
      setItem(updatedItem);
    } catch (error) {
      showError("Failed to remove vendor");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteItem = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const success = await deleteItem(id);

      if (success) {
        // deleteItem already shows a success toast
        setShowDeleteDialog(false);
        navigate("/items", { replace: true });
        return;
      }

      // deleteItem returned false → It already showed an error toast.
      // No need to show additional toasts.

    } catch (error: any) {
      console.error("Delete error:", error);

      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete item";

      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!item) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Item not found</AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (value: number): string => {
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Calculate key metrics
  const totalOrders = item.vendors.length;
  const totalQuantity = item.vendors.length > 0
    ? item.vendors.reduce((sum, vendor) => sum + vendor.unitPrice, 0)
    : 0;
  const averagePrice = item.vendors.length > 0
    ? item.vendors.reduce((sum, vendor) => sum + vendor.unitPrice, 0) / totalOrders
    : 0;

  const vendorColumns = [
    {
      header: "Vendor Name",
      accessor: (row: ItemVendor) => row.vendor.name,
    },
    {
      header: "Unit Price",
      accessor: (row: ItemVendor) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(row.unitPrice),
    },
    // {
    //   header: "Last Updated",
    //   accessor: (row: ItemVendor) => format(new Date(row.vendor.updatedAt), "PP"),
    // },
    {
      header: "Actions",
      accessor: (row: ItemVendor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Package className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setSelectedVendor(row);
                setNewVendorPrice(row.unitPrice.toString());
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Update Price
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleRemoveVendor(row.vendor.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Vendor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/items")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Button>
          <Badge variant={item.status === 'ACTIVE' ? 'default' : 'outline'}>
            {item.status}
          </Badge>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/items/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Item
          </Button>
          {item.vendors.length === 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Item
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Purchase orders to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Quantity
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalQuantity.toLocaleString()} {item.uom}
            </div>
            <p className="text-xs text-muted-foreground">
              Units ordered to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Price
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averagePrice)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per {item.uom} across all orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Vendors
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.vendors.length}</div>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate(`/items/${id}/vendors`)}
            >
              View vendor details
            </button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="price-history">Price History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm">{item.name}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{item.description || "N/A"}</p>
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <p className="text-sm">
                    {item.vendors.length > 0
                      ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(item.vendors[0].unitPrice)
                      : "No vendor price available"}
                  </p>
                </div>
                <div>
                  <Label>Unit of Measurement</Label>
                  <p className="text-sm">{item.uom}</p>
                </div>
                <div>
                  <Label>HSN Code</Label>
                  <p className="text-sm">{item.hsnCode}</p>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Created At</Label>
                  <p className="text-sm">
                    {format(new Date(item.createdAt), "PPpp")}
                  </p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="text-sm">
                    {format(new Date(item.updatedAt), "PPpp")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vendor List</CardTitle>
                  <CardDescription>Manage vendor prices for this item</CardDescription>
                </div>
                {/* <Button onClick={() => navigate(`/items/${item.id}/vendors/new`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button> */}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={vendorColumns}
                data={item.vendors as ItemVendor[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price-history">
          <div className="space-y-6">
            {item.vendors.map((vendor) => (
              <Card key={vendor.vendor.id}>
                <CardHeader>
                  <CardTitle>{vendor.vendor.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {vendorPriceHistories[vendor.vendor.id] ? (
                    <PriceHistory
                      data={vendorPriceHistories[vendor.vendor.id]}
                      vendorName={vendor.vendor.name}
                    />
                  ) : (
                    <div className="text-muted-foreground">Loading price history...</div>
                  )}
                </CardContent>
              </Card>
            ))}

            {item.vendors.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground text-center">
                    No vendors found for this item
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Update Vendor Price Dialog */}
      <Dialog
        open={!!selectedVendor}
        onOpenChange={(open) => !open && setSelectedVendor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Vendor Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <p className="text-sm text-muted-foreground">
                {selectedVendor?.vendor.name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">New Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newVendorPrice}
                onChange={(e) => setNewVendorPrice(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setSelectedVendor(null)}
                disabled={isUpdatingPrice}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateVendorPrice}
                disabled={isUpdatingPrice}
              >
                {isUpdatingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingPrice ? "Updating..." : "Update Price"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the item
              and remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteItem}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? "Deleting..." : "Delete Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}