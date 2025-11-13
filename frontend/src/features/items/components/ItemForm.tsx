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
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

import { itemSchema, type ItemFormData, type Item } from "../types/item";  // ✅ USE SHARED TYPES

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
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      uom: initialData?.uom || "",
      hsnCode: initialData?.hsnCode || "", // required by schema
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
