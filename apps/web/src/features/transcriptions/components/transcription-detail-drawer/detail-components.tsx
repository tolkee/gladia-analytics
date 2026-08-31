import { TabsContent } from "@gladia-analytics/ui/components/tabs";
import type { ReactNode } from "react";

export function DetailTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsContent value={value} className="min-h-0 overflow-y-auto bg-muted/30 p-4 sm:p-5">
      {children}
    </TabsContent>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

export function DetailItem({
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
