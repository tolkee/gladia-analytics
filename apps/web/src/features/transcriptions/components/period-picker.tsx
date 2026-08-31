import { periods, type Period, type PeriodSelection } from "../period";
import { Button } from "@gladia-analytics/ui/components/button";
import { Calendar } from "@gladia-analytics/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@gladia-analytics/ui/components/popover";
import { Separator } from "@gladia-analytics/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gladia-analytics/ui/components/tabs";
import { cn } from "@gladia-analytics/ui/lib/utils";
import {
  ArrowDown01Icon,
  Calendar03Icon,
  CalendarRangeIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type ComponentProps } from "react";

const periodDetails: Record<Period, { label: string; shortLabel: string }> = {
  "24h": { label: "Last 24 hours", shortLabel: "24 hours" },
  "7d": { label: "Last 7 days", shortLabel: "7 days" },
  "30d": { label: "Last 30 days", shortLabel: "30 days" },
  "90d": { label: "Last 90 days", shortLabel: "90 days" },
  "12m": { label: "Last 12 months", shortLabel: "12 months" },
};

const calendarDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const calendarEndMonth = new Date();
const calendarStartMonth = new Date(calendarEndMonth.getFullYear() - 10, 0, 1);

type CalendarDateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

type PeriodPickerProps = {
  value: PeriodSelection;
  onValueChange: (value: PeriodSelection) => void;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

export function PeriodPicker({ value, onValueChange, size, className }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "calendar">(
    value.type === "custom" ? "calendar" : "quick",
  );
  const [draftRange, setDraftRange] = useState<CalendarDateRange>(() =>
    calendarRangeFromSelection(value),
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setActiveTab(value.type === "custom" ? "calendar" : "quick");
      setDraftRange(calendarRangeFromSelection(value));
    }
  }

  function selectPreset(period: Period) {
    onValueChange({ type: "preset", period });
    setOpen(false);
  }

  function applyCustomRange() {
    if (!draftRange.from) return;

    onValueChange({
      type: "custom",
      from: calendarValueFromDate(draftRange.from),
      to: calendarValueFromDate(draftRange.to ?? draftRange.from),
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            className={cn("w-full justify-between sm:w-auto", className)}
          />
        }
      >
        <HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" strokeWidth={2} />
        {formatPeriodSelectionLabel(value)}
        <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" strokeWidth={2} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="max-h-[min(80svh,44rem)] w-[min(calc(100vw-2rem),32rem)] gap-0 overflow-y-auto p-0"
      >
        <Tabs
          value={activeTab}
          onValueChange={(tab) => setActiveTab(tab === "calendar" ? "calendar" : "quick")}
          className="gap-0"
        >
          <div className="p-2">
            <TabsList className="w-full">
              <TabsTrigger value="quick">Quick select</TabsTrigger>
              <TabsTrigger value="calendar">Custom range</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quick" className="p-2">
            <div className="grid gap-1 sm:grid-cols-2">
              {periods.map((period) => {
                const selected = value.type === "preset" && value.period === period;

                return (
                  <Button
                    key={period}
                    type="button"
                    variant={selected ? "secondary" : "ghost"}
                    className="h-auto justify-start px-3 py-2 text-left"
                    aria-pressed={selected}
                    onClick={() => selectPreset(period)}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {periodDetails[period].label}
                    </span>
                    {selected ? (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Calendar
              mode="range"
              required
              selected={draftRange}
              onSelect={(range) => setDraftRange(range)}
              defaultMonth={draftRange.from}
              numberOfMonths={1}
              captionLayout="dropdown"
              startMonth={calendarStartMonth}
              endMonth={calendarEndMonth}
              disabled={{ after: calendarEndMonth }}
              timeZone={browserTimeZone}
              className="mx-auto"
            />

            <Separator />

            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon
                  icon={CalendarRangeIcon}
                  strokeWidth={2}
                  className="size-4 shrink-0"
                />
                <span className="truncate">{formatDraftRange(draftRange)}</span>
              </div>
              <Button type="button" disabled={!draftRange.from} onClick={applyCustomRange}>
                Apply range
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export function formatPeriodSelectionLabel(selection: PeriodSelection): string {
  if (selection.type === "preset") {
    return periodDetails[selection.period].label;
  }

  const from = dateFromCalendarValue(selection.from);
  const to = dateFromCalendarValue(selection.to);

  if (selection.from === selection.to) {
    return calendarDateFormatter.format(from);
  }

  return `${calendarDateFormatter.format(from)} – ${calendarDateFormatter.format(to)}`;
}

export function formatPeriodSelectionShortLabel(selection: PeriodSelection): string {
  if (selection.type === "preset") {
    return periodDetails[selection.period].shortLabel;
  }

  return formatPeriodSelectionLabel(selection);
}

function calendarRangeFromSelection(selection: PeriodSelection): CalendarDateRange {
  if (selection.type === "custom") {
    return {
      from: dateFromCalendarValue(selection.from),
      to: dateFromCalendarValue(selection.to),
    };
  }

  const to = new Date();
  const from = new Date(to);

  if (selection.period === "24h") from.setHours(from.getHours() - 24);
  if (selection.period === "7d") from.setDate(from.getDate() - 7);
  if (selection.period === "30d") from.setDate(from.getDate() - 30);
  if (selection.period === "90d") from.setDate(from.getDate() - 90);
  if (selection.period === "12m") from.setMonth(from.getMonth() - 12);

  return { from, to };
}

function formatDraftRange(range: CalendarDateRange): string {
  if (!range.from) return "Select a start date";
  if (!range.to) return calendarDateFormatter.format(range.from);
  return `${calendarDateFormatter.format(range.from)} – ${calendarDateFormatter.format(range.to)}`;
}

function calendarValueFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromCalendarValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}
