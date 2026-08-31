import type { TranscriptionDetail } from "../../api/get-transcription.query";
import { formatTranscriptionLanguages } from "../../transcription-formatters";
import { DetailGrid, DetailItem, DetailTab } from "./detail-components";

export function ParamsTab({ transcription }: { transcription: TranscriptionDetail }) {
  return (
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
  );
}

function formatOptionalBoolean(value: boolean | null) {
  if (value === null) return "—";
  return value ? "Enabled" : "Disabled";
}
