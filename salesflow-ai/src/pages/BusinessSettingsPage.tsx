import React, { useEffect, useState } from "react";
import {
  Building2,
  Package,
  FileText,
  MessageSquare,
  Save,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

interface Product {
  id?: string;
  name: string;
  description: string;
  price?: string;
  benefits: string[];
  objections: { objection: string; response: string }[];
}

interface Document {
  id: string;
  filename: string;
  char_count: number;
  uploaded_at?: string;
}

interface Objection {
  id?: string;
  objection: string;
  response: string;
}

interface KnowledgeBase {
  company_name: string | null;
  company_type: string | null;
  company_description: string | null;
  products: Product[];
  documents: Document[];
  custom_objections: Objection[];
}

const COMPANY_TYPES = [
  { value: "zinzino", label: "Zinzino", category: "mlm" },
  { value: "pm_international", label: "PM-International", category: "mlm" },
  { value: "herbalife", label: "Herbalife", category: "mlm" },
  { value: "forever_living", label: "Forever Living", category: "mlm" },
  { value: "amway", label: "Amway", category: "mlm" },
  { value: "other_mlm", label: "Anderes MLM/Network Marketing", category: "mlm" },
  { value: "insurance", label: "Versicherung", category: "finance" },
  { value: "finance", label: "Finanzberatung", category: "finance" },
  { value: "banking", label: "Bank/Kredit", category: "finance" },
  { value: "solar", label: "Solar/Photovoltaik", category: "energy" },
  { value: "energy", label: "Energie/Strom/Gas", category: "energy" },
  { value: "construction", label: "Bau/Handwerk", category: "energy" },
  { value: "real_estate", label: "Immobilien", category: "realestate" },
  { value: "saas", label: "Software/SaaS", category: "tech" },
  { value: "it_services", label: "IT-Dienstleistungen", category: "tech" },
  { value: "medical", label: "Medizinprodukte", category: "health" },
  { value: "pharma", label: "Pharma", category: "health" },
  { value: "fitness", label: "Fitness/Wellness", category: "health" },
  { value: "automotive", label: "Automotive/KFZ", category: "other" },
  { value: "telecom", label: "Telekommunikation", category: "other" },
  { value: "consulting", label: "Beratung/Consulting", category: "other" },
  { value: "coaching", label: "Coaching/Training", category: "other" },
  { value: "custom", label: "Andere Branche", category: "other" },
];

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://salesflow-ai.onrender.com" : "http://localhost:8000");

const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export default function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<KnowledgeBase>({
    company_name: null,
    company_type: null,
    company_description: null,
    products: [],
    documents: [],
    custom_objections: [],
  });

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState(false);
  const [newObjection, setNewObjection] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge`, {
        headers: { ...authHeaders() },
      });
      const result = await response.json();
      setData({
        company_name: result.company_name ?? null,
        company_type: result.company_type ?? null,
        company_description: result.company_description ?? null,
        products: result.products ?? [],
        documents: result.documents ?? [],
        custom_objections: result.custom_objections ?? [],
      });
    } catch (error) {
      console.error("Failed to fetch knowledge:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyInfo = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/company`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          company_name: data.company_name,
          company_type: data.company_type,
          company_description: data.company_description,
        }),
      });
      if (response.ok) {
        showMessage("success", "Firmeninfo gespeichert!");
      } else {
        showMessage("error", "Speichern fehlgeschlagen");
      }
    } catch (error) {
      showMessage("error", "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async (product: Product) => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(product),
      });

      if (response.ok) {
        const result = await response.json();
        setData((prev) => ({ ...prev, products: [...prev.products, result.product] }));
        setNewProduct(false);
        showMessage("success", "Produkt hinzugefügt!");
      } else {
        showMessage("error", "Fehler beim Hinzufügen");
      }
    } catch (error) {
      showMessage("error", "Fehler beim Hinzufügen");
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/products/${productId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });

      if (response.ok) {
        setData((prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        }));
        showMessage("success", "Produkt gelöscht");
      } else {
        showMessage("error", "Fehler beim Löschen");
      }
    } catch (error) {
      showMessage("error", "Fehler beim Löschen");
    }
  };

  const uploadDocument = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/knowledge/documents`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setData((prev) => ({
          ...prev,
          documents: [...prev.documents, result.document],
        }));
        showMessage("success", `${file.name} hochgeladen!`);
      } else {
        const error = await response.json();
        showMessage("error", error.detail || "Upload fehlgeschlagen");
      }
    } catch (error) {
      showMessage("error", "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/documents/${docId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (response.ok) {
        setData((prev) => ({
          ...prev,
          documents: prev.documents.filter((d) => d.id !== docId),
        }));
        showMessage("success", "Dokument gelöscht");
      } else {
        showMessage("error", "Fehler beim Löschen");
      }
    } catch (error) {
      showMessage("error", "Fehler beim Löschen");
    }
  };

  const addObjection = async (objection: Objection) => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/objections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(objection),
      });

      if (response.ok) {
        const result = await response.json();
        setData((prev) => ({
          ...prev,
          custom_objections: [...prev.custom_objections, result.objection],
        }));
        setNewObjection(false);
        showMessage("success", "Einwand hinzugefügt!");
      } else {
        showMessage("error", "Fehler beim Hinzufügen");
      }
    } catch (error) {
      showMessage("error", "Fehler beim Hinzufügen");
    }
  };

  const deleteObjection = async (objId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/objections/${objId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (response.ok) {
        setData((prev) => ({
          ...prev,
          custom_objections: prev.custom_objections.filter((o) => o.id !== objId),
        }));
        showMessage("success", "Einwand gelöscht");
      } else {
        showMessage("error", "Fehler beim Löschen");
      }
    } catch (error) {
      showMessage("error", "Fehler beim Löschen");
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mein Business</h1>
          <p className="text-gray-500 mt-1">
            Füge dein Wissen hinzu - CHIEF nutzt es für personalisierte Antworten
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Firmeninfo</h2>
              <p className="text-sm text-gray-500">Grundlegende Informationen über dein Business</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Firma / MLM Company
                </label>
                <select
                  value={data.company_type || ""}
                  onChange={(e) => setData({ ...data, company_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="">Wähle eine Firma...</option>
                  {COMPANY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Firmenname (optional)
                </label>
                <input
                  type="text"
                  value={data.company_name || ""}
                  onChange={(e) => setData({ ...data, company_name: e.target.value })}
                  placeholder="z.B. Zinzino Team München"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={data.company_description || ""}
                onChange={(e) => setData({ ...data, company_description: e.target.value })}
                placeholder="Beschreibe dein Business, deine Mission, was macht euch besonders..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 resize-none"
              />
            </div>

            <button
              onClick={saveCompanyInfo}
              disabled={saving}
              className="self-start flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Produkte</h2>
                <p className="text-sm text-gray-500">{data.products.length} Produkte</p>
              </div>
            </div>
            <button
              onClick={() => setNewProduct(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Produkt
            </button>
          </div>

          <div className="space-y-3">
            {data.products.map((product) => (
              <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() =>
                    setExpandedProduct(expandedProduct === product.id ? null : product.id || null)
                  }
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-sm text-gray-500 truncate max-w-md">{product.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.price && <span className="text-sm text-gray-500">€{product.price}</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        product.id && deleteProduct(product.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedProduct === product.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedProduct === product.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="pt-4 space-y-3">
                      {product.benefits?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Vorteile:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {product.benefits.map((b, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {product.objections?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Einwände:
                          </p>
                          {product.objections.map((obj, i) => (
                            <div key={i} className="text-sm bg-gray-50 dark:bg-gray-700 rounded p-2 mb-1">
                              <p className="text-gray-600 dark:text-gray-400">"{obj.objection}"</p>
                              <p className="text-gray-900 dark:text-white">→ {obj.response}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {newProduct && <ProductForm onSave={addProduct} onCancel={() => setNewProduct(false)} />}

          {data.products.length === 0 && !newProduct && (
            <p className="text-center text-gray-500 py-8">Noch keine Produkte. Füge dein erstes Produkt hinzu!</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dokumente</h2>
              <p className="text-sm text-gray-500">PDF & Word Dateien hochladen</p>
            </div>
          </div>

          <label
            className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              uploading
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
            }`}
          >
            {uploading ? (
              <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            )}
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {uploading ? "Wird hochgeladen..." : "Klicken oder Datei hierher ziehen"}
            </p>
            <p className="text-sm text-gray-400 mt-1">PDF oder Word (max. 10MB)</p>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {data.documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {data.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{doc.filename}</p>
                      <p className="text-sm text-gray-500">{(doc.char_count / 1000).toFixed(1)}k Zeichen</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Einwandbehandlung</h2>
                <p className="text-sm text-gray-500">{data.custom_objections.length} Einwände</p>
              </div>
            </div>
            <button
              onClick={() => setNewObjection(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Einwand
            </button>
          </div>

          <div className="space-y-3">
            {data.custom_objections.map((obj) => (
              <div key={obj.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">"{obj.objection}"</p>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">→ {obj.response}</p>
                  </div>
                  <button
                    onClick={() => obj.id && deleteObjection(obj.id)}
                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {newObjection && <ObjectionForm onSave={addObjection} onCancel={() => setNewObjection(false)} />}

          {data.custom_objections.length === 0 && !newObjection && (
            <p className="text-center text-gray-500 py-8">
              Noch keine Einwände. Füge häufige Einwände und deine Antworten hinzu!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({
  onSave,
  onCancel,
}: {
  onSave: (p: Product) => void;
  onCancel: () => void;
}) {
  const [product, setProduct] = useState<Product>({
    name: "",
    description: "",
    price: "",
    benefits: [],
    objections: [],
  });
  const [benefitInput, setBenefitInput] = useState("");

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setProduct({ ...product, benefits: [...product.benefits, benefitInput.trim()] });
      setBenefitInput("");
    }
  };

  return (
    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <h3 className="font-medium text-gray-900 dark:text-white mb-4">Neues Produkt</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Produktname"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            type="text"
            placeholder="Preis (z.B. 89.00)"
            value={product.price}
            onChange={(e) => setProduct({ ...product, price: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        <textarea
          placeholder="Beschreibung"
          value={product.description}
          onChange={(e) => setProduct({ ...product, description: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 resize-none"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Vorteile
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Vorteil hinzufügen"
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            />
            <button
              onClick={addBenefit}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {product.benefits.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {product.benefits.map((b, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded flex items-center gap-1"
                >
                  {b}
                  <button
                    onClick={() =>
                      setProduct({
                        ...product,
                        benefits: product.benefits.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={() => product.name && product.description && onSave(product)}
            disabled={!product.name || !product.description}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function ObjectionForm({
  onSave,
  onCancel,
}: {
  onSave: (o: Objection) => void;
  onCancel: () => void;
}) {
  const [objection, setObjection] = useState<Objection>({ objection: "", response: "" });

  return (
    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <h3 className="font-medium text-gray-900 dark:text-white mb-4">Neuer Einwand</h3>

      <div className="space-y-4">
        <input
          type="text"
          placeholder='Einwand z.B. "Das ist mir zu teuer"'
          value={objection.objection}
          onChange={(e) => setObjection({ ...objection, objection: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />

        <textarea
          placeholder="Deine Antwort..."
          value={objection.response}
          onChange={(e) => setObjection({ ...objection, response: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 resize-none"
        />

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={() => objection.objection && objection.response && onSave(objection)}
            disabled={!objection.objection || !objection.response}
            className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

