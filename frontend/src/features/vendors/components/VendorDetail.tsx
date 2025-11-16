// src/features/vendors/components/VendorDetail.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building,
  Package,
  Mail,
  Phone,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useToast } from "../../../hooks/use-toast-app";
import type { Vendor } from "../types/vendor";
import apiClient from "../../../lib/utils/api-client";
import { DataTable } from "../../../components/data-display/DataTable";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";

import { useVendors } from "../hooks/use-vendors";



export function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const { deleteVendor } = useVendors();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteVendor = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteVendor(id);
      setIsDeleteDialogOpen(false);
      navigate("/vendors");
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    } finally {
      setIsDeleting(false);
    }
  };


  // Fetch vendor data and related information
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/vendors/${id}`);
        setVendor(response.data.data.data);
      } catch (error) {
        showError("Failed to fetch vendor details");
        console.error("Error fetching vendor data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVendorData();
    }
  }, [id]);

  if (loading || !vendor) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{vendor?.name}</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => navigate(`/vendors/${id}/items`)}
            variant="outline"
          >
            <Package className="h-4 w-4 mr-2" />
            Manage Items
          </Button>
          <Button
            onClick={() => navigate(`/vendors/${id}/edit`)}
          >
            Edit Vendor
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Vendor Information Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{vendor.name}</h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  {vendor.email}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  {vendor.mobile}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building className="h-4 w-4 mr-2" />
                  {vendor.address}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Registered since
              </div>
              <div className="font-medium">
                {format(new Date(vendor.createdAt), "PP")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items & Pricing</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="details">Vendor Details</TabsTrigger>
        </TabsList>

        {/* Items & Pricing Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Associated Items</CardTitle>
                  <CardDescription>
                    Items and their pricing information
                  </CardDescription>
                </div>
                {/* <Button onClick={() => navigate(`/vendors/${id}/items/add`)}>
                  Add New Item
                </Button> */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {vendor.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{item.item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Last updated: {format(new Date(item.updatedAt), "PP")}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-medium">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                          }).format(item.unitPrice)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/items/${item.itemId}`)}
                      >
                        View Details
                      </Button>
                      {/* */}
                    </div>
                  </div>
                ))}

                {vendor.items.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    No items associated with this vendor yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order History</CardTitle>
              <CardDescription>
                Complete history of purchase orders with this vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    header: "PO Number",
                    accessor: (row) => row.poNumber,
                  },
                  {
                    header: "Created Date",
                    accessor: (row) => format(new Date(row.createdAt), "PP"),
                  },
                  {
                    header: "Status",
                    accessor: (row) => (
                      <Badge
                        variant={
                          row.status === 'COMPLETED'
                            ? 'default'
                            : row.status === 'CANCELLED'
                              ? 'destructive'
                              : 'default'
                        }
                      >
                        {row.status}
                      </Badge>
                    ),
                  },
                  {
                    header: "Actions",
                    accessor: (row) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/purchase-orders/${row.id}`)}
                      >
                        View Order
                      </Button>
                    ),
                  },
                ]}
                data={vendor.purchaseOrders}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tax Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">GST Number</div>
                  <div className="mt-1">{vendor.gstin || 'Not provided'}</div>
                </div>
              </CardContent>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Remarks</div>
                  <div className="mt-1">{vendor.remarks || 'Not provided'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Account Name</div>
                  <div className="mt-1">{vendor.bankDetails.accountName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Account Number</div>
                  <div className="mt-1">{vendor.bankDetails.accountNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Bank & Branch</div>
                  <div className="mt-1">
                    {vendor.bankDetails.bankName} - {vendor.bankDetails.branchName}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">IFSC Code</div>
                  <div className="mt-1">{vendor.bankDetails.ifscCode}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 max-w-sm w-full">
            <h2 className="font-semibold text-lg">Delete Vendor?</h2>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All vendor-related data will remain linked historically.
            </p>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteVendor}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}