import type { TranscriptionUpload } from "../api/get-transcription-upload.query";
import { Button } from "@gladia-analytics/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gladia-analytics/ui/components/dialog";

type UploadError = NonNullable<TranscriptionUpload["error"]>;

type UploadErrorDialogProps = {
  error: UploadError;
  filename: string;
};

type ValidationIssue = {
  message: string;
  path: string;
};

export function UploadErrorDialog({ error, filename }: UploadErrorDialogProps) {
  const validationIssues = getValidationIssues(error.metadata);

  if (validationIssues.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="link"
            size="xs"
            className="h-auto justify-start px-0 py-0 text-xs"
            aria-label="See more"
            title={`Error details for ${filename}`}
          />
        }
      >
        See more
      </DialogTrigger>

      <DialogContent className="max-h-[min(85vh,48rem)] gap-5 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 leading-snug">{error.message}</DialogTitle>
        </DialogHeader>

        <section aria-label="Error fields">
          <ol className="divide-y">
            {validationIssues.map((issue, index) => (
              <li key={`${issue.path}-${issue.message}-${index}`} className="space-y-1 py-3">
                <code className="block break-all text-xs">{issue.path || "(root)"}</code>
                <p className="text-sm text-muted-foreground">{issue.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function getValidationIssues(metadata: UploadError["metadata"]): ValidationIssue[] {
  if (!Array.isArray(metadata?.issues)) {
    return [];
  }

  return metadata.issues.flatMap((issue) => {
    if (!isRecord(issue) || typeof issue.path !== "string" || typeof issue.message !== "string") {
      return [];
    }

    return [{ path: issue.path, message: issue.message }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
