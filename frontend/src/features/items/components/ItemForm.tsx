import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";

import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

import { itemSchema, type ItemFormData, type Item } from "../types/item";

import { useVendors } from "../../vendors/hooks/use-vendors";
import { MultiSelect } from "../../../components/ui/multi-select";

interface ItemFormProps {
  initialData?: Item;
  onSubmit: (data: ItemFormData) => Promise<void>;
  isLoading: boolean;
  mode: "create" | "edit";
}

export function ItemForm({
  initialData,
  onSubmit,
  isLoading,
  mode,
}: ItemFormProps) {
  const { vendors, fetchVendors } = useVendors();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      uom: initialData?.uom || "",
      hsnCode: initialData?.hsnCode || "",
      vendors:
        initialData?.vendors?.map((v) => ({
          vendorId: v.vendor.id,
          unitPrice: v.unitPrice,
        })) || [],
    },
  });

  React.useEffect(() => {
    fetchVendors();
  }, []);

  const vendorSelections = form.watch("vendors") ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* BASIC INFO */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* NAME */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DESCRIPTION */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UOM */}
            <FormField
              control={form.control}
              name="uom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measurement</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* HSN */}
            <FormField
              control={form.control}
              name="hsnCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HSN Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* VENDOR ASSIGNMENT */}
        <Card>
          <CardHeader>
            <CardTitle>Assign Vendors</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* MULTI SELECT */}
            <FormField
              control={form.control}
              name="vendors"
              render={() => (
                <FormItem>
                  <FormLabel>Select Vendors</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={vendors.map((v: any) => ({
                        label: v.name,
                        value: v.id,
                      }))}
                      value={vendorSelections.map((v) => v.vendorId)}
                      onChange={(selectedIds: string[]) => {
                        const current = form.getValues("vendors") || [];

                        const updated = selectedIds.map((id) => ({
                          vendorId: id,
                          unitPrice:
                            current.find((v) => v.vendorId === id)?.unitPrice || 0,
                        }));

                        form.setValue("vendors", updated);
                      }}
                      placeholder="Select vendors..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UNIT PRICE FIELDS */}
            {/* UNIT PRICE FIELDS WITH HEADER */}
            {vendorSelections.length > 0 && (
              <div className="space-y-2 border rounded-md p-4">

                {/* HEADER */}
                <div className="flex items-center font-semibold text-sm text-muted-foreground pb-2 border-b">
                  <div className="w-48">Vendor</div>
                  <div className="w-40">Unit Price</div>
                </div>

                {/* ROWS */}
                {vendorSelections.map((vendor, index) => {
                  const vendorInfo = vendors.find(
                    (v: any) => v.id === vendor.vendorId
                  );

                  return (
                    <div
                      key={vendor.vendorId}
                      className="flex items-center py-1 gap-4"
                    >
                      {/* Vendor Name */}
                      <div className="w-48 font-medium">
                        {vendorInfo?.name || "Vendor"}
                      </div>

                      {/* Unit Price Input */}
                      <Input
                        type="number"
                        className="w-40"
                        placeholder="Unit Price"
                        value={vendor.unitPrice}
                        onChange={(e) => {
                          const updated = [...vendorSelections];
                          updated[index].unitPrice = Number(e.target.value);
                          form.setValue("vendors", updated);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

          </CardContent>

        </Card>

        {/* SUBMIT */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : mode === "create"
                ? "Create Item"
                : "Update Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
