import { getTranscriptionQuery, type TranscriptionDetail } from "../api/get-transcription.query";
import { CopyButton } from "#components/copy-button";
import {
  formatTranscriptionDate,
  formatTranscriptionDuration,
  formatTranscriptionLanguages,
  formatTranscriptionType,
} from "../transcription-formatters";
import { TranscriptionStatusBadge } from "./transcription-status-badge";
import { Badge } from "@gladia-analytics/ui/components/badge";
import { Button } from "@gladia-analytics/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@gladia-analytics/ui/components/sheet";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gladia-analytics/ui/components/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gladia-analytics/ui/components/tooltip";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

type TranscriptionDetailDrawerProps = {
  userId: string;
  organisationId: string;
  transcriptionId?: string;
  onClose: () => void;
};

export function TranscriptionDetailDrawer({
  userId,
  organisationId,
  transcriptionId,
  onClose,
}: TranscriptionDetailDrawerProps) {
  return (
    <Sheet
      open={transcriptionId !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[calc(100%-0.75rem)] max-w-[42rem] gap-0 overflow-hidden rounded-l-2xl data-[side=right]:sm:inset-y-3 data-[side=right]:sm:right-3 data-[side=right]:sm:h-[calc(100%-1.5rem)] data-[side=right]:sm:max-w-2xl data-[side=right]:sm:rounded-2xl data-[side=right]:sm:border before:absolute before:inset-y-5 before:-left-2 before:hidden before:w-2 before:rounded-l-xl before:border before:bg-muted/90 before:content-[''] after:absolute after:inset-y-9 after:-left-4 after:hidden after:w-2 after:rounded-l-lg after:border after:bg-muted/60 after:content-[''] sm:before:block sm:after:block"
      >
        {transcriptionId ? (
          <TranscriptionDetailContent
            userId={userId}
            organisationId={organisationId}
            transcriptionId={transcriptionId}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TranscriptionDetailContent({
  userId,
  organisationId,
  transcriptionId,
}: Required<Omit<TranscriptionDetailDrawerProps, "onClose">>) {
  const { data, error, isPending, refetch } = useQuery(
    getTranscriptionQuery.options(userId, organisationId, transcriptionId),
  );

  if (isPending) return <TranscriptionDetailSkeleton />;

  if (error) {
    return (
      <>
        <SheetHeader className="border-b pr-14">
          <SheetTitle>Unable to load transcription</SheetTitle>
          <SheetDescription>{error.message}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} className="size-5" strokeWidth={2} />
          </span>
          <div className="max-w-sm space-y-1">
            <p className="font-medium">The transcription details are unavailable</p>
            <p className="text-sm text-muted-foreground">
              It may have been removed, or the request could not be completed.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  return <TranscriptionDetailView transcription={data} />;
}

function TranscriptionDetailView({ transcription }: { transcription: TranscriptionDetail }) {
  const displayName =
    transcription.fileName ??
    (transcription.kind === "live" ? "Live transcription" : "Untitled audio");
  const hasCustomMetadata =
    transcription.customMetadata !== null && Object.keys(transcription.customMetadata).length > 0;
  const customMetadataJson = hasCustomMetadata
    ? JSON.stringify(transcription.customMetadata, null, 2)
    : null;

  return (
    <>
      <SheetHeader className="bg-background/95 pr-14 backdrop-blur">
        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <TranscriptionStatusBadge status={transcription.status} />
            <Badge variant="outline">{formatTranscriptionType(transcription.kind)}</Badge>
            <Tooltip>
              <TooltipTrigger render={<Badge variant="outline" className="tabular-nums" />}>
                <span className="font-normal text-muted-foreground">Duration:</span>
                {formatTranscriptionDuration(transcription.fileAudioDuration)}
              </TooltipTrigger>
              <TooltipContent className="flex-col items-start">
                <span>Start: {formatTranscriptionDate(transcription.createdAt)}</span>
                <span>End: {formatTranscriptionDate(transcription.completedAt)}</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <SheetTitle className="truncate text-lg">{displayName}</SheetTitle>
          <SheetDescription className="mt-1 truncate font-mono text-xs">
            {transcription.id}
          </SheetDescription>
        </div>
      </SheetHeader>

      <Tabs defaultValue="result" className="min-h-0 flex-1 gap-0">
        <TabsList
          variant="line"
          className="w-full flex-none justify-start overflow-x-auto border-b bg-background px-4 group-data-horizontal/tabs:h-11"
        >
          <TabsTrigger value="result" className="flex-none">
            Result
          </TabsTrigger>
          <TabsTrigger value="params" className="flex-none">
            Params
          </TabsTrigger>
          <TabsTrigger value="file" className="flex-none">
            File
          </TabsTrigger>
          <TabsTrigger value="custom-metadata" className="flex-none">
            Custom Metadata
          </TabsTrigger>
        </TabsList>

        <DetailTab value="result">
          {transcription.errorCode ? (
            <p className="font-mono text-sm text-destructive">{transcription.errorCode}</p>
          ) : (
            <DetailGrid>
              <DetailItem
                label="Audio duration"
                value={formatTranscriptionDuration(transcription.resultAudioDuration)}
              />
              <DetailItem
                label="Distinct channels"
                value={formatCount(transcription.resultNumberOfDistinctChannels, "channel")}
              />
              <DetailItem
                label="Billing time"
                value={formatTranscriptionDuration(transcription.resultBillingTime)}
              />
              <DetailItem
                label="Transcription time"
                value={formatTranscriptionDuration(transcription.resultTranscriptionTime)}
              />
            </DetailGrid>
          )}
        </DetailTab>

        <DetailTab value="params">
          <DetailGrid>
            <DetailItem label="Model" value={transcription.model} mono />
            <DetailItem
              label="Language detection"
              value={formatOptionalBoolean(transcription.detectLanguage)}
            />
            <DetailItem
              label="Languages"
              value={formatTranscriptionLanguages(transcription.languages)}
            />
            <DetailItem
              label="Code switching"
              value={formatOptionalBoolean(transcription.codeSwitching)}
            />
          </DetailGrid>
        </DetailTab>

        <DetailTab value="file">
          <DetailGrid>
            <DetailItem label="File name" value={transcription.fileName} wide />
            <DetailItem label="File ID" value={transcription.fileId} mono wide />
            <DetailItem label="Source" value={transcription.fileSource} mono wide />
            <DetailItem
              label="Audio duration"
              value={formatTranscriptionDuration(transcription.fileAudioDuration)}
            />
            <DetailItem
              label="Number of channels"
              value={formatCount(transcription.fileNumberOfChannels, "channel")}
            />
          </DetailGrid>
        </DetailTab>

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
      </Tabs>
    </>
  );
}

function TranscriptionDetailSkeleton() {
  return (
    <>
      <SheetHeader className="pr-14">
        <SheetTitle className="sr-only">Loading transcription</SheetTitle>
        <SheetDescription className="sr-only">
          Loading the selected transcription details.
        </SheetDescription>
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
      </SheetHeader>
      <div className="border-b bg-background px-4 py-2" aria-hidden="true">
        <Skeleton className="h-7 w-4/5" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4" aria-hidden="true">
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </>
  );
}

function DetailTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsContent value={value} className="min-h-0 overflow-y-auto bg-muted/30 p-4 sm:p-5">
      {children}
    </TabsContent>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

function DetailItem({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function formatCount(value: number | null, singular: string) {
  if (value === null) return "—";
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

function formatOptionalBoolean(value: boolean | null) {
  if (value === null) return "—";
  return value ? "Enabled" : "Disabled";
}
