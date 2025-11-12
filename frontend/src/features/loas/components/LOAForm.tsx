import { useForm } from '../../../hooks/use-form';
import { useMemo, useRef } from 'react';
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Calendar } from "../../../components/ui/calendar";
import { Textarea } from "../../../components/ui/textarea";
import { format } from "date-fns";
import { cn } from "../../../lib/utils";
import { CalendarIcon, Loader2, Check, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { loaSchema, type LOAFormData } from '../types/loa';
import { useState, useEffect } from 'react';
import { Badge } from "../../../components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "../../../hooks/use-toast-app";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../components/ui/command";
import { Checkbox } from "../../../components/ui/checkbox";
import { useSites } from '../../sites/hooks/use-sites';
import type { Site } from '../../sites/types/site';
import { useTenders } from '../../tenders/hooks/use-tenders';
import type { Tender } from '../../tenders/types/tender';
import { usePocs } from '../../pocs/hooks/use-pocs';
import type { POC } from '../../pocs/types/poc';
import { useInspectionAgencies } from '../../inspection-agencies/hooks/use-inspection-agencies';
import type { InspectionAgency } from '../../inspection-agencies/types/inspection-agency';
import { useFDRs } from '../../fdrs/hooks/use-fdrs';
import type { FDR } from '../../fdrs/types/fdr';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Plus } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper function to extract filename from URL
const getFilenameFromUrl = (url: string): string => {
  try {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return 'View file';
  }
};

interface LOAFormProps {
  initialData?: Partial<LOAFormData>;
  initialSiteName?: string;
  existingDocumentUrl?: string;
  existingInvoicePdfUrl?: string;
  onSubmit: (data: LOAFormData) => void;
  onClose: () => void;
}

