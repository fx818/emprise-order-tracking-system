import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LOA } from "../types/loa";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { useLOAs } from "../hooks/use-loas";

const formSchema = z.object({
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "SUPPLY_WORK_COMPLETED",
    "CHASE_PAYMENT",
    "CLOSED",
    "SUPPLY_WORK_DELAYED",
    "APPLICATION_PENDING",
    "UPLOAD_BILL",
    "RETRIEVE_EMD_SECURITY"
  ]),
  reason: z.string().optional(),
});

type StatusFormData = z.infer<typeof formSchema>;

interface LOAStatusFormProps {
  loa: LOA;
  onSuccess: () => void;
}

export function LOAStatusForm({ loa, onSuccess }: LOAStatusFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateLOAStatus } = useLOAs();

  const form = useForm<StatusFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: loa.status,
      reason: "",
    },
  });

  const handleSubmit = async (data: StatusFormData) => {
    setIsSubmitting(true);
    try {
      await updateLOAStatus(loa.id, data.status, data.reason);
      onSuccess();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LOA Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">1. Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">2. In Progress</SelectItem>
                  <SelectItem value="SUPPLY_WORK_DELAYED">3. Supply/Work Delayed</SelectItem>
                  <SelectItem value="SUPPLY_WORK_COMPLETED">4. Supply/Work Completed</SelectItem>
                  <SelectItem value="APPLICATION_PENDING">5. Application Pending</SelectItem>
                  <SelectItem value="UPLOAD_BILL">6. Upload Bill</SelectItem>
                  <SelectItem value="CHASE_PAYMENT">7. Chase Payment</SelectItem>
                  <SelectItem value="RETRIEVE_EMD_SECURITY">8. Retrieve EMD/Security</SelectItem>
                  <SelectItem value="CLOSED">9. Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Status Change (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter reason for changing the status"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Status"}
        </Button>
      </form>
    </Form>
  );
} 