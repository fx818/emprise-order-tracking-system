import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Trash2, Plus, Info } from "lucide-react";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";
import { Card, CardContent } from "../../../components/ui/card";
import { offerSchema, type OfferFormData, WorkItem } from "../types/Offer";
// import { useOffers } from "../hooks/use-offers";
import { RichTextEditor } from '../../../components/RichTextEditor';
import {
  Badge,
} from "../../../components/ui/badge";
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import apiClient from "../../../lib/utils/api-client";
import { useCustomers, Customer } from "../../../features/customers/hooks/use-customers";
import { getUser } from "../../../lib/utils/auth";

interface OfferFormProps {
  initialData?: Partial<OfferFormData>;
  onSubmit: (data: OfferFormData) => void;
  onCancel: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
}

const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export function OfferForm({ initialData, onSubmit, onCancel }: OfferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // const { loading } = useOffers();
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [approvers, setApprovers] = useState<User[]>([]);
  const { getCustomers } = useCustomers();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const getCurrentUser = getUser();

  // Transform initialData dates if they exist
  const formattedInitialData = initialData ? {
    ...initialData,
    offerDate: initialData.offerDate ? new Date(initialData.offerDate) : new Date(),
  } : undefined;

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const response = await apiClient.get('/users');
        const adminUsers = response.data.filter((user: User) => user.role === 'ADMIN');
        setApprovers(adminUsers);
        setFormError(null);
      } catch (error) {
        console.error('Failed to fetch approvers:', error);
        setFormError(typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Failed to fetch approvers'));
      }
    };
    fetchApprovers();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
        setFormError(null);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        setFormError(typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Failed to fetch customers'));
      }
    };
    fetchCustomers();
  }, [getCustomers]);

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: formattedInitialData || {
      subject: "",
      toAuthority: "",
      offerDate: new Date(),
      workItems: [
        {
          description: "",
          quantity: 0,
          unitOfMeasurement: "",
          baseRate: 0,
          taxRate: 0,
        }
      ],
      termsConditions: "",
      tags: [],
      approverId: "",
      customerId: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "workItems",
  });
const handleSubmit = async (data: OfferFormData) => {
  try {
    setFormError(null);
    setIsSubmitting(true);
    console.log('Submitting form data:', data);
    await onSubmit(data);
  } catch (error: any) {
    console.error('Error submitting offer:', error);

    const backendError = error?.response?.data || {};

    // Field-level server validation errors
    if (Array.isArray(backendError.errors)) {
      backendError.errors.forEach((err: any) => {
        if (err.field && err.message) {
          form.setError(err.field as any, { type: 'server', message: err.message });
        }
      });
    } else {
      // Form-level (non-field) error
      const message =
        backendError.message ||
        (typeof error === 'string' ? error : error?.message) ||
        'Failed to save offer.';
      setFormError(message);
    }
  } finally {
    setIsSubmitting(false);
  }
};

  const handleAddTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      form.setValue('tags', [...selectedTags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    form.setValue('tags', updatedTags);
  };

  const calculateItemTotal = (item: WorkItem): number => {
    return item.quantity * item.baseRate * (1 + item.taxRate / 100);
  };

  const calculateTotal = (workItems: WorkItem[]): number => {
    return workItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {formError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-100 text-red-800">
            {formError}
          </div>
        )}
        {/* Offer Date */}
        <FormField
          control={form.control}
          name="offerDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Offer Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />


        {/* Customer Selection */}
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Authority */}
        <FormField
          control={form.control}
          name="toAuthority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Authority</FormLabel>
              <FormControl>
                <Input placeholder="Enter authority name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subject */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Enter offer subject" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Work Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Work Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  description: "",
                  quantity: 0,
                  unitOfMeasurement: "",
                  baseRate: 0,
                  taxRate: 0,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`workItems.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`workItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`workItems.${index}.unitOfMeasurement`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., meters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`workItems.${index}.baseRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Rate (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`workItems.${index}.taxRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Item Total */}
                  <div className="col-span-2 flex justify-between items-center border-t pt-4 mt-2">
                    <div className="text-sm text-muted-foreground">
                      Item Total: {formatCurrency(calculateItemTotal(form.watch(`workItems.${index}`)))}
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
          ))}
        </div>

        {/* Terms and Conditions with Rich Text Editor */}
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

        {/* Show message for admin users */}
        {getCurrentUser?.role === 'ADMIN' ? (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
            <p className="text-sm text-blue-700 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              As an admin, you can submit and approve this offer from the offer details page after creation.
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>

        {/* Grand Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Grand Total:</span>
            <span className="text-lg font-bold">
              {formatCurrency(calculateTotal(form.watch('workItems')))}
            </span>
          </div>
        </div>
      </form>
    </Form>
  );
}