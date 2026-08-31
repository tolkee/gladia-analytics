import type { TranscriptionDetail } from "../../api/get-transcription.query";
import { formatTranscriptionDuration } from "../../transcription-formatters";
import { DetailGrid, DetailItem, DetailTab } from "./detail-components";

export function FileTab({ transcription }: { transcription: TranscriptionDetail }) {
  return (
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
  );
}

function formatCount(value: number | null, singular: string) {
  if (value === null) return "—";
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}
