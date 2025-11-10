import { useForm } from '../../../hooks/use-form';
import { useState } from 'react';
import { Button } from "../../../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Calendar } from "../../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { fdrSchema, type FDRFormData } from '../types/fdr';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { extractFDRData } from './fdr-extracter';
import { parseISO } from 'date-fns';
import { X, Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";

interface FDRFormProps {
  initialData?: Partial<FDRFormData>;
  onSubmit: (data: FDRFormData) => void;
  onCancel: () => void;
}

export function FDRForm({ initialData, onSubmit, onCancel }: FDRFormProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  const form = useForm<FDRFormData>({
    schema: fdrSchema,
    defaultValues: {
      category: initialData?.category || 'FD',
      bankName: initialData?.bankName || 'IDBI',
      accountNo: initialData?.accountNo || '',
      fdrNumber: initialData?.fdrNumber || '',
      accountName: initialData?.accountName || '',
      depositAmount: initialData?.depositAmount || 0,
      dateOfDeposit: initialData?.dateOfDeposit || new Date(),
      maturityValue: initialData?.maturityValue,
      maturityDate: initialData?.maturityDate,
      contractNo: initialData?.contractNo || '',
      contractDetails: initialData?.contractDetails || '',
      poc: initialData?.poc || '',
      location: initialData?.location || '',
      status: initialData?.status,
      tags: initialData?.tags || ['FD'],
    },
  });

  const handleSubmit = async (data: FDRFormData) => {
    await onSubmit(data);
  };

  const parseDateString = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    try {
      return parseISO(dateStr);
    } catch {
      return null;
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setExtracting(true);
      setExtractionError(null);

      const extractedData = await extractFDRData(file);

      const updates: Partial<FDRFormData> = { bankName: 'IDBI' };

      if (extractedData.depositAmount) {
        updates.depositAmount = extractedData.depositAmount;
      }

      if (extractedData.maturityValue) {
        updates.maturityValue = extractedData.maturityValue;
      }

      if (extractedData.maturityDate) {
        const maturityDate = parseDateString(extractedData.maturityDate);
        if (maturityDate && !isNaN(maturityDate.getTime())) {
          updates.maturityDate = maturityDate;
        }
      }

      if (extractedData.dateOfDeposit) {
        const dateOfDeposit = parseDateString(extractedData.dateOfDeposit);
        if (dateOfDeposit && !isNaN(dateOfDeposit.getTime())) {
          updates.dateOfDeposit = dateOfDeposit;
        }
      }

      if (extractedData.accountNo) {
        updates.accountNo = extractedData.accountNo;
      }

      if (extractedData.fdrNumber) {
        updates.fdrNumber = extractedData.fdrNumber;
      }

      if (extractedData.accountName) {
        updates.accountName = extractedData.accountName;
      }

      form.reset({
        ...form.getValues(),
        ...updates
      });

      if (!extractedData.depositAmount || !extractedData.dateOfDeposit) {
        setExtractionError('Some required fields could not be extracted. Please verify the values.');
      }

    } catch (error) {
      console.error('FDR extraction error:', error);
      setExtractionError(
        error instanceof Error
          ? error.message
          : 'Failed to extract document data. Please check the file format and quality.'
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(newTag.trim())) {
        form.setValue('tags', [...currentTags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Document Upload */}
        <FormField
          control={form.control}
          name="documentFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>FDR Document</FormLabel>
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
                  {extracting && (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner />
                      <span className="text-sm text-muted-foreground">
                        Analyzing FDR document...
                      </span>
                    </div>
                  )}
                  {extractionError && (
                    <Alert variant="destructive">
                      <AlertDescription>{extractionError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
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

        {/* Bank Name and Account Number */}
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

        {/* FDR Number and Account Name */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="fdrNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FD/BG Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="FDR or BG number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Account holder name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Deposit Amount and Maturity Value */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="depositAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit Amount *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                    <Input
                      type="text"
                      placeholder="Enter deposit amount"
                      {...field}
                      className="pl-7"
                      value={field.value.toLocaleString('en-IN')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                          field.onChange(numValue);
                        }
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                    <Input
                      type="text"
                      placeholder="Enter maturity value"
                      {...field}
                      className="pl-7"
                      value={field.value ? field.value.toLocaleString('en-IN') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                          field.onChange(numValue);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date Fields */}
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
                        {field.value ? format(field.value, "PPP") : <span>Select date</span>}
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
                        {field.value ? format(field.value, "PPP") : <span>Select date</span>}
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

        {/* Contract Number and POC */}
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

        {/* Location */}
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

        {/* Contract Details */}
        <FormField
          control={form.control}
          name="contractDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract Details</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Description of work or contract details"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
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

        {/* Tags */}
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

        {/* Form Actions */}
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
            {(extracting || form.formState.isSubmitting) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit FDR Details
          </Button>
        </div>
      </form>
    </Form>
  );
}
