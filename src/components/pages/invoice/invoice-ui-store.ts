"use client";

import { create } from "zustand";

/** Page-local UI state, shared with the ?open=<id> deep-link reader. */
type InvoiceUi = {
  viewId: string | null;
  editor: { open: boolean; session: number; id?: string };
  view: (id: string) => void;
  closeView: () => void;
  edit: (id?: string) => void;
  closeEditor: () => void;
};

export const useInvoiceUi = create<InvoiceUi>()((set) => ({
  viewId: null,
  editor: { open: false, session: 0 },
  view: (id) => set({ viewId: id }),
  closeView: () => set({ viewId: null }),
  edit: (id) => set((s) => ({ viewId: null, editor: { open: true, session: s.editor.session + 1, id } })),
  closeEditor: () => set((s) => ({ editor: { ...s.editor, open: false } })),
}));
