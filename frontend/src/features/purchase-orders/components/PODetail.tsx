// src/features/purchase-orders/components/PODetail.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  FileText,
  Building,
  FileCheck,
  Package,
  Truck,
  AlertTriangle,
  Loader2,
  Edit,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { useToast } from "../../../hooks/use-toast-app";
import { usePurchaseOrders } from "../hooks/use-purchase-orders";
import type { PurchaseOrder } from "../types/purchase-order";
import { StatusBadge } from "../../../components/data-display/StatusBadge";
import { getUser } from "../../../lib/utils/auth";

export function PODetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { submitForApproval, markAsCompleted, getPurchaseOrder, deletePurchaseOrder } = usePurchaseOrders();
  const currentUser = getUser();

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        if (!id) {
          throw new Error("No order ID provided");
        }
        const orderData = await getPurchaseOrder(id);
        setOrder(orderData);
      } catch (error) {
        showError("Failed to fetch order details");
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Purchase order not found</AlertDescription>
      </Alert>
    );
  }

  // Calculate totals for all items
  const calculateTotals = (order: PurchaseOrder) => {
    const subtotal = order.items.reduce((acc, item) => {
      return acc + (item.quantity * item.unitPrice);
    }, 0);

    const additionalChargesTotal = order.additionalCharges.reduce((acc, charge) => {
      return acc + charge.amount;
    }, 0);

    return {
      subtotal,
      taxAmount: order.taxAmount,
      additionalCharges: additionalChargesTotal,
      total: subtotal + order.taxAmount + additionalChargesTotal
    };
  };

  const totals = calculateTotals(order);

  const formatCurrency = (value: number): string => {
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  const handleStatusChange = async (action: "submit" | "complete") => {
    if (!id) {
      showError("Invalid Order ID");
      return;
    }

    try {
      setSubmitting(true);

      if (action === "submit") {
        await submitForApproval(id);

        showSuccess(
          currentUser?.role === "ADMIN"
            ? "Purchase order has been auto-approved"
            : "Purchase order submitted for approval successfully"
        );
      } else {
        await markAsCompleted(id);
        showSuccess("Purchase order marked as completed");
      }

      // Refresh order
      const updatedOrder = await getPurchaseOrder(id);
      setOrder(updatedOrder);

    } catch (err: unknown) {
      console.error(`❌ Failed to ${action} order`, err);

      // Normalize error
      let message = "Unexpected error occurred";

      if (typeof err === "string") {
        message = err;
      } else if (err instanceof Error) {
        message = err.message;
      }
      // Axios / Fetch standard
      else if ((err as any)?.response?.data?.message) {
        message = (err as any).response.data.message;
      }
      else if ((err as any)?.message) {
        message = (err as any).message;
      }

      showError(message);

    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          <StatusBadge status={order?.status || 'DRAFT'} />
        </div>
        <div className="flex space-x-4">

          {order?.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/purchase-orders/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </Button>

              <Button
                onClick={() => handleStatusChange("submit")}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {currentUser?.role === 'ADMIN' ? 'Auto-approving...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {currentUser?.role === 'ADMIN' ? 'Submit & Auto-approve' : 'Submit for Approval'}
                  </>
                )}
              </Button>

              {/* 🗑️ Delete Button for DRAFT only */}
              <Button
                variant="destructive"
                disabled={submitting}
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to permanently delete this purchase order?"
                  );
                  if (!confirmed) return;

                  try {
                    await deletePurchaseOrder(id!);
                    navigate("/purchase-orders");
                  } catch (err) {
                    console.error("Delete error:", err);
                  }
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}

          {order?.status === "APPROVED" && (
            <Button
              onClick={() => handleStatusChange("complete")}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </>
              )}
            </Button>
          )}
        </div>

      </div>

      {/* Add info message for admin users with draft orders */}
      {currentUser?.role === 'ADMIN' && order?.status === 'DRAFT' && (
        <Alert className="bg-blue-50 border-blue-100">
          <Info className="h-4 w-4" />
          <AlertDescription>
            As an admin, submitting this purchase order will automatically approve it.
          </AlertDescription>
        </Alert>
      )}

      {/* Status warnings for specific states */}
      {order.status === "PENDING_APPROVAL" && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This order is awaiting approval. You will be notified once it has been reviewed.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendor Information
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.vendor.name}</div>
            <p className="text-xs text-muted-foreground">{order.vendor.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              LOA Reference
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.loa.loaNumber}</div>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate(`/loas/${order.loa.id}`)}
            >
              View LOA Details
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Order Total
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Including {order.items.length} items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                List of items included in this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="font-medium">{item.item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.item.description}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Quantity
                            </div>
                            <div>
                              {item.quantity} {item.item.uom}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Unit Price
                            </div>
                            <div>
                              {formatCurrency(item.unitPrice)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Total
                            </div>
                            <div>
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </div>
                          </div>
                          {/* <div>
                            <div className="text-sm text-muted-foreground">
                              Tax Rates
                            </div>
                            <div className="text-sm">
                              {item.item.taxRates.igst > 0 && (
                                <div>IGST: {item.item.taxRates.igst}%</div>
                              )}
                              {item.item.taxRates.sgst > 0 && (
                                <div>SGST: {item.item.taxRates.sgst}%</div>
                              )}
                              {item.item.taxRates.ugst > 0 && (
                                <div>UGST: {item.item.taxRates.ugst}%</div>
                              )}
                            </div>
                          </div> */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Order Totals */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax Amount</span>
                      <span>{formatCurrency(totals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Additional information and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Requirement Description
                </h3>
                <p className="mt-1 whitespace-pre-wrap">{order.requirementDesc}</p>
              </div>

              {order.termsConditions && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Terms and Conditions
                  </h3>
                  <div
                    className="mt-1 prose prose-sm max-w-none [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mt-2"
                    dangerouslySetInnerHTML={{
                      __html: order.termsConditions
                    }}
                  />
                </div>
              )}

              {order.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Notes
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              {/* Order Totals Section with Additional Charges */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Order Summary</h3>

                <table className="w-full">
                  <tbody>
                    <tr className="text-sm">
                      <td className="text-muted-foreground py-2">Subtotal(Items)</td>
                      <td className="text-right">{formatCurrency(totals.subtotal)}</td>
                    </tr>

                    {order.additionalCharges.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="pt-4 pb-2">
                            <h4 className="text-sm text-muted-foreground">Additional Charges:</h4>
                          </td>
                        </tr>
                        {order.additionalCharges.map((charge, index) => (
                          <tr key={index} className="text-sm">
                            <td className="text-muted-foreground py-1 pl-4">{charge.description}</td>
                            <td className="text-right">{formatCurrency(charge.amount)}</td>
                          </tr>
                        ))}
                        <tr className="text-sm font-medium">
                          <td className="text-muted-foreground py-2 pl-4">Total Additional Charges</td>
                          <td className="text-right">{formatCurrency(totals.additionalCharges)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="text-sm">
                      <td className="text-muted-foreground py-2">Tax Amount</td>
                      <td className="text-right">{formatCurrency(totals.taxAmount)}</td>
                    </tr>

                    <tr className="text-lg font-medium border-t">
                      <td className="pt-4">Total Amount</td>
                      <td className="text-right pt-4">{formatCurrency(totals.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Vendor Information Section */}
              <div className="border-t pt-4">
                <div className="flex items-start space-x-4">
                  <Building className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <h3 className="font-medium">Vendor Information</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {order.vendor.name}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {order.vendor.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Information */}
              {order.site && (
                <div className="border-t pt-4">
                  <div className="flex items-start space-x-4">
                    <Package className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <h3 className="font-medium">Site Information</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Name:</span>{" "}
                          {order.site.name}
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Code:</span>{" "}
                          {order.site.code}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Creation and Update Information */}
              <div className="border-t pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Created
                    </h3>
                    <p className="mt-1">
                      {format(new Date(order.createdAt), "PPP")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </h3>
                    <p className="mt-1">
                      {format(new Date(order.updatedAt), "PPP")}
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
              <CardDescription>
                Delivery details and shipping address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-4">
                <Truck className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <h3 className="font-medium">Shipping Address</h3>
                  <p className="mt-1 whitespace-pre-wrap">
                    {order.shipToAddress}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Related Documents</CardTitle>
              <CardDescription>
                Access order documentation and related files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* ALWAYS SHOW Document Section */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Purchase Order Document</div>

                    {order.documentUrl ? (
                      <div className="text-sm text-muted-foreground">
                        Generated on {format(new Date(order.updatedAt), "PPP")}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        Document will be available after approval.
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex space-x-2">

                  {/* VIEW DOCUMENT */}
                  <Button
                    variant="outline"
                    disabled={!order.documentUrl}
                    onClick={() =>
                      order.documentUrl && window.open(order.documentUrl, "_blank")
                    }
                  >
                    {order.documentUrl ? "View Document" : "Not Available"}
                  </Button>

                  {/* EDIT DOCUMENT */}
                  <Button
                    variant="outline"
                    disabled={!order.documentUrl}
                    onClick={() => navigate(`/purchase-orders/${order.id}/edit-documents`)}
                  >
                    Edit Document
                  </Button>


                </div>
              </div>


              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileCheck className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Associated LOA</div>
                    <div className="text-sm text-muted-foreground">
                      LOA Number: {order.loa.loaNumber}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">


                  <Button
                    variant="outline"
                    onClick={() => navigate(`/loas/${order.loa.id}`)}
                  >
                    LOA Details
                  </Button>
                </div>
              </div>

              {/* 
              <div className="space-y-4">
              
                {order.documentUrl ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Purchase Order Document</div>
                        <div className="text-sm text-muted-foreground">
                          Generated on {format(new Date(order.updatedAt), "PPP")}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => order.documentUrl && window.open(order.documentUrl, '_blank')}
                    >
                      View Document
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Purchase order document will be generated after submission for approval.
                    </AlertDescription>
                  </Alert>
                )}

                
                {order.loa.documentUrl && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileCheck className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Associated LOA</div>
                        <div className="text-sm text-muted-foreground">
                          LOA Number: {order.loa.loaNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => order.loa.documentUrl && window.open(order.loa.documentUrl, '_blank')}
                      >
                        View LOA
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/loas/${order.loa.id}`)}
                      >
                        LOA Details
                      </Button>
                    </div>
                  </div>
                )}
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}