"use client";

import { useForm } from "../../../hooks/use-form";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { fdrSchema, type FDRFormData } from "../types/fdr";
import { cn } from "../../../lib/utils";
import { format, parseISO } from "date-fns";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { extractFDRData } from "./fdr-extracter";
import { X, Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";

interface FDRFormProps {
  initialData?: Partial<FDRFormData>;
  onSubmit: (data: FDRFormData) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

export function FDRForm({ initialData, onSubmit, onCancel, mode = 'create' }: FDRFormProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<FDRFormData>({
    schema: fdrSchema,
    defaultValues: {
      category: initialData?.category || "FD",
      bankName: initialData?.bankName || "IDBI",
      accountNo: initialData?.accountNo || "",
      fdrNumber: initialData?.fdrNumber || "",
      accountName: initialData?.accountName || "",
      depositAmount: initialData?.depositAmount || 0,
      dateOfDeposit: initialData?.dateOfDeposit || new Date(),
      maturityValue: initialData?.maturityValue,
      maturityDate: initialData?.maturityDate,
      contractNo: initialData?.contractNo || "",
      contractDetails: initialData?.contractDetails || "",
      poc: initialData?.poc || "",
      location: initialData?.location || "",
      status: initialData?.status,
      tags: initialData?.tags || [],
    },
  });

  const parseDateString = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
      }
      return parseISO(dateStr);
    } catch {
      return null;
    }
  };

  // ------------------ FILE UPLOAD + EXTRACTION -------------------
  const handleFileUpload = async (file: File) => {
    try {
      // 1️⃣ Validate file
      if (!file) throw new Error("No file selected.");
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        throw new Error("Invalid file format. Please upload JPG, PNG, or PDF.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large. Please upload files smaller than 10MB.");
      }

      setExtracting(true);
      setFileName(file.name);
      setExtractionError(null);

      // 2️⃣ Try extracting FDR details
      const extractedData = await extractFDRData(file);
      if (!extractedData) {
        throw new Error("Failed to extract data from file. Please check file clarity.");
      }

      // 3️⃣ Update form with extracted data
      const updates: Partial<FDRFormData> = { bankName: "IDBI" };

      if (extractedData.depositAmount)
        updates.depositAmount = extractedData.depositAmount;
      if (extractedData.maturityValue)
        updates.maturityValue = extractedData.maturityValue;

      if (extractedData.maturityDate) {
        const maturityDate = parseDateString(extractedData.maturityDate);
        if (maturityDate) updates.maturityDate = maturityDate;
      }

      if (extractedData.dateOfDeposit) {
        const dateOfDeposit = parseDateString(extractedData.dateOfDeposit);
        if (dateOfDeposit) updates.dateOfDeposit = dateOfDeposit;
      }

      if (extractedData.accountNo)
        updates.accountNo = extractedData.accountNo.trim();
      if (extractedData.fdrNumber)
        updates.fdrNumber = extractedData.fdrNumber.trim();
      if (extractedData.accountName)
        updates.accountName = extractedData.accountName.trim();

      form.reset({ ...form.getValues(), ...updates });

      if (!extractedData.depositAmount || !extractedData.dateOfDeposit) {
        setExtractionError(
          "Some fields could not be extracted automatically. Please verify manually."
        );
      }
    } catch (err: unknown) {
      console.error("Extraction Error:", err);
      setExtractionError(
        err instanceof Error
          ? err.message
          : "Unexpected error while extracting data. Please try again."
      );
    } finally {
      setExtracting(false);
    }
  };

  // ------------------ TAG HANDLING -------------------
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      const currentTags = form.getValues("tags") || [];
      if (!currentTags.includes(newTag.trim())) {
        form.setValue("tags", [...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  // ------------------ SUBMIT HANDLING -------------------
  const handleSubmit = async (data: FDRFormData) => {
    try {
      setSubmissionError(null);
      await onSubmit(data);
    } catch (err: unknown) {
      console.error("Form Submission Error:", err);
      setSubmissionError(
        err instanceof Error
          ? err.message
          : "Submission failed. Please check your connection or try again later."
      );
    }
  };

  // ------------------ COMPONENT RENDER -------------------
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 🌟 Global Alerts */}
        {extractionError && (
          <Alert variant="destructive">
            <AlertDescription>{extractionError}</AlertDescription>
          </Alert>
        )}
        {submissionError && (
          <Alert variant="destructive">
            <AlertDescription>{submissionError}</AlertDescription>
          </Alert>
        )}

        {/* 📄 Document Upload */}
        <FormField
          control={form.control}
          name="documentFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>FDR Document {mode === 'edit' && '(Optional - upload to replace)'}</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(file);
                        handleFileUpload(file);
                      }
                    }}
                    {...field}
                    disabled={extracting}
                  />
                  {fileName && !extracting && (
                    <p className="text-sm text-muted-foreground">
                      Uploaded: {fileName}
                    </p>
                  )}
                  {extracting && (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner />
                      <span className="text-sm text-muted-foreground">
                        Analyzing FDR document...
                      </span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 🏦 Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SD">Security Deposit (SD)</SelectItem>
                  <SelectItem value="PG">Performance Guarantee (PG)</SelectItem>
                  <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                  <SelectItem value="BG">Bank Guarantee (BG)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 🧾 Bank Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., IDBI, BOB" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Bank account number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 💰 Deposit & Maturity */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="depositAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit Amount *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                      ₹
                    </span>
                    <Input
                      type="text"
                      className="pl-7"
                      placeholder="Enter deposit amount"
                      value={field.value.toLocaleString("en-IN")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "");
                        const numValue = Number(value);
                        if (!isNaN(numValue)) field.onChange(numValue);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maturityValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maturity Value</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                      ₹
                    </span>
                    <Input
                      type="text"
                      className="pl-7"
                      placeholder="Enter maturity value"
                      value={field.value ? field.value.toLocaleString("en-IN") : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "");
                        const numValue = Number(value);
                        if (!isNaN(numValue)) field.onChange(numValue);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 📅 Dates */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="dateOfDeposit"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Deposit *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? format(field.value, "PPP")
                          : "Select date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maturityDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Maturity Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? format(field.value, "PPP")
                          : "Select date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 🏗️ Contract + POC */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="contractNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract/PO Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Contract or PO number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="poc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Point of Contact (POC)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Contact person name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 📍 Location + Details */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Site or location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contractDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract Details</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Description of work or contract details"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 🔖 Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="RUNNING">Running</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 🏷️ Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {field.value?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add tag and press Enter"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 🚀 Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={extracting || form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={extracting || form.formState.isSubmitting}
          >
            {(extracting || form.formState.isSubmitting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === 'edit' ? 'Update FDR Details' : 'Submit FDR Details'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
