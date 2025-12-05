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

// UI Components
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Card } from "../ui/Card";
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
    <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-2xl font-semibold text-white">
          Neuen Lead erfassen
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Fülle die Details aus, um den Sales-Prozess zu starten.
        </p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Zeile 1: Name & Email */}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Vollständiger Name"
              placeholder="Max Mustermann"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            
            <Input
              label="E-Mail Adresse"
              type="email"
              placeholder="max@firma.de"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          {/* Zeile 2: Firma & Budget */}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Firmenname"
              placeholder="Acme Corp."
              error={errors.company?.message}
              {...register("company")}
            />

            <Select
              label="Geschätztes Budget"
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

          {/* Zeile 3: Notizen */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Notizen <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white placeholder-gray-500 backdrop-blur-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
              placeholder="Zusätzliche Infos zum Projekt..."
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-red-400">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => reset()}
            >
              Zurücksetzen
            </Button>
            <Button 
              type="submit" 
              variant="primary"
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
    </Card>
  );
};

