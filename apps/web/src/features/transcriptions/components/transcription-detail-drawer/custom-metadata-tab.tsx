import { CopyButton } from "#components/copy-button";
import { DetailTab } from "./detail-components";

export function CustomMetadataTab({
  customMetadata,
}: {
  customMetadata: Record<string, unknown> | null;
}) {
  const hasCustomMetadata = customMetadata !== null && Object.keys(customMetadata).length > 0;
  const customMetadataJson = hasCustomMetadata ? JSON.stringify(customMetadata, null, 2) : null;

  return (
    <DetailTab value="custom-metadata">
      {customMetadataJson ? (
        <div className="relative max-h-full">
          <pre className="max-h-full overflow-auto rounded-lg border bg-background p-3 pr-12 font-mono text-xs whitespace-pre-wrap break-words">
            {customMetadataJson}
          </pre>
          <CopyButton
            value={customMetadataJson}
            label="Copy custom metadata"
            className="absolute top-2 right-2"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No custom metadata was supplied.</p>
      )}
    </DetailTab>
  );
}
