import { ChangeEvent, useState, useId } from "react";
import { Button } from "./button";
import { Upload } from "lucide-react";

interface FilePickerProps {
  accept?: string;
  onChange: (file: File | null) => void;
}

export function FilePicker({ accept, onChange }: FilePickerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uniqueId = useId();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setSelectedFile(file);
    onChange(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            const input = document.getElementById(uniqueId) as HTMLInputElement;
            input.click();
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          {selectedFile ? "Change File" : "Upload File"}
        </Button>
        <input
          id={uniqueId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {selectedFile && (
        <div className="text-sm text-muted-foreground">
          Selected: {selectedFile.name}
        </div>
      )}
    </div>
  );
} 