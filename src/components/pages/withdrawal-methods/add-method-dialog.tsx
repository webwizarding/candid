"use client";

import { useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/dialogs/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WithdrawalKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { KIND_META, KINDS, KindTile, masked, PAYOUT_CURRENCIES } from "./shared";

// Inputs that may hold account/card digits: keep browsers and password managers from saving them.
const SENSITIVE_INPUT = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;

const digitsOnly = (v: string) => v.replace(/\D/g, "");
const groupDigits = (v: string) => v.replace(/(\d{4})(?=\d)/g, "$1 ");

function cardBrand(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Debit card";
}

export function AddMethodDialog({ open, session, onClose }: { open: boolean; session: number; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-5 p-5 max-sm:pb-0 sm:max-w-[520px]">
        <AddMethodForm key={session} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function AddMethodForm({ onDone }: { onDone: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const addWithdrawalMethod = useAppStore((s) => s.addWithdrawalMethod);
  const [kind, setKind] = useState<WithdrawalKind>("bank");
  const [holder, setHolder] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bankName, setBankName] = useState("");
  // Full numbers live only in this form's state while typing; only the last 4 digits are saved.
  const [number, setNumber] = useState("");
  const [currency, setCurrency] = useState<string>("GBP");

  const needsNumber = kind === "bank" || kind === "card";
  const minDigits = kind === "card" ? 12 : 6;
  const numberError = needsNumber && number.length > 0 && number.length < minDigits;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const valid =
    kind === "bank"
      ? holder.trim() && bankName.trim() && number.length >= minDigits
      : kind === "card"
        ? holder.trim() && number.length >= minDigits
        : emailValid;

  const preview = needsNumber && number.length >= 4 ? masked(number.slice(-4)) : null;

  return (
    <form
      className="contents"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const last4 = needsNumber ? number.slice(-4) : "";
        const label =
          kind === "bank" ? bankName.trim() : kind === "card" ? cardBrand(number) : KIND_META[kind].label;
        addWithdrawalMethod({
          kind,
          label,
          holder: kind === "paypal" || kind === "wise" ? email.trim() : holder.trim(),
          last4,
          currency,
        });
        setNumber("");
        toast.success("Withdrawal method added", {
          description: [label, masked(last4), currency].filter(Boolean).join(" · "),
        });
        onDone();
      }}
    >
      <DialogHeader className="gap-1.5">
        <DialogTitle className="t-16">Add withdrawal method</DialogTitle>
        <DialogDescription className="t-14">Choose where your payouts should land.</DialogDescription>
      </DialogHeader>

      <RadioGroup
        value={kind}
        onValueChange={(v) => {
          setKind(v as WithdrawalKind);
          setNumber("");
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Method type"
      >
        {KINDS.map((k) => (
          <label
            key={k.kind}
            className={cn(
              "press relative flex cursor-pointer flex-col items-start gap-2.5 rounded-lg border p-2.5 transition-[border-color,background-color] duration-150",
              kind === k.kind ? "border-brand/50 bg-brand-tint" : "border-control bg-surface hover-fine:bg-hover",
            )}
          >
            <RadioGroupItem value={k.kind} className="absolute top-2.5 right-2.5" />
            <KindTile kind={k.kind} className="size-7 rounded-md [&_svg]:size-3.5" />
            <span className="flex flex-col gap-1">
              <span className="t-14 text-fg">{k.kind === "bank" ? "Bank" : k.label}</span>
              <span className="t-12 text-fg-2">{k.hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      <div className="grid gap-4">
        {kind === "paypal" || kind === "wise" ? (
          <Field
            label={`${KIND_META[kind].label} email`}
            htmlFor="wm-email"
            error={email && !emailValid ? "Enter a valid email address." : null}
          >
            <Input
              id="wm-email"
              type="email"
              required
              value={email}
              aria-invalid={!!email && !emailValid}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        ) : (
          <>
            <div className={cn("grid gap-4 sm:gap-3", kind === "bank" && "sm:grid-cols-2")}>
              <Field label={kind === "card" ? "Name on card" : "Account holder"} htmlFor="wm-holder">
                <Input id="wm-holder" required value={holder} onChange={(e) => setHolder(e.target.value)} />
              </Field>
              {kind === "bank" && (
                <Field label="Bank name" htmlFor="wm-bank">
                  <Input
                    id="wm-bank"
                    required
                    placeholder="e.g. Monzo"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </Field>
              )}
            </div>
            <Field
              label={kind === "card" ? "Card number" : "Account number"}
              htmlFor="wm-number"
              error={numberError ? `Enter at least ${minDigits} digits.` : null}
              hint={preview ? `Saved as ${preview}` : "Only the last 4 digits are kept."}
            >
              <Input
                id="wm-number"
                inputMode="numeric"
                placeholder={kind === "card" ? "4242 4242 4242 4242" : "00000000"}
                className="tabular-nums"
                aria-invalid={numberError}
                maxLength={kind === "card" ? 23 : 20}
                value={kind === "card" ? groupDigits(number) : number}
                onChange={(e) => setNumber(digitsOnly(e.target.value).slice(0, 19))}
                {...SENSITIVE_INPUT}
              />
            </Field>
          </>
        )}

        <Field label="Payout currency" htmlFor="wm-currency">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="wm-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <p className="t-12 flex items-start gap-2 rounded-lg border border-hairline bg-app px-3 py-2.5 leading-[1.4] text-fg-2">
          <ShieldCheckIcon className="mt-px size-3.5 shrink-0 text-icon" />
          <span>
            <span className="text-fg">Demo only — please don’t enter real details.</span> Full account and card numbers
            are never stored; this app keeps just the last 4 digits for display.
          </span>
        </p>
      </div>

      <DialogFooter className="-mx-5 -mb-5 bg-app px-5 py-3 max-sm:mb-0 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] max-sm:[&_button]:h-10">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={!valid}>
          Add method
        </Button>
      </DialogFooter>
    </form>
  );
}
