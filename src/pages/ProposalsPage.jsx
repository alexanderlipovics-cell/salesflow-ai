import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { supabaseClient } from "@/lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const emptyItem = {
  product_id: "",
  name: "",
  description: "",
  quantity: 1,
  unit_price: 0,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(value) ? value : 0,
  );

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProposal, setSavingProposal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [generatingLead, setGeneratingLead] = useState(false);
  const [error, setError] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    price_type: "fixed",
    description: "",
    category: "",
  });

  const [proposalForm, setProposalForm] = useState({
    lead_id: "",
    title: "",
    recipient_name: "",
    recipient_company: "",
    recipient_email: "",
    intro_text: "",
    items: [emptyItem],
    discount_percent: 0,
    tax_percent: 20,
    validity_days: 14,
    payment_terms: "",
    notes: "",
  });

  const [leadGenerationForm, setLeadGenerationForm] = useState({
    lead_id: "",
    include_products: [],
    custom_intro: "",
    discount_percent: 0,
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([fetchProducts(), fetchProposals(), fetchLeads()]);
      } catch (err) {
        console.error(err);
        setError("Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const manualTotals = useMemo(() => {
    const subtotal = proposalForm.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0,
    );
    const discount = subtotal * (Number(proposalForm.discount_percent || 0) / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (Number(proposalForm.tax_percent || 0) / 100);
    return {
      subtotal,
      discount,
      tax,
      total: afterDiscount + tax,
    };
  }, [
    proposalForm.items,
    proposalForm.discount_percent,
    proposalForm.tax_percent,
  ]);

  const proposalStats = useMemo(() => {
    return proposals.reduce(
      (acc, p) => {
        acc.total += 1;
        const status = p.status || "draft";
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
        return acc;
      },
      { total: 0, byStatus: {} },
    );
  }, [proposals]);

  const fetchProducts = async () => {
    const res = await authFetch(`${API_BASE_URL}/api/proposals/products`);
    const body = await res.json();
    setProducts(body.products || []);
  };

  const fetchProposals = async (status) => {
    const url = new URL(`${API_BASE_URL}/api/proposals`);
    if (status) url.searchParams.set("status", status);
    const res = await authFetch(url.toString());
    const body = await res.json();
    setProposals(body.proposals || []);
  };

  const fetchLeads = async () => {
    const { data, error: leadError } = await supabaseClient
      .from("leads")
      .select("id, name, company, email, deal_value")
      .order("name", { ascending: true })
      .limit(500);
    if (leadError) {
      console.error("Leads laden fehlgeschlagen:", leadError);
      return;
    }
    setLeads(data || []);
  };

  const updateItem = (index, field, value) => {
    setProposalForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = (prefill) => {
    setProposalForm((prev) => ({
      ...prev,
      items: [...prev.items, prefill || emptyItem],
    }));
  };

  const removeItem = (index) => {
    setProposalForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  };

  const addItemFromProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    addItem({
      product_id: product.id,
      name: product.name,
      description: product.description || "",
      quantity: 1,
      unit_price: Number(product.price || 0),
    });
  };

  const handleLeadSelect = (leadId) => {
    setProposalForm((prev) => ({ ...prev, lead_id: leadId }));
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setProposalForm((prev) => ({
        ...prev,
        recipient_name: lead.name || "",
        recipient_company: lead.company || "",
        recipient_email: lead.email || "",
        title: prev.title || `Angebot für ${lead.company || lead.name || "Lead"}`,
      }));
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE_URL}/api/proposals/products`, {
        method: "POST",
        body: JSON.stringify({
          name: productForm.name,
          price: Number(productForm.price || 0),
          description: productForm.description || undefined,
          price_type: productForm.price_type,
          category: productForm.category || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Produkt konnte nicht gespeichert werden.");
      }
      await fetchProducts();
      setProductForm({
        name: "",
        price: "",
        price_type: "fixed",
        description: "",
        category: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    setSavingProposal(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE_URL}/api/proposals`, {
        method: "POST",
        body: JSON.stringify({
          ...proposalForm,
          items: proposalForm.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
          })),
          discount_percent: Number(proposalForm.discount_percent || 0),
          tax_percent: Number(proposalForm.tax_percent || 0),
          validity_days: Number(proposalForm.validity_days || 14),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Angebot konnte nicht erstellt werden.");
      }
      await fetchProposals(statusFilter);
      setProposalForm({
        lead_id: "",
        title: "",
        recipient_name: "",
        recipient_company: "",
        recipient_email: "",
        intro_text: "",
        items: [emptyItem],
        discount_percent: 0,
        tax_percent: 20,
        validity_days: 14,
        payment_terms: "",
        notes: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSavingProposal(false);
    }
  };

  const handleGenerateFromLead = async (e) => {
    e.preventDefault();
    setGeneratingLead(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE_URL}/api/proposals/generate-from-lead`, {
        method: "POST",
        body: JSON.stringify({
          ...leadGenerationForm,
          discount_percent: Number(leadGenerationForm.discount_percent || 0),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Lead-Angebot konnte nicht erstellt werden.");
      }
      await fetchProposals(statusFilter);
      setLeadGenerationForm({
        lead_id: "",
        include_products: [],
        custom_intro: "",
        discount_percent: 0,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGeneratingLead(false);
    }
  };

  const handleGeneratePdf = async (proposalId) => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/proposals/${proposalId}/generate-pdf`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "PDF konnte nicht erzeugt werden.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `angebot_${proposalId.slice(0, 8)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleSendProposal = async (proposal) => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/proposals/${proposal.id}/send`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Angebot konnte nicht gesendet werden.");
      }
      if (proposal.recipient_email) {
        const mailto = `mailto:${proposal.recipient_email}?subject=${encodeURIComponent(
          proposal.title || "Angebot",
        )}`;
        window.location.href = mailto;
      }
      await fetchProposals(statusFilter);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const toggleProductSelection = (productId) => {
    setLeadGenerationForm((prev) => {
      const exists = prev.include_products.includes(productId);
      return {
        ...prev,
        include_products: exists
          ? prev.include_products.filter((id) => id !== productId)
          : [...prev.include_products, productId],
      };
    });
  };

  const filteredProposals = useMemo(() => {
    if (!statusFilter) return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Lade Angebotsmodul …</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-400" />
            <h1 className="text-2xl font-bold">Angebote & PDF-Generator</h1>
          </div>
          <p className="text-sm text-slate-400">
            Produkte verwalten, Angebote erstellen, PDF exportieren und versenden.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={async (e) => {
              const value = e.target.value;
              setStatusFilter(value);
              await fetchProposals(value);
            }}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Alle Stati</option>
            <option value="draft">Draft</option>
            <option value="sent">Gesendet</option>
            <option value="viewed">Gesehen</option>
            <option value="accepted">Akzeptiert</option>
            <option value="rejected">Abgelehnt</option>
          </select>
          <button
            onClick={() => {
              fetchProposals(statusFilter);
              fetchProducts();
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm font-semibold text-slate-200">Gesamt</div>
          <div className="text-2xl font-bold text-emerald-400">{proposalStats.total}</div>
          <p className="text-xs text-slate-400">Angebote insgesamt</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm font-semibold text-slate-200">Draft / Gesendet</div>
          <div className="text-xl font-bold text-sky-400">
            {proposalStats.byStatus?.draft || 0} / {proposalStats.byStatus?.sent || 0}
          </div>
          <p className="text-xs text-slate-400">Bearbeitung & Versand</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm font-semibold text-slate-200">Akzeptiert</div>
          <div className="text-xl font-bold text-emerald-300">
            {proposalStats.byStatus?.accepted || 0}
          </div>
          <p className="text-xs text-slate-400">Gewonnene Deals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-900/30">
            <div className="mb-4 flex items-center gap-2 text-slate-200">
              <ShoppingCart className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold">Manuelles Angebot</h2>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Lead (optional)</label>
                  <select
                    value={proposalForm.lead_id}
                    onChange={(e) => handleLeadSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Lead auswählen…</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name || "Lead"} {lead.company ? `(${lead.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Titel</label>
                  <input
                    value={proposalForm.title}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Angebotstitel"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Empfänger</label>
                  <input
                    value={proposalForm.recipient_name}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, recipient_name: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Firma</label>
                  <input
                    value={proposalForm.recipient_company}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, recipient_company: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Unternehmen"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">E-Mail</label>
                  <input
                    type="email"
                    value={proposalForm.recipient_email}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, recipient_email: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="kunde@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-500">Intro / Begleittext</label>
                <textarea
                  value={proposalForm.intro_text}
                  onChange={(e) =>
                    setProposalForm((prev) => ({ ...prev, intro_text: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="Kurze Einführung für den Kunden"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Positionen</h3>
                  <div className="flex gap-2">
                    <select
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      onChange={(e) => {
                        if (e.target.value) {
                          addItemFromProduct(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Produkt hinzufügen…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.price)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addItem(emptyItem)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300"
                    >
                      <Plus className="h-4 w-4" />
                      Zeile
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {proposalForm.items.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                            placeholder="Produkt / Service"
                          />
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            rows={2}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                            placeholder="Beschreibung"
                          />
                          <div className="grid gap-2 md:grid-cols-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                              placeholder="Menge"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(index, "unit_price", Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                              placeholder="Einzelpreis"
                            />
                            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                              <span>Gesamt</span>
                              <span className="font-semibold">
                                {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-1 rounded-lg border border-slate-800 p-2 text-slate-400 hover:border-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Rabatt (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={proposalForm.discount_percent}
                    onChange={(e) =>
                      setProposalForm((prev) => ({
                        ...prev,
                        discount_percent: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">MwSt. (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={proposalForm.tax_percent}
                    onChange={(e) =>
                      setProposalForm((prev) => ({
                        ...prev,
                        tax_percent: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Gültigkeit (Tage)</label>
                  <input
                    type="number"
                    min="1"
                    value={proposalForm.validity_days}
                    onChange={(e) =>
                      setProposalForm((prev) => ({
                        ...prev,
                        validity_days: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Zahlungsbedingungen</label>
                  <input
                    value={proposalForm.payment_terms}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, payment_terms: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="z.B. 14 Tage netto"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Notizen (intern)</label>
                  <input
                    value={proposalForm.notes}
                    onChange={(e) =>
                      setProposalForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="z.B. Deal Health, Risiken"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-sm">
                <div className="flex gap-4">
                  <span className="text-slate-400">Zwischensumme: {formatCurrency(manualTotals.subtotal)}</span>
                  {manualTotals.discount > 0 && (
                    <span className="text-emerald-300">
                      Rabatt: -{formatCurrency(manualTotals.discount)}
                    </span>
                  )}
                  <span className="text-slate-400">MwSt.: {formatCurrency(manualTotals.tax)}</span>
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  Gesamt: {formatCurrency(manualTotals.total)}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProposal}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProposal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Angebot speichern
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-900/30">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <Send className="h-5 w-5 text-sky-400" />
              <h2 className="text-lg font-semibold">Angebot aus Lead generieren</h2>
            </div>
            <form onSubmit={handleGenerateFromLead} className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-500">Lead</label>
                <select
                  value={leadGenerationForm.lead_id}
                  onChange={(e) =>
                    setLeadGenerationForm((prev) => ({ ...prev, lead_id: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Lead auswählen…</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name || "Lead"} {lead.company ? `(${lead.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-500">Produkte hinzufügen</label>
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => {
                    const selected = leadGenerationForm.include_products.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProductSelection(p.id)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                  {products.length === 0 && (
                    <span className="text-xs text-slate-500">Keine Produkte hinterlegt.</span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Rabatt (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={leadGenerationForm.discount_percent}
                    onChange={(e) =>
                      setLeadGenerationForm((prev) => ({
                        ...prev,
                        discount_percent: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Custom Intro</label>
                  <input
                    value={leadGenerationForm.custom_intro}
                    onChange={(e) =>
                      setLeadGenerationForm((prev) => ({ ...prev, custom_intro: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    placeholder="Optionaler individueller Text"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={generatingLead}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Angebot erstellen
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-900/30">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <FileText className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold">Produkte / Services</h3>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="Produktname"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  placeholder="Preis"
                />
                <select
                  value={productForm.price_type}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, price_type: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="fixed">Festpreis</option>
                  <option value="hourly">Stundensatz</option>
                  <option value="monthly">Monatlich</option>
                  <option value="yearly">Jährlich</option>
                </select>
              </div>
              <input
                value={productForm.category}
                onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="Kategorie (optional)"
              />
              <textarea
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="Kurzbeschreibung"
              />
              <button
                type="submit"
                disabled={savingProduct}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Produkt speichern
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-slate-400">
                        {p.category || "Allgemein"} • {p.price_type || "fixed"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-slate-400">{p.description}</p>
                  )}
                </div>
              ))}
              {products.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 p-4 text-center text-sm text-slate-400">
                  Noch keine Produkte vorhanden.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-900/30">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-semibold">Angebote</h3>
            </div>
            <div className="space-y-3">
              {filteredProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{proposal.title}</div>
                      <div className="text-xs text-slate-400">
                        {proposal.recipient_name} {proposal.recipient_company ? `• ${proposal.recipient_company}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Status: {proposal.status || "draft"} • Total:{" "}
                        <span className="text-emerald-300">{formatCurrency(proposal.total)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGeneratePdf(proposal.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-500"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleSendProposal(proposal)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400"
                      >
                        <Mail className="h-4 w-4" />
                        Senden
                      </button>
                    </div>
                  </div>
                  {proposal.intro_text && (
                    <p className="mt-2 whitespace-pre-wrap text-slate-300 line-clamp-3">
                      {proposal.intro_text}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(proposal.items || []).slice(0, 3).map((item, idx) => (
                      <span
                        key={`${proposal.id}-${idx}`}
                        className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
                      >
                        {item.name} ({formatCurrency(item.total)})
                      </span>
                    ))}
                    {(proposal.items || []).length > 3 && (
                      <span className="text-[11px] text-slate-400">
                        +{proposal.items.length - 3} weitere
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredProposals.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 p-4 text-center text-sm text-slate-400">
                  Keine Angebote gefunden.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

