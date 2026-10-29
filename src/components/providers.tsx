"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-media-query";
import { useAppStore } from "@/stores/app-store";
import { useNotesStore } from "@/stores/notes-store";
import { useSchedulingStore } from "@/stores/scheduling-store";
import { useClubStore } from "@/stores/club-store";
import { useStudentStore } from "@/stores/student-store";
import { useStorageStatus } from "@/lib/local-storage";
import { useCalendarStore } from "@/stores/calendar-store";
import { toKey } from "@/lib/dates";

/** Loads persisted data once the client has hydrated the seed markup. */
function StoreHydrator() {
  useEffect(() => {
    Promise.all([
      useAppStore.persist.rehydrate(),
      useStudentStore.persist.rehydrate(),
      useClubStore.persist.rehydrate(),
      useNotesStore.persist.rehydrate(),
      useSchedulingStore.persist.rehydrate(),
    ])
      .then(() => {
        useCalendarStore.getState().setDate(toKey(new Date()));
        useStorageStatus.setState({ ready: true });
      })
      .catch(() =>
        useStorageStatus.setState({
          ready: true,
          error:
            "Saved data could not be opened. Keep your backup files and export any new changes before closing.",
        }),
      );
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Phones: toasts drop from the top so they never cover bottom bars and sheets.
  const isMobile = useIsMobile();
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={400} skipDelayDuration={300}>
        <StoreHydrator />
        {children}
        <Toaster position={isMobile ? "top-center" : "bottom-right"} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
