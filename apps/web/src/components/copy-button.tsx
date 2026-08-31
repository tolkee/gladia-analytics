import { Button } from "@gladia-analytics/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gladia-analytics/ui/components/tooltip";
import { cn } from "@gladia-analytics/ui/lib/utils";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({ value, label = "Copy to clipboard", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const accessibleLabel = copied ? "Copied" : label;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={cn("bg-background/90 shadow-sm backdrop-blur", className)}
            aria-label={accessibleLabel}
            onClick={() => void copyValue()}
          />
        }
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent>{accessibleLabel}</TooltipContent>
    </Tooltip>
  );
}
