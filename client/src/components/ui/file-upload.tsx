import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X, FileText, Image } from "lucide-react";

interface FileUploadProps {
  id: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  value?: File[];
  helpText?: string;
  maxFiles?: number;
}

export function FileUpload({
  id,
  label,
  accept = "image/*",
  multiple = false,
  onChange,
  value = [],
  helpText,
  maxFiles = 10,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>(value);
  const isImage = accept.includes("image");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const newFiles = [...files, ...fileList].slice(0, maxFiles);
      setFiles(newFiles);
      onChange(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onChange(newFiles);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col space-y-2">
        <div
          className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center hover:border-primary transition cursor-pointer"
          onClick={() => document.getElementById(id)?.click()}
        >
          <UploadCloud className="h-12 w-12 text-primary/60 mb-4" />
          <p className="text-sm text-gray-600">
            Arraste e solte seus arquivos aqui, ou clique para selecionar
          </p>
          {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
          <Input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Arquivos selecionados ({files.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative border rounded-md p-2 flex flex-col items-center"
                >
                  {isImage ? (
                    <div className="h-24 w-full flex items-center justify-center overflow-hidden bg-gray-100 rounded">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full object-cover"
                      />
                    </div>
                  ) : (
                    <FileText className="h-12 w-12 text-primary/60" />
                  )}
                  <p className="text-xs text-gray-600 truncate w-full text-center mt-1">
                    {file.name}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-3 -right-3 h-6 w-6 bg-white border shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
