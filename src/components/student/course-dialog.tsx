"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/dialogs/field";
import { useStudentStore } from "@/stores/student-store";
import type { EventColor } from "@/lib/types";
export function CourseDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<EventColor>("purple");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Add a course calendar</DialogTitle>
        <DialogDescription>
          Keep lectures, exams and study blocks together.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            useStudentStore.getState().addCalendar(name, color);
            setName("");
            onClose();
          }}
        >
          <Field label="Course name" htmlFor="course-name">
            <Input
              id="course-name"
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. BIO 101 · Biology"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Color" htmlFor="course-color">
            <select
              id="course-color"
              className="student-select"
              value={color}
              onChange={(e) => setColor(e.target.value as EventColor)}
            >
              {["purple", "blue", "green", "orange", "pink", "cyan"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </Field>
          <Button type="submit" variant="brand">
            Add course
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
