import { transcriptionKinds, type TranscriptionKind } from "../api/list-transcriptions.query";
import { formatTranscriptionType } from "../transcription-formatters";
import { Button } from "@gladia-analytics/ui/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@gladia-analytics/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@gladia-analytics/ui/components/popover";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

type TranscriptionFiltersProps = {
  kind?: TranscriptionKind;
  onKindChange: (kind: TranscriptionKind | undefined) => void;
};

type TranscriptionFilterField = "kind";

export function TranscriptionFilters({ kind, onKindChange }: TranscriptionFiltersProps) {
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TranscriptionFilterField | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setActiveFilter(null);
    }
  }

  function applyKind(nextKind: TranscriptionKind) {
    onKindChange(nextKind);
    setOpen(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="sm">
              <HugeiconsIcon icon={FilterIcon} data-icon="inline-start" strokeWidth={2} />
              Add filters
            </Button>
          }
        />

        <PopoverContent align="start" className="w-56 gap-0 overflow-hidden p-0">
          <Command className="rounded-lg! p-0">
            <CommandList>
              {activeFilter === null ? (
                <CommandGroup className="p-0">
                  <CommandItem
                    value="kind"
                    className="rounded-none px-3 py-2"
                    onSelect={() => setActiveFilter("kind")}
                  >
                    Kind
                    <CommandShortcut>
                      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                    </CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              ) : (
                <>
                  <CommandGroup className="p-0">
                    <CommandItem
                      value="back"
                      className="rounded-none px-3 py-2"
                      onSelect={() => setActiveFilter(null)}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                      Kind
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator className="mx-0" />
                  <CommandGroup className="p-0">
                    {transcriptionKinds.map((transcriptionKind) => (
                      <CommandItem
                        key={transcriptionKind}
                        value={transcriptionKind}
                        className="rounded-none px-3 py-2"
                        data-checked={kind === transcriptionKind}
                        onSelect={() => applyKind(transcriptionKind)}
                      >
                        {formatTranscriptionType(transcriptionKind)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {kind ? (
        <div
          role="group"
          aria-label="Applied kind filter"
          className="flex h-7 items-center gap-1 rounded-lg border bg-background pl-2.5 text-xs font-medium"
        >
          <span>
            <span className="font-normal text-muted-foreground">Kind is</span>{" "}
            {formatTranscriptionType(kind)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-l-none"
            aria-label="Remove kind filter"
            onClick={() => onKindChange(undefined)}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </div>
      ) : null}
    </>
  );
}
