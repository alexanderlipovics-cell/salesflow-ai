import React from "react";
import { Bell, X, Upload, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  onDismiss: () => void;
  onQuickUpdate: () => void;
}

export default function SyncReminderBanner({ onDismiss, onQuickUpdate }: Props) {
  const dismissForMonth = () => {
    localStorage.setItem("lastMLMSyncDismiss", new Date().toISOString());
    onDismiss();
  };

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">Monatlicher Sync</h3>
          <p className="text-blue-100 text-sm mt-1">
            Zeit deine Zinzino Daten zu aktualisieren! Exportiere aus dem Backoffice oder mach ein Quick Update.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              to="/network/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              CSV Import
            </Link>
            <button
              onClick={onQuickUpdate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Quick Update
            </button>
          </div>
        </div>

        <button
          onClick={dismissForMonth}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          title="Diesen Monat nicht mehr anzeigen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