export function LOAForm({
  initialData,
  initialSiteName,
  existingDocumentUrl,
  existingInvoicePdfUrl,
  onSubmit,
  onClose
}: LOAFormProps) {
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showError, showSuccess } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [pocs, setPocs] = useState<POC[]>([]);
  const [inspectionAgencies, setInspectionAgencies] = useState<InspectionAgency[]>([]);
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const { getSites } = useSites();
  const { getAllTenders } = useTenders();
  const { getPocs, createPoc } = usePocs();
  const { getInspectionAgencies, createInspectionAgency } = useInspectionAgencies();
  const { getAllFDRs } = useFDRs();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(currentStep);
  const [showAddPocDialog, setShowAddPocDialog] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [showAddInspectionAgencyDialog, setShowAddInspectionAgencyDialog] = useState(false);
  const [newInspectionAgencyName, setNewInspectionAgencyName] = useState('');

  // Step configuration
  const steps = [
    { id: 0, name: 'Basic Info', description: 'LOA details and site selection' },
    { id: 1, name: 'Financial', description: 'EMD, deposits & warranty' },
    { id: 2, name: 'Billing', description: 'Invoice and payment details' },
    { id: 3, name: 'Order Details', description: 'Additional information' }
  ];
  
  // Initialize form with React Hook Form and Zod validation
  const form = useForm<LOAFormData>({
    schema: loaSchema,
    defaultValues: {
      siteId: initialData?.siteId ? String(initialData.siteId) : '',
      loaNumber: initialData?.loaNumber || '',
      loaValue: initialData?.loaValue || 0,
      deliveryPeriod: {
        start: initialData?.deliveryPeriod?.start ? new Date(initialData.deliveryPeriod.start) : new Date(),
        end: initialData?.deliveryPeriod?.end ? new Date(initialData.deliveryPeriod.end) : new Date(),
      },
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
      orderReceivedDate: initialData?.orderReceivedDate ? new Date(initialData.orderReceivedDate) : null,
      workDescription: initialData?.workDescription || '',
      tags: initialData?.tags || [],
      status: initialData?.status || 'NOT_STARTED',
      remarks: initialData?.remarks || '',
      tenderNo: initialData?.tenderNo || '',
      tenderId: initialData?.tenderId || '',
      pocId: initialData?.pocId || '',
      inspectionAgencyId: initialData?.inspectionAgencyId || '',
      fdBgDetails: initialData?.fdBgDetails || '',
      hasEmd: initialData?.hasEmd || false,
      emdAmount: initialData?.emdAmount || null,
      hasSd: initialData?.hasSd || false,
      sdFdrId: initialData?.sdFdrId || null,
      hasPg: initialData?.hasPg || false,
      pgFdrId: initialData?.pgFdrId || null,
      // Warranty fields
      warrantyPeriodMonths: initialData?.warrantyPeriodMonths || null,
      warrantyPeriodYears: initialData?.warrantyPeriodYears || null,
      warrantyStartDate: initialData?.warrantyStartDate ? new Date(initialData.warrantyStartDate) : null,
      warrantyEndDate: initialData?.warrantyEndDate ? new Date(initialData.warrantyEndDate) : null,
      // Billing fields
      invoiceNumber: initialData?.invoiceNumber || '',
      invoiceAmount: initialData?.invoiceAmount || null,
      billLinks: initialData?.billLinks || '',
    },
  });
  // Fetch available sites and tenders on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch all sites, active tenders, POCs, and Inspection Agencies without pagination limit for dropdown
        const [sitesResponse, tendersResponse, pocsResponse, inspectionAgenciesResponse, fdrsResponse] = await Promise.all([
          getSites({ limit: 1000 }),
          getAllTenders('ACTIVE'),
          getPocs({ limit: 1000 }),
          getInspectionAgencies({ limit: 1000 }),
          getAllFDRs()
        ]);
        setSites(sitesResponse?.sites || []);
        setTenders(tendersResponse || []);
        setPocs(pocsResponse?.pocs || []);
        setInspectionAgencies(inspectionAgenciesResponse?.inspectionAgencies || []);
        setFdrs(fdrsResponse || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSites([]);
        setTenders([]);
        setPocs([]);
        setFdrs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        siteId: initialData.siteId ? String(initialData.siteId) : '',
        loaNumber: initialData.loaNumber || '',
        loaValue: initialData.loaValue || 0,
        deliveryPeriod: {
          start: initialData.deliveryPeriod?.start ? new Date(initialData.deliveryPeriod.start) : new Date(),
          end: initialData.deliveryPeriod?.end ? new Date(initialData.deliveryPeriod.end) : new Date(),
        },
        dueDate: initialData.dueDate ? new Date(initialData.dueDate) : null,
        orderReceivedDate: initialData.orderReceivedDate ? new Date(initialData.orderReceivedDate) : null,
        workDescription: initialData.workDescription || '',
        tags: initialData.tags || [],
        status: initialData.status || 'NOT_STARTED',
        remarks: initialData.remarks || '',
        tenderNo: initialData.tenderNo || '',
        tenderId: initialData.tenderId || '',
        pocId: initialData.pocId || '',
        fdBgDetails: initialData.fdBgDetails || '',
        hasEmd: initialData.hasEmd || false,
        emdAmount: initialData.emdAmount || null,
        hasSd: initialData.hasSd || false,
        sdFdrId: initialData.sdFdrId || null,
        hasPg: initialData.hasPg || false,
        pgFdrId: initialData.pgFdrId || null,
        warrantyPeriodMonths: initialData.warrantyPeriodMonths || null,
        warrantyPeriodYears: initialData.warrantyPeriodYears || null,
        warrantyStartDate: initialData.warrantyStartDate ? new Date(initialData.warrantyStartDate) : null,
        warrantyEndDate: initialData.warrantyEndDate ? new Date(initialData.warrantyEndDate) : null,
        invoiceNumber: initialData.invoiceNumber || '',
        invoiceAmount: initialData.invoiceAmount || null,
        billLinks: initialData.billLinks || '',
        documentFile: undefined,
        invoicePdfFile: undefined,
      });
    }
  }, [initialData]);

  // Watch for changes to checkboxes
  const hasEmd = form.watch("hasEmd");
  const hasSd = form.watch("hasSd");
  const hasPg = form.watch("hasPg");
  const selectedSiteId = form.watch("siteId");
  const selectedTenderId = form.watch("tenderId");

  // Clear EMD amount when EMD checkbox is unchecked
  useEffect(() => {
    if (!hasEmd) {
      form.setValue('emdAmount', null);
    }
  }, [hasEmd, form]);

  // Clear SD FDR when SD checkbox is unchecked
  useEffect(() => {
    if (!hasSd) {
      form.setValue('sdFdrId', null);
    }
  }, [hasSd, form]);

  // Clear PG FDR when PG checkbox is unchecked
  useEffect(() => {
    if (!hasPg) {
      form.setValue('pgFdrId', null);
    }
  }, [hasPg, form]);

  // Note: Amount pending calculation removed - now done manually at LOA level
  // The calculation is: LOA Value - Actual Amount Received - Amount Deducted

  // Auto-populate EMD from tender when tender is selected
  useEffect(() => {
    if (selectedTenderId && tenders.length > 0) {
      const selectedTender = tenders.find(t => t.id === selectedTenderId);
      if (selectedTender && selectedTender.hasEMD) {
        // Only auto-populate if EMD fields are not already set
        const currentHasEmd = form.getValues('hasEmd');
        const currentEmdAmount = form.getValues('emdAmount');

        if (!currentHasEmd) {
          form.setValue('hasEmd', true);
        }
        if (!currentEmdAmount && selectedTender.emdAmount) {
          form.setValue('emdAmount', selectedTender.emdAmount);
        }
      }
    }
  }, [selectedTenderId, tenders]);

  // Auto-save form data to localStorage every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const currentData = form.getValues();
      // Only save if form has been touched and has data
      if (currentData.loaNumber || currentData.workDescription) {
        try {
          localStorage.setItem('loaFormDraft', JSON.stringify({
            ...currentData,
            // Exclude file objects as they can't be serialized
            documentFile: undefined,
            invoicePdfFile: undefined,
            deliveryPeriod: {
              start: currentData.deliveryPeriod.start?.toISOString(),
              end: currentData.deliveryPeriod.end?.toISOString(),
            },
            dueDate: currentData.dueDate?.toISOString(),
            orderReceivedDate: currentData.orderReceivedDate?.toISOString(),
            warrantyStartDate: currentData.warrantyStartDate?.toISOString(),
            warrantyEndDate: currentData.warrantyEndDate?.toISOString(),
            savedAt: new Date().toISOString(),
          }));
        } catch (error) {
          console.error('Error auto-saving form:', error);
        }
      }
    }, 30000); // Save every 30 seconds

    // Clear auto-save interval on unmount
    return () => {
      clearInterval(autoSaveInterval);
    };
  }, []);

  // Load draft from localStorage on mount if no initialData
  useEffect(() => {
    if (!initialData) {
      try {
        const savedDraft = localStorage.getItem('loaFormDraft');
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          // Ask user if they want to restore the draft
          const shouldRestore = window.confirm('A saved draft was found. Would you like to restore it?');
          if (shouldRestore) {
            form.reset({
              ...draftData,
              deliveryPeriod: {
                start: draftData.deliveryPeriod?.start ? new Date(draftData.deliveryPeriod.start) : new Date(),
                end: draftData.deliveryPeriod?.end ? new Date(draftData.deliveryPeriod.end) : new Date(),
              },
              dueDate: draftData.dueDate ? new Date(draftData.dueDate) : null,
              orderReceivedDate: draftData.orderReceivedDate ? new Date(draftData.orderReceivedDate) : null,
              warrantyStartDate: draftData.warrantyStartDate ? new Date(draftData.warrantyStartDate) : null,
              warrantyEndDate: draftData.warrantyEndDate ? new Date(draftData.warrantyEndDate) : null,
            });
          } else {
            // Clear the draft if user declines
            localStorage.removeItem('loaFormDraft');
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      
      if (newTag && !form.getValues('tags').includes(newTag)) {
        const currentTags = form.getValues('tags');
        form.setValue('tags', [...currentTags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  // Debug: Log when currentStep changes
  useEffect(() => {
    console.log('Current Step Changed:', {
      currentStep,
      stepName: steps[currentStep]?.name,
      totalSteps: steps.length
    });
  }, [currentStep]);

  // Keep ref in sync with currentStep state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Handle creating a new POC
  const handleCreatePoc = async () => {
    if (!newPocName.trim()) {
      showError('Please enter a POC name');
      return;
    }

    try {
      const newPoc = await createPoc({ name: newPocName.trim() });
      setPocs([...pocs, newPoc]);
      form.setValue('pocId', newPoc.id);
      setNewPocName('');
      setShowAddPocDialog(false);
      showSuccess('POC created successfully');
    } catch (error) {
      // Error already shown by the hook
      console.error('Error creating POC:', error);
    }
  };

  // Handle creating a new Inspection Agency
  const handleCreateInspectionAgency = async () => {
    if (!newInspectionAgencyName.trim()) {
      showError('Please enter an inspection agency name');
      return;
    }

    try {
      const newAgency = await createInspectionAgency({ name: newInspectionAgencyName.trim() });
      setInspectionAgencies([...inspectionAgencies, newAgency]);
      form.setValue('inspectionAgencyId', newAgency.id);
      setNewInspectionAgencyName('');
      setShowAddInspectionAgencyDialog(false);
      showSuccess('Inspection agency created successfully');
    } catch (error) {
      // Error already shown by the hook
      console.error('Error creating inspection agency:', error);
    }
  };

  // Navigate to a specific step
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigate to next step
  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();      // Prevent any default form behavior
    e?.stopPropagation();     // Stop event bubbling

    console.log('handleNext called:', {
      currentStep,
      stepsLength: steps.length,
      canNavigate: currentStep < steps.length - 1,
      nextStep: currentStep + 1
    });
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('Navigated to step:', currentStep + 1);
    } else {
      console.log('Cannot navigate: already at last step');
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    console.log('handlePrevious called:', {
      currentStep,
      canNavigate: currentStep > 0,
      previousStep: currentStep - 1
    });
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('Navigated to step:', currentStep - 1);
    } else {
      console.log('Cannot navigate: already at first step');
    }
  };

  // Handle form submission with comprehensive validation
  const handleSubmit = async (data: LOAFormData) => {
    try {
      setIsSubmitting(true);

      // Only allow submission from the last step (Order Details)
      // Use ref to get CURRENT step, not closure value
      const actualCurrentStep = currentStepRef.current;
      if (actualCurrentStep !== steps.length - 1) {
        console.log('Preventing submission - not on last step:', actualCurrentStep);
        setIsSubmitting(false);
        return;
      }

      // Step 0: Basic Info validation
      if (!data.siteId) {
        showError('Please select a site');
        goToStep(0);
        return;
      }

      if (!data.loaNumber || data.loaNumber.trim().length === 0) {
        showError('LOA Number is required');
        goToStep(0);
        return;
      }

      if (!data.loaValue || data.loaValue <= 0) {
        showError('LOA Value must be greater than 0');
        goToStep(0);
        return;
      }

      if (!data.workDescription || data.workDescription.trim().length < 10) {
        showError('Work description must be at least 10 characters');
        goToStep(0);
        return;
      }

      if (!data.deliveryPeriod.start || !data.deliveryPeriod.end) {
        showError('Both delivery start and end dates are required');
        goToStep(0);
        return;
      }

      if (new Date(data.deliveryPeriod.start) >= new Date(data.deliveryPeriod.end)) {
        showError('Delivery start date must be before end date');
        goToStep(0);
        return;
      }

      // Step 1: Financial validation
      if (data.hasEmd && (!data.emdAmount || data.emdAmount <= 0)) {
        showError('EMD amount is required when EMD is checked');
        goToStep(1);
        return;
      }

      // All validations passed, submit the form
      await onSubmit(data);
      // Clear auto-saved draft after successful submission
      localStorage.removeItem('loaFormDraft');
      onClose();
    } catch (error) {
      console.error('Error submitting LOA:', error);
      showError('Failed to create LOA. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build site options ensuring the currently selected site is present
  // Display format: "Customer - Site (Code)" for uniqueness
  // IMPORTANT: This must be before the early return to follow Rules of Hooks
  const siteOptions = useMemo(() => {
    const options = sites.map((s) => ({
      id: String(s.id),
      name: s.name,
      code: s.code,
      customerName: s.zone?.name || 'Unknown Customer',
      displayName: `${s.zone?.name || 'Unknown'} - ${s.name} (${s.code})`
    }));

    // Use selectedSiteId which is already being watched
    if (selectedSiteId && !options.some((o) => o.id === String(selectedSiteId))) {
      // If selected site not in loaded sites, add a placeholder
      options.unshift({
        id: String(selectedSiteId),
        name: initialSiteName || 'Current site',
        code: '',
        customerName: 'Unknown Customer',
        displayName: initialSiteName || 'Current site'
      });
    }

    return options;
  }, [sites, selectedSiteId, initialSiteName]);

  // Build tender options ensuring the currently selected tender is present
  const tenderOptions = useMemo(() => {
    const options = tenders.map((t) => ({
      id: t.id,
      tenderNumber: t.tenderNumber,
      description: t.description,
      dueDate: t.dueDate,
      hasEMD: t.hasEMD,
      emdAmount: t.emdAmount,
      status: t.status,
      displayName: `${t.tenderNumber} - ${t.description.substring(0, 50)}${t.description.length > 50 ? '...' : ''}`
    }));

    return options;
  }, [tenders]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={isSubmitting}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                      currentStep === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : currentStep > index
                        ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                        : "border-muted-foreground/30 bg-background text-muted-foreground hover:border-muted-foreground/50"
                    )}
                  >
                    {currentStep > index ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(index)} 
                    disabled={isSubmitting}
                    className="mt-2 text-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                  >
                    <div
                      className={cn(
                        "text-sm font-medium",
                        currentStep === index
                          ? "text-primary"
                          : currentStep > index
                          ? "text-primary/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </div>
                  </button>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-[2px] flex-1 mx-2 transition-colors",
                      currentStep > index
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
        {/* Site Selection - Searchable Combobox */}
        <FormField
          control={form.control}
          name="siteId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Site</FormLabel>
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

        {/* LOA Number */}
        <FormField
          control={form.control}
          name="loaNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LOA Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter LOA number" {...field} />
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
              <FormDescription>
                Current status of this LOA
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Order Received Date */}
        <FormField
          control={form.control}
          name="orderReceivedDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Order Received Date</FormLabel>
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
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick order received date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Date when this order/LOA was received
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* LOA Value */}
        <FormField
          control={form.control}
          name="loaValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter LOA value"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Period */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="deliveryPeriod.start"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
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
            name="deliveryPeriod.end"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
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
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Due Date */}
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
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
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick due date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Target completion date for this LOA
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Work Description */}
        <FormField
          control={form.control}
          name="workDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter work description"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Document Upload */}
        <FormField
          control={form.control}
          name="documentFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>PO/LOA Document</FormLabel>
              {existingDocumentUrl && (
                <div className="mb-2 p-2 bg-muted rounded-md text-sm">
                  <span className="text-muted-foreground">Current file: </span>
                  <a
                    href={existingDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {getFilenameFromUrl(existingDocumentUrl)}
                  </a>
                </div>
              )}
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => onChange(e.target.files?.[0])}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {existingDocumentUrl ? 'Upload a new file to replace the existing document' : 'Upload LOA document'}
              </FormDescription>
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
                  <Input
                    placeholder="Type tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInput}
                  />
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tender Selection - Searchable Combobox */}
        <FormField
          control={form.control}
          name="tenderId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Associated Tender (Optional)</FormLabel>
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
                        ? tenderOptions.find((tender) => tender.id === field.value)?.displayName || "Select tender..."
                        : "Select tender..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tender..." />
                    <CommandEmpty>No tender found.</CommandEmpty>
                    <CommandList className="max-h-[250px] overflow-y-auto">
                      <CommandGroup>
                        {tenderOptions.map((tender) => (
                          <CommandItem
                            key={tender.id}
                            value={tender.displayName}
                            onSelect={() => {
                              form.setValue("tenderId", tender.id);
                              // Also set tenderNo for backward compatibility
                              form.setValue("tenderNo", tender.tenderNumber);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                tender.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {tender.displayName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Link this LOA to an awarded tender. EMD details will be auto-populated in the Financial tab.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Display selected tender details */}
        {selectedTenderId && tenderOptions.length > 0 && (() => {
          const selectedTender = tenderOptions.find(t => t.id === selectedTenderId);
          return selectedTender ? (
            <div className="p-4 border rounded-md bg-muted/50 space-y-2">
              <h4 className="text-sm font-semibold">Selected Tender Details</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tender Number:</span>
                  <span className="font-medium">{selectedTender.tenderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{format(new Date(selectedTender.dueDate), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary">{selectedTender.status}</Badge>
                </div>
                {selectedTender.hasEMD && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EMD Amount:</span>
                    <span className="font-medium">₹{selectedTender.emdAmount?.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}
            </div>
          )}

          {/* Step 1: Financial (Guarantees + Warranty) */}
          {currentStep === 1 && (
            <div className="space-y-6">
        {/* EMD Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="text-lg font-semibold">Earnest Money Deposit (EMD)</h3>
          
          <FormField
            control={form.control}
            name="hasEmd"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    EMD Required
                  </FormLabel>
                  <FormDescription>
                    Check this if an EMD is required for this LOA
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {hasEmd && (
            <FormField
              control={form.control}
              name="emdAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EMD Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter EMD amount"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Security Deposit FDR Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="text-lg font-semibold">Security Deposit (FDR)</h3>
          <FormDescription>Link an existing Security Deposit FDR or create a new one</FormDescription>

          {/* Has SD Checkbox */}
          <FormField
            control={form.control}
            name="hasSd"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Security Deposit Required
                  </FormLabel>
                  <FormDescription>
                    Check if this LOA requires a Security Deposit FDR
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {hasSd && (
            <>
          <FormField
            control={form.control}
            name="sdFdrId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Security Deposit FDR</FormLabel>
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
                          ? fdrs.find((fdr) => fdr.id === field.value)
                              ? `${fdrs.find((fdr) => fdr.id === field.value)?.bankName} - ₹${fdrs.find((fdr) => fdr.id === field.value)?.depositAmount} (${fdrs.find((fdr) => fdr.id === field.value)?.category})`
                              : "Select FDR for Security Deposit"
                          : "Select FDR for Security Deposit"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search FDRs..." />
                      <CommandList>
                        <CommandEmpty>No FDR found.</CommandEmpty>
                        <CommandGroup>
                          {fdrs.map((fdr) => (
                            <CommandItem
                              value={fdr.id}
                              key={fdr.id}
                              onSelect={() => {
                                form.setValue("sdFdrId", fdr.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  fdr.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fdr.bankName} - ₹{fdr.depositAmount} ({fdr.category}) - {fdr.status}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select an existing Security Deposit FDR
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate('/fdrs/new?category=SD&returnTo=' + encodeURIComponent(window.location.pathname))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New FDR
          </Button>
            </>
          )}
        </div>

        {/* Performance Guarantee FDR Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="text-lg font-semibold">Performance Guarantee (FDR)</h3>
          <FormDescription>Link an existing Performance Guarantee FDR or create a new one</FormDescription>

          {/* Has PG Checkbox */}
          <FormField
            control={form.control}
            name="hasPg"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Performance Guarantee Required
                  </FormLabel>
                  <FormDescription>
                    Check if this LOA requires a Performance Guarantee FDR
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {hasPg && (
            <>
          <FormField
            control={form.control}
            name="pgFdrId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Performance Guarantee FDR</FormLabel>
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
                          ? fdrs.find((fdr) => fdr.id === field.value)
                              ? `${fdrs.find((fdr) => fdr.id === field.value)?.bankName} - ₹${fdrs.find((fdr) => fdr.id === field.value)?.depositAmount} (${fdrs.find((fdr) => fdr.id === field.value)?.category})`
                              : "Select FDR for Performance Guarantee"
                          : "Select FDR for Performance Guarantee"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search FDRs..." />
                      <CommandList>
                        <CommandEmpty>No FDR found.</CommandEmpty>
                        <CommandGroup>
                          {fdrs.map((fdr) => (
                            <CommandItem
                              value={fdr.id}
                              key={fdr.id}
                              onSelect={() => {
                                form.setValue("pgFdrId", fdr.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  fdr.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fdr.bankName} - ₹{fdr.depositAmount} ({fdr.category}) - {fdr.status}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select an existing Performance Guarantee FDR
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate('/fdrs/new?category=PG&returnTo=' + encodeURIComponent(window.location.pathname))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New FDR
          </Button>
            </>
          )}
        </div>

        {/* Warranty Period Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="text-lg font-semibold">Warranty Period</h3>
          <p className="text-sm text-muted-foreground">Optional warranty period information for this LOA</p>

          {/* Warranty Period - Months and Years */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="warrantyPeriodMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty Period (Months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 6"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of months for warranty
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warrantyPeriodYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty Period (Years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 2"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of years for warranty
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Warranty Start and End Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="warrantyStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Warranty Start Date</FormLabel>
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
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick start date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When warranty period starts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warrantyEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Warranty End Date</FormLabel>
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
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When warranty period ends
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
            </div>
          )}

          {/* Step 2: Billing & Invoices */}
          {currentStep === 2 && (
            <div className="space-y-6">
        {/* Billing Information Section */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="text-lg font-semibold">Billing Information</h3>
          <p className="text-sm text-muted-foreground">Optional billing and invoice details for this LOA</p>

          {/* Invoice Number */}
          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Invoice Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., EM-22-23-E-1317"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Financial Fields */}
          <FormField
            control={form.control}
            name="invoiceAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Invoice Amount (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Invoice PDF Upload */}
          <FormField
            control={form.control}
            name="invoicePdfFile"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>Invoice PDF Document</FormLabel>
                {existingInvoicePdfUrl && (
                  <div className="mb-2 p-2 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">Current file: </span>
                    <a
                      href={existingInvoicePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {getFilenameFromUrl(existingInvoicePdfUrl)}
                    </a>
                  </div>
                )}
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => onChange(e.target.files?.[0])}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {existingInvoicePdfUrl ? 'Upload a new PDF to replace the existing invoice' : 'Upload invoice PDF document (PDF format only)'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
            </div>
          )}

          {/* Step 3: Order Details & Notes */}
          {currentStep === 3 && (
            <div className="space-y-6">
          {/* Order Information Section */}
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="text-lg font-semibold">Order Details & Additional Information</h3>
            <p className="text-sm text-muted-foreground">Point of contact and additional order details</p>

            {/* POC Selection - Searchable Combobox with Add New */}
            <FormField
              control={form.control}
              name="pocId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Point of Contact (POC)</FormLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "flex-1 justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? pocs.find((poc) => poc.id === field.value)?.name || "Select POC..."
                              : "Select POC..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search POC..." />
                          <CommandEmpty>No POC found.</CommandEmpty>
                          <CommandList className="max-h-[250px] overflow-y-auto">
                            <CommandGroup>
                              {pocs.map((poc) => (
                                <CommandItem
                                  key={poc.id}
                                  value={poc.name}
                                  onSelect={() => {
                                    form.setValue("pocId", poc.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      poc.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {poc.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddPocDialog(true)}
                      title="Add new POC"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription>
                    Select or create a new point of contact
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inspection Agency Selection - Searchable Combobox with Add New */}
            <FormField
              control={form.control}
              name="inspectionAgencyId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inspection Agency</FormLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "flex-1 justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? inspectionAgencies.find((agency) => agency.id === field.value)?.name || "Select Inspection Agency..."
                              : "Select Inspection Agency..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search Inspection Agency..." />
                          <CommandEmpty>No Inspection Agency found.</CommandEmpty>
                          <CommandList className="max-h-[250px] overflow-y-auto">
                            <CommandGroup>
                              {inspectionAgencies.map((agency) => (
                                <CommandItem
                                  key={agency.id}
                                  value={agency.name}
                                  onSelect={() => {
                                    form.setValue("inspectionAgencyId", agency.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      agency.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {agency.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddInspectionAgencyDialog(true)}
                      title="Add new Inspection Agency"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription>
                    Select or create a new inspection agency
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* FD/BG Details */}
            <FormField
              control={form.control}
              name="fdBgDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FD/BG Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter fixed deposit or bank guarantee details"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Details about fixed deposits or bank guarantees
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remarks */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="General remarks about this LOA"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    General notes and remarks for this LOA
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
            </div>
          )}
        </div>

        {/* Form Navigation - Step-based navigation */}
        <div className="sticky bottom-0 bg-background pt-6 pb-2 border-t mt-6 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>

          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNext(e);
                }}
                disabled={isSubmitting}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  initialData ? 'Update LOA' : 'Create LOA'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>

    {/* Add POC Dialog */}
    <Dialog open={showAddPocDialog} onOpenChange={setShowAddPocDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Point of Contact</DialogTitle>
          <DialogDescription>
            Create a new point of contact (POC) for this order
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="poc-name" className="text-sm font-medium">
              POC Name
            </label>
            <Input
              id="poc-name"
              placeholder="Enter POC name"
              value={newPocName}
              onChange={(e) => setNewPocName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreatePoc();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowAddPocDialog(false);
              setNewPocName('');
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCreatePoc}>
            Create POC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Inspection Agency Dialog */}
    <Dialog open={showAddInspectionAgencyDialog} onOpenChange={setShowAddInspectionAgencyDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Inspection Agency</DialogTitle>
          <DialogDescription>
            Create a new inspection agency for this order
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="inspection-agency-name" className="text-sm font-medium">
              Inspection Agency Name
            </label>
            <Input
              id="inspection-agency-name"
              placeholder="Enter inspection agency name"
              value={newInspectionAgencyName}
              onChange={(e) => setNewInspectionAgencyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateInspectionAgency();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowAddInspectionAgencyDialog(false);
              setNewInspectionAgencyName('');
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateInspectionAgency}>
            Create Inspection Agency
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}