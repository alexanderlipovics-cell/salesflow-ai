/**
 * LeadForm Component
 * 
 * Smart form component for creating/editing leads
 * Uses React Hook Form + Zod for validation
 * Aura OS Design System
 * 
 * @author Gemini 3 Ultra - Forms Architecture
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormData } from "../../lib/validations/leadSchema";
import { Button } from "../ui/button";
import { Select } from "../ui/Select";
import { User, Building, Mail, DollarSign, Save } from "lucide-react";

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => Promise<void>; // Async submit handler
  initialData?: Partial<LeadFormData>;
}

export const LeadForm: React.FC<LeadFormProps> = ({ onSubmit, initialData }) => {
  // 1. Hook Form Setup mit Zod Resolver
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: initialData,
  });

  // 2. Wrapper für Submit (um Reset oder Toasts zu handlen)
  const handleFormSubmit = async (data: LeadFormData) => {
    try {
      await onSubmit(data);
      reset(); // Formular nach Erfolg leeren (optional)
      // TODO: Show success toast
    } catch (error) {
      console.error("Fehler beim Senden:", error);
      // TODO: Show error toast
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-gray-950/80 p-6 backdrop-blur">
      <div className="mb-6 border-b border-white/10 pb-4">
        <h3 className="text-2xl font-semibold text-white">Neuen Lead erfassen</h3>
        <p className="mt-1 text-sm text-gray-400">Fülle die Details aus, um den Sales-Prozess zu starten.</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-300" />
              Vollständiger Name
            </label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Max Mustermann"
              {...register("fullName")}
            />
            {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-300" />
              E-Mail Adresse
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="max@firma.de"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Building className="h-4 w-4 text-cyan-300" />
              Firmenname
            </label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Acme Corp."
              {...register("company")}
            />
            {errors.company && <p className="text-xs text-red-400">{errors.company.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-300" />
              Geschätztes Budget
            </label>
            <Select
              options={[
                { label: "< 1.000€ (Low)", value: "low" },
                { label: "1.000€ - 10.000€ (Medium)", value: "medium" },
                { label: "10.000€ - 50.000€ (High)", value: "high" },
                { label: "> 50.000€ (Enterprise)", value: "enterprise" },
              ]}
              error={errors.budget?.message}
              {...register("budget")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Notizen <span className="text-gray-500">(Optional)</span></label>
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Zusätzliche Infos zum Projekt..."
            {...register("notes")}
          />
          {errors.notes && <p className="text-xs text-red-400">{errors.notes.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
          >
            Zurücksetzen
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Speichert...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Lead speichern</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

