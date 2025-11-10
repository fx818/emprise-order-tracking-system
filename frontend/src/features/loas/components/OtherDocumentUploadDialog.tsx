import { useState } from 'react';
import { useForm } from '../../../hooks/use-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../components/ui/form';
import { otherDocumentSchema, type OtherDocumentFormData } from '../types/loa';
import { useToast } from '../../../hooks/use-toast-app';

interface OtherDocumentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OtherDocumentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function OtherDocumentUploadDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: OtherDocumentUploadDialogProps) {
  const { showError } = useToast();
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const form = useForm<OtherDocumentFormData>({
    schema: otherDocumentSchema,
    defaultValues: {
      title: '',
      documentFile: undefined,
    },
  });

  const handleSubmit = async (data: OtherDocumentFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      setSelectedFileName('');
      onClose();
    } catch (error) {
      console.error('Error uploading other document:', error);
      showError('Failed to upload document');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (file: File | undefined) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      onChange(file);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedFileName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Other Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Document Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Invoice Copy, Compliance Certificate"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document File */}
            <FormField
              control={form.control}
              name="documentFile"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Document File *</FormLabel>
                  <FormControl>
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange(e, onChange)}
                        disabled={isSubmitting}
                        {...field}
                      />
                      {selectedFileName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected: {selectedFileName}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
