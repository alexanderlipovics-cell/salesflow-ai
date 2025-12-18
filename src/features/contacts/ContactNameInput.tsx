import React, { useState, useEffect } from "react";
import { UserRoundSearch } from "lucide-react";
import {
  ContactPickerDialog,
  type ContactSummary,
} from "./ContactPickerDialog";

interface ContactNameInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  onContactSelected?: (contact: ContactSummary) => void;
}

export function ContactNameInput({
  label = "NAME (OPTIONAL)",
  placeholder = "z.B. Maria, Herr Huber",
  value,
  onChange,
  onContactSelected,
}: ContactNameInputProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (contact: ContactSummary) => {
    onChange(contact.name);
    if (onContactSelected) {
      onContactSelected(contact);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs uppercase text-slate-400">{label}</label>}
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 pr-10 pl-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          type="button"
          aria-label="Kontakt auswählen"
          title="Kontakt auswählen"
          onClick={() => setOpen(true)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg border border-slate-700/80 bg-slate-900/70 p-1.5 text-slate-300 transition hover:border-emerald-400/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <UserRoundSearch className="h-4 w-4" />
        </button>
      </div>

      <ContactPickerDialog open={open} onClose={() => setOpen(false)} onSelect={handleSelect} />
    </div>
  );
}

