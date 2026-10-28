"use client";

import { useRef, useState } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { useCalendarStore } from "@/stores/calendar-store";
import { DEFAULT_FILTERS, RequestsTable, type RequestFilters } from "./requests-table";
import { StatsPanel } from "./stats-panel";

/** Height of the "Leave and requests" block as drawn in the design (toolbar + header + 4 rows). */
const REQUESTS_PEEK = 321;

export function TimeOffView() {
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const tableRef = useRef<HTMLElement>(null);

  return (
    <div
      data-page-scroll
      onScroll={() => useCalendarStore.getState().popover && useCalendarStore.getState().closePopover()}
      className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto"
    >
      {/* xl+: calendar and stats side by side as designed. Below: stats stack under the calendar. */}
      <div
        className="flex w-full shrink-0 flex-col xl:h-(--workspace-h) xl:flex-row xl:overflow-hidden"
        style={{ "--workspace-h": `max(520px, calc(100% - ${REQUESTS_PEEK}px))` } as React.CSSProperties}
      >
        <div className="flex h-[max(460px,calc(100dvh_-_125px))] w-full shrink-0 md:h-[max(560px,calc(100dvh_-_193px))] xl:h-full xl:w-auto xl:min-w-0 xl:flex-1 xl:shrink">
          <Calendar />
        </div>
        <StatsPanel
          onShowPending={() => {
            setFilters({ ...DEFAULT_FILTERS, statuses: ["pending"] });
            tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>
      <RequestsTable ref={tableRef} filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
