import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  availableSlots,
  defaultAvailability,
  createOffer,
  validateOffer,
  validateBooking,
  bookingEvent,
  bookingIcs,
  offerCode,
  readOfferCode,
  type MeetingType,
} from "./scheduling";
import { standaloneBookingPage } from "./booking-page";
import { useSchedulingStore } from "@/stores/scheduling-store";
import { useAppStore } from "@/stores/app-store";
const now = new Date(2026, 9, 28, 8, 0, 0);
const type: MeetingType = {
  id: "office",
  title: "Office hours",
  description: "Questions welcome",
  duration: 30,
  location: "Library",
  courseId: "",
  active: true,
  buffer: 10,
  notice: 60,
  horizon: 7,
};
const days = defaultAvailability();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  useAppStore.setState({ events: [] });
  useSchedulingStore.setState({
    host: "Host",
    availability: days,
    types: [type],
    offers: [],
    bookings: [],
  });
});
afterEach(() => vi.useRealTimers());
describe("private local scheduling", () => {
  it("exports confirmed calendar times in UTC without guest messages or contact details", () => {
    const offer = createOffer(type, "Host", days, [], now);
    const calendar = bookingIcs(
      {
        format: "candid-booking-request",
        version: 1,
        id: "guest",
        offerId: offer.id,
        typeId: type.id,
        slot: "2026-10-29T17:00:00.000Z",
        name: "Student",
        contact: "PRIVATE_CONTACT",
        message: "PRIVATE_MESSAGE",
        createdAt: now.toISOString(),
        status: "confirmed",
      },
      offer,
    );
    expect(calendar).toContain(
      "DTSTART:20261029T170000Z\r\nDTEND:20261029T173000Z",
    );
    expect(calendar).not.toContain("PRIVATE_");
    expect(calendar).toContain("LOCATION:Library");
  });
  it("uses all calendar events, buffer time and all-day blocks", () => {
    const date = "2026-10-28";
    const events = [
      {
        id: "busy",
        title: "PRIVATE BIOLOGY NOTES",
        date,
        start: 600,
        end: 660,
        allDay: false,
        color: "purple" as const,
        calendarId: "hidden-course",
      },
    ];
    const slots = availableSlots(type, days, events, now).map(
      (s) => new Date(s),
    );
    expect(
      slots.some(
        (s) => s.getDate() === 28 && s.getHours() === 9 && s.getMinutes() === 0,
      ),
    ).toBe(true);
    expect(
      slots.some(
        (s) =>
          s.getDate() === 28 && s.getHours() === 9 && s.getMinutes() === 30,
      ),
    ).toBe(false);
    expect(
      slots.some(
        (s) =>
          s.getDate() === 28 && s.getHours() === 11 && s.getMinutes() === 0,
      ),
    ).toBe(false);
    const blocked = availableSlots(
      type,
      days,
      [{ ...events[0], allDay: true }],
      now,
    );
    expect(blocked.some((s) => new Date(s).getDate() === 28)).toBe(false);
    expect(
      JSON.stringify(createOffer(type, "Host", days, events, now)),
    ).not.toContain("PRIVATE BIOLOGY NOTES");
  });
  it("sanitizes share files and round trips self-contained codes", () => {
    const offer = createOffer(type, "Host", days, [], now);
    expect(readOfferCode(offerCode(offer))).toEqual(offer);
    expect(
      validateOffer({ ...offer, privateNotes: "SECRET" }),
    ).not.toHaveProperty("privateNotes");
    expect(() =>
      validateOffer({ ...offer, slots: ["2026-02-30T10:00:00.000Z"] }),
    ).toThrow();
    expect(() => validateBooking({})).toThrow();
  });
  it("checks fresh availability and prevents duplicate confirmations", () => {
    const offer = useSchedulingStore.getState().share(type.id);
    const request = {
      format: "candid-booking-request",
      version: 1,
      id: "guest-1",
      offerId: offer.id,
      typeId: type.id,
      slot: offer.slots[0],
      name: "Student",
      contact: "",
      message: "A question",
      createdAt: now.toISOString(),
      status: "confirmed",
    };
    useSchedulingStore.getState().receive(request);
    expect(useSchedulingStore.getState().bookings[0].status).toBe("pending");
    useSchedulingStore.getState().confirm("guest-1");
    expect(useAppStore.getState().events).toHaveLength(1);
    expect(() => useSchedulingStore.getState().confirm("guest-1")).toThrow();
    expect(() =>
      useSchedulingStore.getState().receive({
        ...request,
        id: "guest-2",
        slot: new Date(2026, 9, 28, 3).toISOString(),
      }),
    ).toThrow();
    useSchedulingStore.getState().receive({ ...request, id: "guest-2" });
    expect(() => useSchedulingStore.getState().confirm("guest-2")).toThrow();
  });
  it("rejects requests after host hours or type availability change", () => {
    const offer = useSchedulingStore.getState().share(type.id);
    useSchedulingStore.getState().receive({
      format: "candid-booking-request",
      version: 1,
      id: "request",
      offerId: offer.id,
      typeId: type.id,
      slot: offer.slots[0],
      name: "Student",
      contact: "",
      message: "",
      createdAt: now.toISOString(),
      status: "pending",
    });
    useSchedulingStore.getState().setAvailability(
      "Host",
      days.map((d) => ({ ...d, enabled: false })),
    );
    expect(() => useSchedulingStore.getState().confirm("request")).toThrow(
      "availability changed",
    );
    expect(() =>
      bookingEvent(
        useSchedulingStore.getState().bookings[0],
        offer,
        { ...type, active: false },
        [],
        now,
      ),
    ).toThrow();
  });
  it("creates an offline booking page without injecting host content into scripts", () => {
    const offer = createOffer(
      { ...type, title: "</script><img src=x onerror=alert(1)>" },
      "Host",
      days,
      [],
      now,
    );
    const html = standaloneBookingPage(offer);
    expect(html).not.toContain("</script><img");
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain("fetch(");
    expect(html).toContain("candid-booking-request.json");
  });
});
