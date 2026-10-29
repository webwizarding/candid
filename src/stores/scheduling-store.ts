"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localStorageAdapter, useStorageStatus } from "@/lib/local-storage";
import { useAppStore } from "./app-store";
import {
  availableSlots,
  bookingEvent,
  createOffer,
  defaultAvailability,
  validateBooking,
  validateScheduling,
  validateType,
  type MeetingType,
  type SchedulingData,
  type Offer,
  type AvailabilityDay,
} from "@/lib/scheduling";
type State = SchedulingData & {
  saveType: (type: MeetingType) => void;
  setAvailability: (host: string, days: AvailabilityDay[]) => void;
  share: (id: string) => Offer;
  receive: (request: unknown) => void;
  confirm: (id: string) => void;
  setBookingStatus: (id: string, status: "declined" | "cancelled") => void;
  merge: (data: SchedulingData) => void;
};
export const useSchedulingStore = create<State>()(
  persist(
    (set, get) => {
      const save = (next: SchedulingData) => set(validateScheduling(next));
      return {
        host: "",
        availability: defaultAvailability(),
        types: [],
        offers: [],
        bookings: [],
        saveType: (type) => {
          const next = validateType(type);
          save({
            ...get(),
            types: [...get().types.filter((t) => t.id !== next.id), next],
          });
        },
        setAvailability: (host, availability) =>
          save({ ...get(), host, availability }),
        share: (id) => {
          const s = get();
          const type = s.types.find((t) => t.id === id);
          if (!type) throw new Error("Choose a meeting type.");
          const offer = createOffer(
            type,
            s.host,
            s.availability,
            useAppStore.getState().events,
          );
          save({ ...s, offers: [...s.offers.slice(-99), offer] });
          return offer;
        },
        receive: (input) => {
          const b = validateBooking(input),
            s = get();
          if (s.bookings.some((x) => x.id === b.id))
            throw new Error("This booking request is already in your inbox.");
          const offer = s.offers.find((o) => o.id === b.offerId);
          if (
            !offer ||
            offer.type.id !== b.typeId ||
            !offer.slots.includes(b.slot)
          )
            throw new Error(
              "This request does not match a schedule shared by this device.",
            );
          save({
            ...s,
            bookings: [
              ...s.bookings,
              { ...b, status: "pending", eventId: undefined },
            ],
          });
        },
        confirm: (id) => {
          const s = get(),
            b = s.bookings.find((b) => b.id === id);
          if (!b || b.status !== "pending")
            throw new Error("Choose a pending request.");
          const offer = s.offers.find((o) => o.id === b.offerId),
            type = s.types.find((t) => t.id === b.typeId);
          if (!offer || !type)
            throw new Error("The original schedule is no longer available.");
          if (
            Intl.DateTimeFormat().resolvedOptions().timeZone !== offer.timezone
          )
            throw new Error(
              "Your timezone changed. Share a fresh schedule before confirming.",
            );
          const events = useAppStore.getState().events;
          if (!availableSlots(type, s.availability, events).includes(b.slot))
            throw new Error(
              "Your availability changed. Decline this request and share fresh times.",
            );
          const event = bookingEvent(b, offer, type, events);
          const next = validateScheduling({
            ...s,
            bookings: s.bookings.map((x) =>
              x.id === id
                ? { ...x, status: "confirmed", eventId: event.id }
                : x,
            ),
          });
          useAppStore.getState().saveEvent(event);
          save(next);
        },
        setBookingStatus: (id, status) => {
          const s = get(),
            booking = s.bookings.find((b) => b.id === id);
          if (!booking) return;
          if (status === "declined" && booking.status !== "pending")
            throw new Error("Only pending requests can be declined.");
          if (status === "cancelled" && booking.status !== "confirmed")
            throw new Error("Only confirmed bookings can be cancelled.");
          save({
            ...s,
            bookings: s.bookings.map((b) =>
              b.id === id ? { ...b, status } : b,
            ),
          });
          if (status === "cancelled" && booking.eventId)
            useAppStore.setState((state) => ({
              events: state.events.filter((e) => e.id !== booking.eventId),
            }));
        },
        merge: (data) => {
          const v = validateScheduling(data);
          save({
            ...v,
            types: [
              ...new Map(
                [...get().types, ...v.types].map((t) => [t.id, t]),
              ).values(),
            ],
            offers: [
              ...new Map(
                [...get().offers, ...v.offers].map((o) => [o.id, o]),
              ).values(),
            ],
            bookings: [
              ...new Map(
                [...get().bookings, ...v.bookings].map((b) => [b.id, b]),
              ).values(),
            ],
          });
        },
      };
    },
    {
      name: "candid:scheduling:v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: ({ host, availability, types, offers, bookings }) => ({
        host,
        availability,
        types,
        offers,
        bookings,
      }),
      merge: (persisted, current) =>
        persisted === undefined
          ? current
          : { ...current, ...validateScheduling(persisted) },
      onRehydrateStorage: () => (_, error) => {
        if (error)
          useStorageStatus.setState({
            error:
              "Saved scheduling data could not be opened. Keep your backup files before making changes.",
          });
      },
    },
  ),
);
