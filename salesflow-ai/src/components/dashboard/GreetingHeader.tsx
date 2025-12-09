import { CalendarDays, Sun, Sunset } from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  firstName?: string;
  followUpsToday?: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
};

export const GreetingHeader: React.FC<Props> = ({ firstName = "SalesFlow Pro", followUpsToday = 0 }) => {
  const dateLabel = format(new Date(), "EEEE, d. MMMM yyyy", { locale: de });
  const greeting = getGreeting();
  const Icon = new Date().getHours() < 18 ? Sun : Sunset;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-sm text-cyan-200">
        <Icon className="h-4 w-4" />
        <span className="uppercase tracking-[0.2em] text-cyan-200/80">Mission Control</span>
      </div>
      <div className="text-3xl font-bold text-white">
        {greeting}, {firstName}!
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <CalendarDays className="h-4 w-4 text-cyan-300" />
          {dateLabel}
        </span>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-cyan-100">
          {followUpsToday} Follow-ups heute
        </span>
      </div>
    </div>
  );
};

export default GreetingHeader;

