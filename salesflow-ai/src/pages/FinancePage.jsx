import React, { useEffect, useMemo, useState } from "react";

const number = (v) => (v === null || v === undefined ? 0 : Number(v));

const todayIso = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function SummaryCard({ label, value, accent = "#4f46e5" }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    from: firstDayOfMonth(),
    to: todayIso(),
    tx_type: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [txForm, setTxForm] = useState({
    tx_type: "income",
    amount: "",
    date: todayIso(),
    description: "",
    category: "",
    notes: "",
    receipt_url: "",
    is_tax_relevant: true,
    tax_deductible_percent: 100,
  });
  const [mileageForm, setMileageForm] = useState({
    date: todayIso(),
    start_location: "",
    end_location: "",
    distance_km: "",
    purpose: "",
  });
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [taxExport, setTaxExport] = useState(null);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());

  const headers = useMemo(() => ({ "Content-Type": "application/json" }), []);

  const loadCategories = async () => {
    const res = await fetch("/api/finance/categories");
    const data = await res.json();
    setCategories(data);
  };

  const loadTransactions = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.append("from_date", filters.from);
    if (filters.to) params.append("to_date", filters.to);
    if (filters.tx_type) params.append("tx_type", filters.tx_type);
    if (filters.category) params.append("category", filters.category);
    const res = await fetch(`/api/finance/transactions?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setLoading(false);
  };

  const loadSummary = async () => {
    if (!filters.from || !filters.to) return;
    const params = new URLSearchParams({
      from_date: filters.from,
      to_date: filters.to,
    });
    const res = await fetch(`/api/finance/summary?${params.toString()}`);
    const data = await res.json();
    setSummary(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTransactions();
    loadSummary();
  }, [filters.from, filters.to, filters.tx_type, filters.category]);

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/finance/transactions", {
      method: "POST",
      headers,
      body: JSON.stringify(txForm),
    });
    await loadTransactions();
    await loadSummary();
    setTxForm((f) => ({ ...f, amount: "", description: "", notes: "", receipt_url: "" }));
  };

  const handleMileageSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...mileageForm,
      distance_km: Number(mileageForm.distance_km || 0),
    };
    await fetch("/api/finance/mileage", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    setMileageForm({
      date: todayIso(),
      start_location: "",
      end_location: "",
      distance_km: "",
      purpose: "",
    });
  };

  const handleScanReceipt = async (file) => {
    if (!file) return;
    setScanError("");
    setScanResult(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/finance/scan-receipt", { method: "POST", body: form });
    const data = await res.json();
    if (data.success) {
      setScanResult(data.extracted);
      if (data.extracted?.description) {
        setTxForm((f) => ({
          ...f,
          description: data.extracted.description,
          amount: data.extracted.amount || f.amount,
          category: data.extracted.category_suggestion || f.category,
        }));
      }
    } else {
      setScanError(data.error || "Scan fehlgeschlagen");
    }
  };

  const handleTaxExport = async () => {
    const res = await fetch(`/api/finance/tax-export/${taxYear}`);
    const data = await res.json();
    setTaxExport(data);
  };

  const income = number(summary?.total_income);
  const expenses = number(summary?.total_expenses);
  const profit = number(summary?.profit);
  const tax = number(summary?.estimated_tax_reserve);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Finanzen</h1>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Kein Steuerersatz. Bitte Steuerberater konsultieren.
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <SummaryCard label="Einnahmen" value={`${income.toFixed(2)} €`} accent="#16a34a" />
        <SummaryCard label="Ausgaben" value={`${expenses.toFixed(2)} €`} accent="#dc2626" />
        <SummaryCard label="Gewinn" value={`${profit.toFixed(2)} €`} accent="#0ea5e9" />
        <SummaryCard label="Steuer-Reserve (~30%)" value={`${tax.toFixed(2)} €`} accent="#f59e0b" />
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div>
              <label>Von</label>
              <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <label>Bis</label>
              <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
            </div>
            <div>
              <label>Typ</label>
              <select value={filters.tx_type} onChange={(e) => setFilters((f) => ({ ...f, tx_type: e.target.value }))}>
                <option value="">Alle</option>
                <option value="income">Einnahmen</option>
                <option value="expense">Ausgaben</option>
              </select>
            </div>
            <div>
              <label>Kategorie</label>
              <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Alle</option>
                {[...categories.income, ...categories.expense].map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Beschreibung</th>
                  <th>Kategorie</th>
                  <th>Betrag</th>
                  <th>Beleg</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: 8 }}>
                      Lädt...
                    </td>
                  </tr>
                )}
                {!loading &&
                  transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 6 }}>{t.date}</td>
                      <td style={{ padding: 6, color: t.tx_type === "income" ? "#16a34a" : "#dc2626" }}>
                        {t.tx_type === "income" ? "Einnahme" : "Ausgabe"}
                      </td>
                      <td style={{ padding: 6 }}>{t.description}</td>
                      <td style={{ padding: 6 }}>{t.category}</td>
                      <td style={{ padding: 6 }}>{Number(t.amount).toFixed(2)} €</td>
                      <td style={{ padding: 6 }}>
                        {t.receipt_url ? (
                          <a href={t.receipt_url} target="_blank" rel="noreferrer">
                            Beleg
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Schnell erfassen</h3>
            <form onSubmit={handleTxSubmit} style={{ display: "grid", gap: 8 }}>
              <select value={txForm.tx_type} onChange={(e) => setTxForm({ ...txForm, tx_type: e.target.value })}>
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Betrag"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                required
              />
              <input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} required />
              <input
                type="text"
                placeholder="Beschreibung"
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                required
              />
              <select value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })} required>
                <option value="">Kategorie wählen</option>
                {(txForm.tx_type === "income" ? categories.income : categories.expense).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Notiz"
                value={txForm.notes}
                onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
              />
              <button type="submit" style={{ padding: 10, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8 }}>
                Speichern
              </button>
            </form>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Beleg hochladen & AI-Scan</h3>
            <input type="file" accept="image/*" onChange={(e) => handleScanReceipt(e.target.files?.[0])} />
            {scanError && <div style={{ color: "#dc2626", marginTop: 6 }}>{scanError}</div>}
            {scanResult && (
              <pre style={{ marginTop: 8, background: "#f9fafb", padding: 8, borderRadius: 6, fontSize: 12 }}>
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            )}
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Fahrtenbuch</h3>
            <form onSubmit={handleMileageSubmit} style={{ display: "grid", gap: 8 }}>
              <input type="date" value={mileageForm.date} onChange={(e) => setMileageForm({ ...mileageForm, date: e.target.value })} required />
              <input
                type="text"
                placeholder="Start"
                value={mileageForm.start_location}
                onChange={(e) => setMileageForm({ ...mileageForm, start_location: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Ziel"
                value={mileageForm.end_location}
                onChange={(e) => setMileageForm({ ...mileageForm, end_location: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Kilometer"
                value={mileageForm.distance_km}
                onChange={(e) => setMileageForm({ ...mileageForm, distance_km: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Zweck"
                value={mileageForm.purpose}
                onChange={(e) => setMileageForm({ ...mileageForm, purpose: e.target.value })}
                required
              />
              <button type="submit" style={{ padding: 10, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8 }}>
                Fahrt speichern
              </button>
            </form>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Steuer-Export</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} />
              <button onClick={handleTaxExport} style={{ padding: 8, background: "#111827", color: "#fff", border: "none", borderRadius: 6 }}>
                Export laden
              </button>
            </div>
            {taxExport && (
              <pre style={{ marginTop: 8, background: "#f9fafb", padding: 8, borderRadius: 6, fontSize: 12 }}>
                {JSON.stringify(taxExport, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

