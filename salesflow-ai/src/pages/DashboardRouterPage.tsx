import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVertical } from "../core/VerticalContext";

import FieldOpsPage from "./FieldOpsPage";

export default function DashboardRouterPage() {
  const { vertical, loading } = useVertical();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      try {
        const stored = window.localStorage.getItem("salesflow_vertical");
        if (!stored) {
          navigate("/choose-vertical", { replace: true });
        }
      } catch {
        // ignore
      }
    }
  }, [loading, navigate]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-400">
        Ladevorgang – vertikales Setup wird geprüft …
      </div>
    );
  }

  switch (vertical) {
    case "network_marketing":
      return <FieldOpsPage />;
    case "immo":
      return <FieldOpsPage />;
    case "finance":
      return <FieldOpsPage />;
    case "chief":
    case "generic":
    default:
      return <FieldOpsPage />;
  }
}

