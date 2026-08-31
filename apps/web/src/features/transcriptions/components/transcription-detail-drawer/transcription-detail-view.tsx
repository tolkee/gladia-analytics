import type { TranscriptionDetail } from "../../api/get-transcription.query";
import {
  formatTranscriptionDate,
  formatTranscriptionDuration,
  formatTranscriptionType,
} from "../../transcription-formatters";
import { TranscriptionStatusBadge } from "../transcription-status-badge";
import { CustomMetadataTab } from "./custom-metadata-tab";
import { FileTab } from "./file-tab";
import { ParamsTab } from "./params-tab";
import { ResultTab } from "./result-tab";
import { Badge } from "@gladia-analytics/ui/components/badge";
import { SheetDescription, SheetHeader, SheetTitle } from "@gladia-analytics/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@gladia-analytics/ui/components/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gladia-analytics/ui/components/tooltip";

export function TranscriptionDetailView({ transcription }: { transcription: TranscriptionDetail }) {
  const displayName =
    transcription.fileName ??
    (transcription.kind === "live" ? "Live transcription" : "Untitled audio");

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

        <ResultTab transcription={transcription} />
        <ParamsTab transcription={transcription} />
        <FileTab transcription={transcription} />
        <CustomMetadataTab customMetadata={transcription.customMetadata} />
      </Tabs>
    </>
  );
}
