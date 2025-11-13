import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Card, CardContent } from "../../../components/ui/card";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { useSites } from "../hooks/use-sites";
import { SiteStatus } from "../types/site";
import { toast } from "../../../hooks/use-toast";
import { useCustomers, Customer } from "../../../features/customers/hooks/use-customers";


const siteFormSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters"),
  code: z.string().optional(),
  location: z.string()
    .min(3, "Location is required")
    .max(100, "Location must not exceed 100 characters"),
  zoneId: z.string().min(1, "Customer is required"),
  address: z.string()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must not exceed 500 characters"),
  contactPerson: z.string().optional(),
  contactPhone: z.string()
    .regex(/^\d{10}$/, "Phone number must be 10 digits")
    .optional()
    .or(z.literal("")),
  contactEmail: z.string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  status: z.nativeEnum(SiteStatus).optional(),
});

type FormData = z.infer<typeof siteFormSchema>;

interface SiteFormProps {
  mode: "create" | "edit";
}

export function SiteForm({ mode }: SiteFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const { createSite, updateSite, getSite } = useSites();
  const { getCustomers } = useCustomers();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      name: "",
      code: "",
      location: "",
      zoneId: "",
      address: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      status: mode === "edit" ? undefined : SiteStatus.ACTIVE,
    },
  });

  // Fetch customers from API when component mounts
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch site data in edit mode
  useEffect(() => {
    if (mode === "edit" && id) {
      fetchSiteData();
    }
  }, [mode, id]);

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const customersData = await getCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchSiteData = async () => {
    try {
      if (!id) return;
      const site = await getSite(id);
      form.reset({
        name: site.name,
        code: site.code || "",
        location: site.location,
        zoneId: site.zoneId,
        address: site.address,
        contactPerson: site.contactPerson || "",
        contactPhone: site.contactPhone || "",
        contactEmail: site.contactEmail || "",
        status: site.status,
      });
    } catch (error) {
      console.error("Error fetching site:", error);
      toast({
        title: "Error",
        description: "Failed to fetch site data",
        variant: "destructive",
      });
      navigate("/sites");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      if (mode === "create") {
        await createSite(data);
      } else if (mode === "edit" && id) {
        await updateSite(id, data);
      }

      toast({
        title: "Success",
        description: `Site ${mode === "create" ? "created" : "updated"} successfully`,
      });
      navigate("/sites");
    } catch (error) {
      console.log("here:::", error);
      const errMsg =
        (error as any)?.response?.data?.message ??
        (error instanceof Error ? error.message : String(error));
      console.error("Form submission error:", errMsg);
      toast({
        title: "Error",
        description: `Failed to ${mode === "create" ? "create" : "update"} site. ${errMsg ? errMsg : ""}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/sites")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create New Site" : "Edit Site"}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loadingCustomers}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCustomers ? "Loading..." : "Select a customer"}>
                            {field.value && !loadingCustomers ? 
                              customers.find(customer => customer.id === field.value)?.name || field.value 
                              : (loadingCustomers ? "Loading..." : "Select a customer")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {loadingCustomers ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Loading customers...</span>
                            </div>
                          ) : (
                            customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} ({customer.headquarters})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "edit" && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(SiteStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/sites")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "edit" ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    mode === "edit" ? "Update Site" : "Create Site"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 