import type { CalEvent } from "./types";
import { addDays, fromKey, toKey } from "./dates";
export type MeetingType = {
  id: string;
  title: string;
  description: string;
  duration: number;
  location: string;
  courseId: string;
  active: boolean;
  buffer: number;
  notice: number;
  horizon: number;
};
export type AvailabilityDay = {
  day: number;
  enabled: boolean;
  start: number;
  end: number;
};
export type Offer = {
  format: "candid-schedule";
  version: 1;
  id: string;
  host: string;
  timezone: string;
  createdAt: string;
  expires: string;
  type: Pick<
    MeetingType,
    "id" | "title" | "description" | "duration" | "location"
  >;
  slots: string[];
};
export type Booking = {
  format: "candid-booking-request";
  version: 1;
  id: string;
  offerId: string;
  typeId: string;
  slot: string;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  eventId?: string;
};
export type SchedulingData = {
  host: string;
  availability: AvailabilityDay[];
  types: MeetingType[];
  offers: Offer[];
  bookings: Booking[];
};
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;
export const iso = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
export function defaultAvailability(): AvailabilityDay[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start: 9 * 60,
    end: 17 * 60,
  }));
}
export function validateType(t: MeetingType): MeetingType {
  if (
    !t ||
    !text(t.id, 100) ||
    !t.id ||
    !text(t.title, 120) ||
    !t.title.trim() ||
    !text(t.description, 2000) ||
    !text(t.location, 500) ||
    !text(t.courseId, 100) ||
    typeof t.active !== "boolean" ||
    ![15, 20, 25, 30, 45, 50, 60, 90, 120].includes(t.duration) ||
    !Number.isInteger(t.buffer) ||
    t.buffer < 0 ||
    t.buffer > 120 ||
    !Number.isInteger(t.notice) ||
    t.notice < 0 ||
    t.notice > 10080 ||
    !Number.isInteger(t.horizon) ||
    t.horizon < 1 ||
    t.horizon > 30
  )
    throw new Error("Invalid meeting type or scheduling rules.");
  return {
    id: t.id,
    title: t.title.trim(),
    description: t.description,
    duration: t.duration,
    location: t.location,
    courseId: t.courseId,
    active: t.active,
    buffer: t.buffer,
    notice: t.notice,
    horizon: t.horizon,
  };
}
export function validateOffer(value: unknown): Offer {
  const o = value as Offer;
  if (
    !o ||
    o.format !== "candid-schedule" ||
    o.version !== 1 ||
    !text(o.id, 100) ||
    !o.id ||
    !text(o.host, 100) ||
    !o.host.trim() ||
    !text(o.timezone, 100) ||
    !iso(o.createdAt) ||
    !iso(o.expires) ||
    o.expires <= o.createdAt ||
    !o.type ||
    !text(o.type.id, 100) ||
    !o.type.id ||
    !text(o.type.title, 120) ||
    !o.type.title.trim() ||
    !text(o.type.description, 2000) ||
    !text(o.type.location, 500) ||
    !Number.isInteger(o.type.duration) ||
    o.type.duration < 15 ||
    o.type.duration > 120 ||
    !Array.isArray(o.slots) ||
    o.slots.length > 1500 ||
    !o.slots.length ||
    !o.slots.every((s) => iso(s) && s >= o.createdAt && s < o.expires) ||
    new Set(o.slots).size !== o.slots.length
  )
    throw new Error("Invalid scheduling file.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: o.timezone }).format();
  } catch {
    throw new Error("The schedule uses an unknown timezone.");
  }
  return {
    format: o.format,
    version: 1,
    id: o.id,
    host: o.host,
    timezone: o.timezone,
    createdAt: o.createdAt,
    expires: o.expires,
    type: {
      id: o.type.id,
      title: o.type.title,
      description: o.type.description,
      duration: o.type.duration,
      location: o.type.location,
    },
    slots: [...o.slots].sort(),
  };
}
export function validateBooking(value: unknown): Booking {
  const b = value as Booking;
  if (
    !b ||
    b.format !== "candid-booking-request" ||
    b.version !== 1 ||
    !text(b.id, 100) ||
    !b.id ||
    !text(b.offerId, 100) ||
    !b.offerId ||
    !text(b.typeId, 100) ||
    !b.typeId ||
    !iso(b.slot) ||
    !iso(b.createdAt) ||
    !text(b.name, 100) ||
    !b.name.trim() ||
    !text(b.contact, 200) ||
    !text(b.message, 2000) ||
    !["pending", "confirmed", "declined", "cancelled"].includes(b.status) ||
    (b.eventId !== undefined && !text(b.eventId, 200))
  )
    throw new Error("Invalid booking request.");
  return {
    format: b.format,
    version: 1,
    id: b.id,
    offerId: b.offerId,
    typeId: b.typeId,
    slot: b.slot,
    name: b.name.trim(),
    contact: b.contact,
    message: b.message,
    createdAt: b.createdAt,
    status: b.status,
    ...(b.eventId ? { eventId: b.eventId } : {}),
  };
}
export function validateScheduling(value: unknown): SchedulingData {
  const s = value as SchedulingData;
  if (
    !s ||
    !text(s.host, 100) ||
    !Array.isArray(s.availability) ||
    s.availability.length !== 7 ||
    !Array.isArray(s.types) ||
    s.types.length > 100 ||
    !Array.isArray(s.offers) ||
    s.offers.length > 100 ||
    !Array.isArray(s.bookings) ||
    s.bookings.length > 2000
  )
    throw new Error("Invalid scheduling backup.");
  const days = new Set<number>();
  const availability = s.availability.map((d) => {
    if (
      !d ||
      !Number.isInteger(d.day) ||
      d.day < 0 ||
      d.day > 6 ||
      days.has(d.day) ||
      typeof d.enabled !== "boolean" ||
      !Number.isInteger(d.start) ||
      !Number.isInteger(d.end) ||
      d.start < 0 ||
      d.end > 1439 ||
      d.end <= d.start
    )
      throw new Error("Invalid weekly availability.");
    days.add(d.day);
    return { day: d.day, enabled: d.enabled, start: d.start, end: d.end };
  });
  const types = s.types.map(validateType),
    offers = s.offers.map(validateOffer),
    bookings = s.bookings.map(validateBooking);
  for (const group of [types, offers, bookings])
    if (new Set(group.map((i) => i.id)).size !== group.length)
      throw new Error("Duplicate scheduling identifiers.");
  return { host: s.host, availability, types, offers, bookings };
}
export function slotConflict(
  start: Date,
  duration: number,
  buffer: number,
  events: CalEvent[],
) {
  const a = start.getTime() - buffer * 60000,
    b = start.getTime() + (duration + buffer) * 60000;
  return events.some((event) => {
    const day = fromKey(event.date);
    const end = fromKey(event.date);
    if (event.allDay) end.setDate(end.getDate() + 1);
    else {
      day.setMinutes(event.start);
      end.setMinutes(event.end);
    }
    return day.getTime() < b && end.getTime() > a;
  });
}
export function availableSlots(
  type: MeetingType,
  availability: AvailabilityDay[],
  events: CalEvent[],
  now = new Date(),
) {
  const slots: string[] = [];
  if (!type.active) return slots;
  for (let offset = 0; offset < type.horizon; offset++) {
    const date = fromKey(addDays(toKey(now), offset));
    const window = availability.find((d) => d.day === date.getDay());
    if (!window?.enabled) continue;
    for (
      let minute = window.start;
      minute + type.duration <= window.end;
      minute += 15
    ) {
      const start = new Date(date);
      start.setMinutes(minute);
      if (
        start.getHours() * 60 + start.getMinutes() !== minute ||
        start.getTime() < now.getTime() + type.notice * 60000
      )
        continue;
      const end = new Date(start.getTime() + type.duration * 60000);
      if (
        toKey(start) !== toKey(end) ||
        end.getHours() * 60 + end.getMinutes() > window.end
      )
        continue;
      if (!slotConflict(start, type.duration, type.buffer, events))
        slots.push(start.toISOString());
      if (slots.length === 1500) return slots;
    }
  }
  return slots;
}
export function createOffer(
  type: MeetingType,
  host: string,
  availability: AvailabilityDay[],
  events: CalEvent[],
  now = new Date(),
): Offer {
  if (!host.trim())
    throw new Error("Add your name in Availability before sharing.");
  const slots = availableSlots(type, availability, events, now);
  if (!slots.length)
    throw new Error(
      "No free times match these rules. Adjust availability or the booking window.",
    );
  const expiry = fromKey(addDays(toKey(now), type.horizon));
  return validateOffer({
    format: "candid-schedule",
    version: 1,
    id: crypto.randomUUID(),
    host: host.trim(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now.toISOString(),
    expires: expiry.toISOString(),
    type: {
      id: type.id,
      title: type.title,
      description: type.description,
      duration: type.duration,
      location: type.location,
    },
    slots,
  });
}
export function bookingEvent(
  booking: Booking,
  offer: Offer,
  type: MeetingType,
  events: CalEvent[],
  now = new Date(),
): CalEvent {
  if (
    !type.active ||
    offer.expires <= now.toISOString() ||
    booking.typeId !== type.id ||
    offer.id !== booking.offerId ||
    !offer.slots.includes(booking.slot) ||
    type.duration !== offer.type.duration ||
    type.title !== offer.type.title ||
    type.description !== offer.type.description ||
    type.location !== offer.type.location
  )
    throw new Error(
      "This schedule changed or expired. Share fresh availability.",
    );
  const start = new Date(booking.slot),
    end = new Date(start.getTime() + type.duration * 60000);
  if (
    start.getTime() < now.getTime() + type.notice * 60000 ||
    toKey(start) !== toKey(end) ||
    slotConflict(start, type.duration, type.buffer, events)
  )
    throw new Error(
      "This time is no longer available. Decline the request and share a fresh schedule.",
    );
  return {
    id: `booking-${booking.id}`,
    title: `${offer.type.title} · ${booking.name}`,
    date: toKey(start),
    start: start.getHours() * 60 + start.getMinutes(),
    end: end.getHours() * 60 + end.getMinutes(),
    allDay: false,
    color: "purple",
    calendarId: type.courseId || "personal",
    kind: "personal",
    location: offer.type.location,
    note: [booking.contact, booking.message].filter(Boolean).join("\n"),
    reminder: 10,
  };
}
export function offerCode(offer: Offer) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateOffer(offer)));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return (
    "candid-schedule-v1:" +
    btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  );
}
export function readOfferCode(code: string) {
  if (code.length > 500000)
    throw new Error("This scheduling code is too large.");
  const raw = code.trim().replace(/^candid-schedule-v1:/, "");
  try {
    return validateOffer(
      JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(
            atob(raw.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0),
          ),
        ),
      ),
    );
  } catch {
    throw new Error("Paste a complete Candid scheduling code.");
  }
}

/** UTC timestamps make confirmed meeting files portable across guest timezones. */
export function bookingIcs(booking: Booking, offer: Offer) {
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const start = new Date(booking.slot),
    end = new Date(start.getTime() + offer.type.duration * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Candid//Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${escape(booking.id)}@candid.local`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(offer.type.title + " · " + booking.name)}`,
    `DESCRIPTION:${escape(offer.type.description)}`,
    `LOCATION:${escape(offer.type.location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
