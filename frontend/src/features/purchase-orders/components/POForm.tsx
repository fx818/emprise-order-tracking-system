// src/features/purchase-orders/components/POForm.tsx
import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent } from "../../../components/ui/card";
import { Trash2, Plus, X, Info } from "lucide-react";
import { ItemSelector } from "./ItemSelector";
import { PurchaseOrder, purchaseOrderSchema, type PurchaseOrderFormData } from "../types/purchase-order";
import apiClient from "../../../lib/utils/api-client";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { useToast } from "../../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "../../../components/RichTextEditor";
import { usePurchaseOrders } from "../hooks/use-purchase-orders";
import { Badge } from "../../../components/ui/badge";
import { useLOAs } from "../../loas/hooks/use-loas";
import { useVendors } from "../../vendors/hooks/use-vendors";
import { VendorSelector } from "./VendorSelector";
import { useSites } from "../../sites/hooks/use-sites";
import type { Site } from "../../sites/types/site";
import { getUser } from "../../../lib/utils/auth";
import { ShippingAddressSelector } from "./ShippingAddressSelector";

interface POFormProps {
  mode: 'create' | 'edit';
  initialData?: PurchaseOrder;
  onSubmit: (data: PurchaseOrderFormData) => void;
  onCancel: () => void;
}

interface VendorOption {
  id: string;
  name: string;
  email: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
}

interface LOA {
  id: string;
  loaNumber: string;
  siteId: string;
  loaValue: number;
}

