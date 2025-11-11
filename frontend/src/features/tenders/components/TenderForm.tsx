import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Check, ChevronsUpDown, AlertCircle, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { cn } from '../../../lib/utils';
import { Switch } from '../../../components/ui/switch';
import { TenderFormData, tenderSchema } from '../types/tender';
import { FilePicker } from '../../../components/ui/file-picker';
import TagInput from '../../../components/ui/tag-input';
import { EMDUploadSection } from './EMDUploadSection';
import { useSites } from '../../sites/hooks/use-sites';
import type { Site } from '../../sites/types/site';

export interface EMDData {
  amount: number;
  bankName: string;
  submissionDate: Date;
  maturityDate: Date;
  documentFile?: File;
  tags: string[];
}

interface TenderFormProps {
  defaultValues?: Partial<TenderFormData>;
  onSubmit: (tenderData: TenderFormData) => Promise<void>;
  isSubmitting: boolean;
  title: string;
  submitLabel: string;
}

export function TenderForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  title,
  submitLabel,
}: TenderFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [nitFile, setNitFile] = useState<File | null>(null);
  const [emdDocumentFile, setEmdDocumentFile] = useState<File | null>(null);
  const [emdSubmissionDate, setEmdSubmissionDate] = useState<Date | undefined>(undefined);
  const [emdMaturityDate, setEmdMaturityDate] = useState<Date | undefined>(undefined);
  const [emdBankName, setEmdBankName] = useState<string>('IDBI');
  const [sites, setSites] = useState<Site[]>([]);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | undefined>(defaultValues?.documentUrl);
  const [existingNitDocumentUrl, setExistingNitDocumentUrl] = useState<string | undefined>(defaultValues?.nitDocumentUrl);
  const [existingEmdDocumentUrl, setExistingEmdDocumentUrl] = useState<string | undefined>(defaultValues?.emdDocumentUrl);
  const { getSites } = useSites();

  const form = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
    defaultValues: {
      tenderNumber: defaultValues?.tenderNumber || '',
      dueDate: defaultValues?.dueDate || new Date(),
      description: defaultValues?.description || '',
      hasEMD: defaultValues?.hasEMD || false,
      emdAmount: defaultValues?.emdAmount || null,
      emdBankName: defaultValues?.emdBankName || '',
      emdSubmissionDate: defaultValues?.emdSubmissionDate,
      emdMaturityDate: defaultValues?.emdMaturityDate,
      tags: defaultValues?.tags || [],
      siteId: defaultValues?.siteId || undefined,
    },
  });

  const hasEMD = form.watch('hasEMD');
  const selectedSiteId = form.watch('siteId');

  // Fetch sites on component mount
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await getSites({ limit: 1000 });
        setSites(response.sites);
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      }
    };
    fetchSites();
  }, []);

  // Build site options for the combobox
  const siteOptions = useMemo(() => {
    return sites.map((s) => ({
      id: String(s.id),
      name: s.name,
      code: s.code,
      customerName: s.zone?.name || 'Unknown Customer',
      displayName: `${s.zone?.name || 'Unknown'} - ${s.name} (${s.code})`
    }));
  }, [sites]);

  const handleEMDDataExtracted = (data: {
    amount: number | null;
    submissionDate: string | null;
    maturityDate: string | null;
    bankName: string;
  }) => {
    if (data.amount) {
      form.setValue('emdAmount', data.amount);
    }
    if (data.submissionDate) {
      // Parse DD-MM-YYYY format
      const [day, month, year] = data.submissionDate.split('-');
      const submissionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      setEmdSubmissionDate(submissionDate);
      form.setValue('emdSubmissionDate', submissionDate);
    }
    if (data.maturityDate) {
      // Parse DD-MM-YYYY format
      const [day, month, year] = data.maturityDate.split('-');
      const maturityDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      setEmdMaturityDate(maturityDate);
      form.setValue('emdMaturityDate', maturityDate);
    }
    setEmdBankName(data.bankName);
    form.setValue('emdBankName', data.bankName);
  };

  // Reset emdAmount when hasEMD is toggled off
  useEffect(() => {
    if (!hasEMD) {
      form.setValue('emdAmount', null);
    }
  }, [hasEMD, form]);

  // Update existing document URLs when defaultValues changes
  useEffect(() => {
    if (defaultValues?.documentUrl) {
      setExistingDocumentUrl(defaultValues.documentUrl);
    }
    if (defaultValues?.nitDocumentUrl) {
      setExistingNitDocumentUrl(defaultValues.nitDocumentUrl);
    }
    if (defaultValues?.emdDocumentUrl) {
      setExistingEmdDocumentUrl(defaultValues.emdDocumentUrl);
    }
    if (defaultValues?.emdSubmissionDate) {
      setEmdSubmissionDate(defaultValues.emdSubmissionDate);
    }
    if (defaultValues?.emdMaturityDate) {
      setEmdMaturityDate(defaultValues.emdMaturityDate);
    }
    if (defaultValues?.emdBankName) {
      setEmdBankName(defaultValues.emdBankName);
    }
  }, [defaultValues]);

  const handleSubmit = async (data: TenderFormData) => {
    try {
      const tenderFormData = {
        ...data,
        // If hasEMD is false, clear EMD fields
        emdAmount: data.hasEMD ? data.emdAmount : null,
        emdBankName: data.hasEMD ? emdBankName : undefined,
        emdSubmissionDate: data.hasEMD ? emdSubmissionDate : undefined,
        emdMaturityDate: data.hasEMD ? emdMaturityDate : undefined,
        documentFile: file || undefined,
        nitDocumentFile: nitFile || undefined,
        emdDocumentFile: data.hasEMD ? (emdDocumentFile || undefined) : undefined
      };

      await onSubmit(tenderFormData);
    } catch (error: any) {
      // Handle field-specific validation errors from backend
      const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred';

      // Check if error is related to specific fields
      if (errorMessage.toLowerCase().includes('tender number')) {
        form.setError('tenderNumber', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('Tender Number Error', {
          description: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('due date')) {
        form.setError('dueDate', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('Due Date Error', {
          description: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('emd')) {
        form.setError('emdAmount', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('EMD Error', {
          description: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('site')) {
        form.setError('siteId', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('Site Error', {
          description: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('description')) {
        form.setError('description', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('Description Error', {
          description: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('document')) {
        toast.error('Document Error', {
          description: errorMessage
        });
      } else {
        // Generic error - set on root
        form.setError('root', {
          type: 'manual',
          message: errorMessage
        });
        toast.error('Error Saving Tender', {
          description: errorMessage
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="tenderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tender Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tender number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter tender description"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Site (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? siteOptions.find((site) => site.id === field.value)?.displayName || "Select site..."
                            : "Select site..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search site or customer..." />
                        <CommandEmpty>No site found.</CommandEmpty>
                        <CommandList className="max-h-[250px] overflow-y-auto">
                          <CommandGroup>
                            {siteOptions.map((site) => (
                              <CommandItem
                                key={site.id}
                                value={site.displayName}
                                onSelect={() => {
                                  form.setValue("siteId", site.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    site.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {site.displayName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedSiteId && siteOptions.find(s => s.id === selectedSiteId) && (
                    <FormDescription className="mt-2">
                      <span className="text-sm font-medium">Customer: </span>
                      <span className="text-sm text-muted-foreground">
                        {siteOptions.find(s => s.id === selectedSiteId)?.customerName}
                      </span>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasEMD"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">EMD Deposit Required</FormLabel>
                    <FormDescription>
                      Toggle this if EMD deposit is required for this tender
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {hasEMD && (
              <div className="space-y-4">
                {/* AI Extraction Upload Section */}
                <EMDUploadSection
                  onDataExtracted={handleEMDDataExtracted}
                  onFileChange={setEmdDocumentFile}
                  disabled={isSubmitting}
                  existingDocumentUrl={existingEmdDocumentUrl}
                />

                {/* EMD Amount Field */}
                <FormField
                  control={form.control}
                  name="emdAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EMD Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter EMD amount"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseFloat(value) : null);
                          }}
                          value={field.value === null ? '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bank Name Field */}
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter bank name"
                      value={emdBankName}
                      onChange={(e) => {
                        setEmdBankName(e.target.value);
                        form.setValue('emdBankName', e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Name of the bank issuing the EMD/FDR
                  </FormDescription>
                </FormItem>

                {/* Submission Date Field */}
                <FormItem className="flex flex-col">
                  <FormLabel>EMD Submission Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !emdSubmissionDate && "text-muted-foreground"
                          )}
                        >
                          {emdSubmissionDate ? (
                            format(emdSubmissionDate, "PPP")
                          ) : (
                            <span>Pick submission date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={emdSubmissionDate}
                        onSelect={(date) => {
                          setEmdSubmissionDate(date);
                          form.setValue('emdSubmissionDate', date);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Date when the EMD was submitted
                  </FormDescription>
                </FormItem>

                {/* Maturity Date Field */}
                <FormItem className="flex flex-col">
                  <FormLabel>EMD Maturity Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !emdMaturityDate && "text-muted-foreground"
                          )}
                        >
                          {emdMaturityDate ? (
                            format(emdMaturityDate, "PPP")
                          ) : (
                            <span>Pick maturity date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={emdMaturityDate}
                        onSelect={(date) => {
                          setEmdMaturityDate(date);
                          form.setValue('emdMaturityDate', date);
                        }}
                        disabled={(date) =>
                          emdSubmissionDate ? date < emdSubmissionDate : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Date when the EMD will mature/expire (optional)
                  </FormDescription>
                </FormItem>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagInput 
                      placeholder="Add tag..."
                      tags={field.value || []}
                      setTags={(newTags: string[]) => field.onChange(newTags)}
                    />
                  </FormControl>
                  <FormDescription>
                    Press enter to add a tag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Tender Document</FormLabel>
              {existingDocumentUrl && !file && (
                <div className="mb-2 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Existing Document</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(existingDocumentUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              )}
              <FilePicker
                accept=".pdf,.doc,.docx"
                onChange={(file: File | null) => setFile(file)}
              />
              <FormDescription>
                {existingDocumentUrl ? 'Upload a new file to replace the existing document' : 'Upload a PDF or document file (max 5MB)'}
              </FormDescription>
            </FormItem>

            <FormItem>
              <FormLabel>NIT Document</FormLabel>
              {existingNitDocumentUrl && !nitFile && (
                <div className="mb-2 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Existing NIT Document</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(existingNitDocumentUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              )}
              <FilePicker
                accept=".pdf,.doc,.docx"
                onChange={(file: File | null) => setNitFile(file)}
              />
              <FormDescription>
                {existingNitDocumentUrl ? 'Upload a new file to replace the existing NIT document' : 'Upload NIT (Notice Inviting Tender) document (max 5MB)'}
              </FormDescription>
            </FormItem>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 