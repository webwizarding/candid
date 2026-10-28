"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatWeekday, fromKey, WEEKDAYS_SHORT } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BILLABLE_COLOR, formatHours, NON_BILLABLE_COLOR } from "./shared";

export type DayTotal = { date: string; billable: number; nonBillable: number };

const PLOT_HEIGHT = 132;
const TARGET = 8 * 60;

export function WeekChart({
  days,
  today,
  onSelectDay,
}: {
  days: DayTotal[];
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const max = Math.max(TARGET, ...days.map((d) => d.billable + d.nonBillable));
  const px = (minutes: number) => Math.round((minutes / max) * PLOT_HEIGHT);
  const targetY = px(TARGET);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative" style={{ height: PLOT_HEIGHT + 20 }}>
        {/* 8h reference line */}
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-dashed border-hairline"
          style={{ bottom: targetY }}
        >
          <span className="t-12 absolute -top-2 right-0 bg-surface pl-1.5 text-section">8h</span>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-hairline" />
        <div className="relative grid h-full grid-cols-7 gap-1 pr-6 sm:gap-2">
          {days.map((d) => {
            const total = d.billable + d.nonBillable;
            const bH = px(d.billable);
            const nH = px(d.nonBillable);
            return (
              <Tooltip key={d.date}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectDay(d.date)}
                    disabled={!total}
                    aria-label={`${formatWeekday(d.date)}: ${formatHours(total)}`}
                    className="group flex h-full flex-col items-center justify-end rounded-md outline-none focus-visible:ring-3 focus-visible:ring-brand/15 disabled:cursor-default"
                  >
                    {total > 0 && (
                      <span className="t-12 mb-1.5 whitespace-nowrap text-fg-2 tabular-nums transition-colors duration-150 hover-fine:group-hover:text-fg">
                        {/* Phones: "7.5h" keeps seven labels inside their columns */}
                        <span className="sm:hidden">{compactHours(total)}</span>
                        <span className="max-sm:hidden">{formatHours(total)}</span>
                      </span>
                    )}
                    <span className="flex w-full max-w-7 flex-col justify-end gap-[2px]">
                      {nH > 0 && (
                        <span
                          className="block w-full rounded-t-[4px]"
                          style={{ height: Math.max(nH, 2), background: NON_BILLABLE_COLOR }}
                        />
                      )}
                      {bH > 0 && (
                        <span
                          className={cn("block w-full", nH > 0 ? "" : "rounded-t-[4px]")}
                          style={{ height: Math.max(bH, 2), background: BILLABLE_COLOR }}
                        />
                      )}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4} className="flex-col items-start gap-1.5 py-2">
                  <span className="t-12 opacity-70">{formatWeekday(d.date)}</span>
                  <span className="t-12 flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px]" style={{ background: BILLABLE_COLOR }} />
                    Billable {formatHours(d.billable)}
                  </span>
                  <span className="t-12 flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px]" style={{ background: NON_BILLABLE_COLOR }} />
                    Non-billable {formatHours(d.nonBillable)}
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 pr-6 sm:gap-2">
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className={cn("t-12-tight", isToday ? "text-brand" : "text-dayname")}>
                {WEEKDAYS_SHORT[fromKey(d.date).getDay()]}
              </span>
              <span
                className={cn(
                  "t-14 flex size-6 items-center justify-center rounded-md",
                  isToday ? "accent-badge" : "text-fg",
                )}
              >
                {fromKey(d.date).getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 450 → "7.5h", 480 → "8h", 25 → "25m" */
function compactHours(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${Math.round((minutes / 60) * 10) / 10}h`;
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-3">
      <span className="t-12 flex items-center gap-1.5 text-fg-2">
        <span className="size-2 rounded-[2px]" style={{ background: BILLABLE_COLOR }} /> Billable
      </span>
      <span className="t-12 flex items-center gap-1.5 text-fg-2">
        <span className="size-2 rounded-[2px]" style={{ background: NON_BILLABLE_COLOR }} /> Non-billable
      </span>
    </div>
  );
}