const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export function POForm({ mode, initialData, onCancel, onSubmit }: POFormProps) {
  const [loas, setLoas] = useState<LOA[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    mode === 'edit' && initialData?.tags ? initialData.tags : []
  );
  const [tagInput, setTagInput] = useState('');
  const [taxType, setTaxType] = useState<'amount' | 'percentage'>(
    mode === 'edit' && initialData?.taxAmount ? 'amount' : 'percentage'
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getLOAs } = useLOAs();
  const { getVendors } = useVendors();
  const { updatePurchaseOrder } = usePurchaseOrders();
  const { getSites } = useSites();
  const [sites, setSites] = useState<Site[]>([]);
  const currentUser = getUser();

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: mode === 'edit' && initialData ? {
      siteId: initialData.site?.id || '',
      loaId: initialData.loa.id,
      vendorId: initialData.vendor.id,
      items: initialData.items.map(item => ({
        itemId: item.item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxAmount: initialData.taxAmount || 0,
      requirementDesc: initialData.requirementDesc,
      termsConditions: initialData.termsConditions,
      shipToAddress: initialData.shipToAddress,
      notes: initialData.notes || '',
      tags: initialData.tags || [],
      approverId: initialData.approverId || '',
      expectedDeliveryDate: initialData.expectedDeliveryDate || '',
    } : {
      siteId: '',
      loaId: '',
      vendorId: '',
      items: [{
        itemId: '',
        quantity: 1,
        unitPrice: 0,
      }],
      taxAmount: 0,
      termsConditions: defaultTermsAndConditions,
      requirementDesc: '',
      shipToAddress: '',
      notes: '',
      tags: [],
      approverId: '',
      expectedDeliveryDate: '',
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: additionalChargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({
    control: form.control,
    name: "additionalCharges"
  });

  const watchItems = form.watch("items");
  const selectedVendor = form.watch("vendorId");
  const watchVendorId = form.watch("vendorId");
  const watchTaxAmount = form.watch("taxAmount");
  const watchAdditionalCharges = form.watch("additionalCharges");

  const calculateTotals = () => {
    const subtotal = watchItems.reduce(
      (acc, item) => acc + (item.quantity * item.unitPrice),
      0
    );

    let taxAmount = 0;
    if (taxType === 'percentage') {
      taxAmount = (subtotal * (watchTaxAmount || 0)) / 100;
    } else {
      taxAmount = watchTaxAmount || 0;
    }

    const additionalChargesTotal = watchAdditionalCharges?.reduce(
      (acc, charge) => acc + (charge.amount || 0),
      0
    ) || 0;

    return {
      subtotal,
      tax: taxAmount,
      additionalCharges: additionalChargesTotal,
      total: subtotal + taxAmount + additionalChargesTotal,
    };
  };

  const totals = calculateTotals();

  const handleItemSelect = async (index: number, itemId: string, unitPrice: number) => {
    form.setValue(`items.${index}`, {
      itemId,
      quantity: form.getValues(`items.${index}.quantity`) || 1,
      unitPrice,
    }, { shouldValidate: true });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [loasResponse, vendorsResponse, sitesResponse, approversResponse] = await Promise.all([
          getLOAs(),
          getVendors(),
          getSites(),
          apiClient.get('/users')
        ]);

        setLoas(loasResponse?.loas || []);
        setVendors(vendorsResponse || []);
        setSites(sitesResponse?.sites || []);

        const adminUsers = approversResponse.data.filter((user: User) => user.role === 'ADMIN');
        setApprovers(adminUsers);

      } catch (error) {
        setLoas([]);
        setVendors([]);
        setSites([]);
        toast({
          title: "Error",
          description: "Failed to fetch required data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (data: PurchaseOrderFormData) => {
    try {
      setSubmitting(true);

      // Convert tax percentage to amount if needed
      const taxAmount = taxType === 'percentage'
        ? (calculateTotals().subtotal * (data.taxAmount || 0)) / 100
        : data.taxAmount;

      if (mode === 'edit' && initialData?.id) {
        const updatedData = {
          ...data,
          taxAmount,
          items: data.items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        };

        await updatePurchaseOrder(initialData.id, updatedData);
        toast({
          title: "Success",
          description: "Purchase order updated successfully",
        });
        navigate(`/purchase-orders/${initialData.id}`);
      } else {
        const formattedData = {
          ...data,
          taxAmount,
          items: data.items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        };

        await onSubmit(formattedData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save purchase order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (watchVendorId) {
      if (mode !== 'edit') {
        form.setValue("items", [{
          itemId: "",
          quantity: 1,
          unitPrice: 0,
        }], {
          shouldValidate: true,
        });
      }
    }
  }, [watchVendorId, mode]);

  useEffect(() => {
    const selectedLoaId = form.watch("loaId");
    if (selectedLoaId) {
      const selectedLoa = loas.find(loa => loa.id === selectedLoaId);
      if (selectedLoa?.siteId) {
        form.setValue("siteId", selectedLoa.siteId, { shouldValidate: true });
      }
    }
  }, [form.watch("loaId")]);

  const handleAddTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      const updatedTags = [...selectedTags, tag];
      setSelectedTags(updatedTags);
      form.setValue('tags', updatedTags);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    form.setValue('tags', updatedTags);
  };

  // Get all selected item IDs
  const selectedItemIds = watchItems
    .map(item => item.itemId)
    .filter(id => id !== ""); // Filter out empty strings

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

        {/* LOA Selection */}
        <FormField
          control={form.control}
          name="loaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LOA Reference</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an LOA" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loas.map((loa) => (
                    <SelectItem key={loa.id} value={loa.id}>
                      {loa.loaNumber} (Available: {formatCurrency(loa.loaValue || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Site Selection */}
        <FormField
          control={form.control}
          name="siteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={true}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Site will be set based on LOA" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Site is automatically set based on the selected LOA
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


        {/* Vendor Selection */}
        <FormField
          control={form.control}
          name="vendorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <FormControl>
                <VendorSelector
                  vendors={vendors}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Line Items</h3>
            {selectedVendor && fields.length > 0 && (
              <Button
                type="button"
                onClick={() => append({
                  itemId: "",
                  quantity: 1,
                  unitPrice: 0,
                })}
                disabled={!selectedVendor}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>

          {!selectedVendor ? (
            <Card>
              <CardContent className="py-4 text-center text-muted-foreground">
                Please select a vendor first to add items
              </CardContent>
            </Card>
          ) : fields.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-muted-foreground">
                <div className="space-y-2">
                  <p>No items available for this vendor</p>
                  <p className="text-sm">All items have been added to the purchase order</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormLabel>Item</FormLabel>
                          <FormControl>
                            <ItemSelector
                              vendorId={selectedVendor}
                              value={itemField.value}
                              onChange={(itemId, unitPrice) =>
                                handleItemSelect(index, itemId, unitPrice)
                              }
                              excludeItems={selectedItemIds.filter(id => id !== itemField.value)} // Exclude other selected items
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: quantityField }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...quantityField}
                                onChange={(e) =>
                                  quantityField.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field: priceField }) => (
                          <FormItem>
                            <FormLabel>Unit Price (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...priceField}
                                onChange={(e) => priceField.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Item Total and Remove Button */}
                    <div className="col-span-2 flex justify-between items-center border-t pt-4 mt-2">
                      <div className="text-sm space-y-1">
                        <div>
                          Subtotal: {formatCurrency(watchItems[index].quantity * watchItems[index].unitPrice)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Tax Type Selection and Amount */}
        <div className="space-y-4">
          <FormItem>
            <FormLabel>Tax Type</FormLabel>
            <Select
              value={taxType}
              onValueChange={(value: 'amount' | 'percentage') => {
                setTaxType(value);
                form.setValue('taxAmount', 0);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="amount">Fixed Amount</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <FormField
            control={form.control}
            name="taxAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {taxType === 'percentage' ? 'Tax Percentage (%)' : 'Tax Amount (₹)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Charges Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Additional Charges</h3>
            <Button
              type="button"
              onClick={() => appendCharge({ description: '', amount: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Charge
            </Button>
          </div>

          {additionalChargeFields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`additionalCharges.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Freight Charges" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`additionalCharges.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-4"
                  onClick={() => removeCharge(index)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Charge
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  Tax {taxType === 'percentage' ? `(${watchTaxAmount || 0}%)` : 'Amount'}:
                </span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              {totals.additionalCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Additional Charges:</span>
                  <span>{formatCurrency(totals.additionalCharges)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Fields */}
        <FormField
          control={form.control}
          name="requirementDesc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirement Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter requirement description..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Must be between 10 and 1000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shipToAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Address</FormLabel>
              <FormControl>
                <ShippingAddressSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={submitting}
                />
              </FormControl>
              <FormDescription>
                Must be between 10 and 500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms and Conditions</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Must be between 10 and 2000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any additional notes..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Input */}
        <div className="space-y-2">
          <FormLabel>Tags</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Type a tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag(tagInput);
              }
            }}
          />
        </div>

        {/* Show message for admin users or approver selection for non-admins */}
        {currentUser?.role === 'ADMIN' ? (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
            <p className="text-sm text-blue-700 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              As an admin, you can submit and approve this purchase order from the order details page after creation.
              No additional approver selection is required.
            </p>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="approverId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required">Select Approver (Admin) *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an admin approver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvers.map((approver) => (
                      <SelectItem key={approver.id} value={approver.id}>
                        {approver.name} ({approver.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {approvers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No admin users available for approval
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'edit' ? 'Updating' : 'Creating'} Purchase Order...
              </>
            ) : (
              <>
                {mode === 'edit' ? 'Update Purchase Order' : 'Create Purchase Order'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Default terms and conditions template
const defaultTermsAndConditions = `
<ol style="margin: 0.8mm 0 0 2mm; padding-left: 6mm;">
  <li>Material should be compliant with respective specification mentioned above</li>
  <li><b>Transportation:</b> Included in the rates above</li>
  <li><b>Inspection:</b> By TPI</li>
  <li>Internal Works Test Certificate (WTC) and Guarantee Certficate (GC) is a must. Provide all documents as per specifications.</li>
  <li><b>Payment</b> as per existing terms</li>
  <li><b>Packing:</b> As per Railway Standard Packing</li>
  <li><b>Delivery Timeline:</b> Required to be sent in 3 equal lots every 6 months with 1st lot to be delivered in December 2025</li>
  <li><b>Shelf Life:</b> To be minimum 12 months at the time of dispatch</li>
  <li><b>Warranty:</b> As per Railway's PO Conditions</li>
  <li>Rate will remain same during the entire period of the Order.</li>
</ol>
`;
