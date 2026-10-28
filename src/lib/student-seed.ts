import { createSeed } from "./seed";
import type { AppState } from "./types";

export function createStudentSeed(): AppState {
  const base = createSeed();
  return {
    ...base,
    workspaces: [{ id: "ws-main", name: "My semester" }],
    events: [],
    requests: [],
    holidays: [],
    notifications: [],
    documents: [],
    invoices: [],
    withdrawalMethods: [],
    benefits: [],
    timeEntries: [],
    profile: { ...base.profile, name: "Student", email: "", initials: "S" },
    settings: {
      ...base.settings,
      weekStartsOn: 1,
      timeFormat: "12h",
      dayStartHour: 8,
      showWeekends: true,
    },
  };
}
