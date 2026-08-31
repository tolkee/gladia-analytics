import { Button } from "@gladia-analytics/ui/components/button";
import { FileCheckIcon, FileUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState, type DragEvent } from "react";
import { formatFileSize } from "../utils";

type FileDropzoneProps = {
  file: File | null;
  disabled?: boolean;
  errorId?: string;
  onFileChange: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
};

export function FileDropzone({
  file,
  disabled = false,
  errorId,
  onFileChange,
  onInvalidFile,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile) {
      return;
    }

    const isJson =
      selectedFile.type === "application/json" || selectedFile.name.toLowerCase().endsWith(".json");

    if (!isJson) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      onInvalidFile("Select a JSON file containing transcription data.");
      return;
    }

    onFileChange(selectedFile);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);

    if (!disabled) {
      selectFile(event.dataTransfer.files[0]);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id="transcription-upload-file"
        className="peer sr-only"
        type="file"
        accept=".json,application/json"
        disabled={disabled}
        aria-describedby={errorId}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <label
        htmlFor="transcription-upload-file"
        aria-disabled={disabled}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 ${
          isDragging
            ? "border-primary bg-primary/5"
            : file
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border bg-muted/20 hover:border-foreground/35 hover:bg-muted/40"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <span
          className={`mb-5 flex size-14 items-center justify-center rounded-2xl ${
            file ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
          }`}
        >
          <HugeiconsIcon icon={file ? FileCheckIcon : FileUploadIcon} className="size-7" />
        </span>

        {file ? (
          <>
            <span className="max-w-full truncate text-base font-semibold">{file.name}</span>
            <span className="mt-1 text-sm text-muted-foreground">
              {formatFileSize(file.size)} · Click or drop another file to replace it
            </span>
          </>
        ) : (
          <>
            <span className="text-base font-semibold">
              {isDragging ? "Drop the file here" : "Drop a transcription file here"}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              or click to select a JSON file from your computer
            </span>
          </>
        )}
      </label>

      {file ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = "";
              }

              onFileChange(null);
            }}
          >
            Remove file
          </Button>
        </div>
      ) : null}
    </div>
  );
}
