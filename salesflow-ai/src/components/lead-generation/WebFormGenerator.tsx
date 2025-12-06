/**
 * Web Form Embed Code Generator
 * 
 * Generiert Embed-Codes für Lead-Formulare auf externen Websites.
 * 
 * @author SalesFlow AI
 */

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../ui/card';

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormConfig {
  formId: string;
  title: string;
  description: string;
  buttonText: string;
  successMessage: string;
  redirectUrl?: string;
  fields: FormField[];
  styling: {
    primaryColor: string;
    backgroundColor: string;
    borderRadius: string;
    fontFamily: string;
  };
  tracking: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

const defaultFields: FormField[] = [
  { id: 'name', name: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Dein Name' },
  { id: 'email', name: 'email', type: 'email', label: 'E-Mail', required: true, placeholder: 'deine@email.de' },
  { id: 'phone', name: 'phone', type: 'tel', label: 'Telefon', required: false, placeholder: '+49 123 456789' },
];

const defaultConfig: FormConfig = {
  formId: 'salesflow-lead-form',
  title: 'Kostenloses Info-Gespräch',
  description: 'Trage dich ein und ich melde mich bei dir!',
  buttonText: 'Jetzt eintragen',
  successMessage: 'Danke! Ich melde mich in Kürze bei dir.',
  fields: defaultFields,
  styling: {
    primaryColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif',
  },
  tracking: {},
};

export const WebFormGenerator: React.FC = () => {
  const [config, setConfig] = useState<FormConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'fields' | 'styling' | 'tracking' | 'preview'>('fields');
  const [copied, setCopied] = useState(false);

  // Webhook URL (replace with actual backend URL)
  const webhookUrl = `${window.location.origin}/api/webhooks/ads/webform`;

  // Generate HTML Embed Code
  const htmlCode = useMemo(() => {
    const fieldsHtml = config.fields.map(field => {
      if (field.type === 'textarea') {
        return `    <div class="sf-field">
      <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
      <textarea id="${field.id}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>
    </div>`;
      }
      if (field.type === 'select' && field.options) {
        return `    <div class="sf-field">
      <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
      <select id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''}>
        <option value="">Bitte wählen...</option>
        ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('\n        ')}
      </select>
    </div>`;
      }
      return `    <div class="sf-field">
      <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
      <input type="${field.type}" id="${field.id}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />
    </div>`;
    }).join('\n');

    const utmParams = Object.entries(config.tracking)
      .filter(([_, v]) => v)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
      .join('\n    ');

    return `<!-- SalesFlow Lead Form - ${config.formId} -->
<div id="${config.formId}" class="sf-form-container">
  <style>
    #${config.formId} {
      font-family: ${config.styling.fontFamily};
      max-width: 400px;
      margin: 0 auto;
      padding: 24px;
      background: ${config.styling.backgroundColor};
      border-radius: ${config.styling.borderRadius};
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    #${config.formId} .sf-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: #1F2937;
    }
    #${config.formId} .sf-description {
      color: #6B7280;
      margin-bottom: 20px;
    }
    #${config.formId} .sf-field {
      margin-bottom: 16px;
    }
    #${config.formId} label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
    }
    #${config.formId} input,
    #${config.formId} textarea,
    #${config.formId} select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    #${config.formId} input:focus,
    #${config.formId} textarea:focus,
    #${config.formId} select:focus {
      outline: none;
      border-color: ${config.styling.primaryColor};
      box-shadow: 0 0 0 3px ${config.styling.primaryColor}33;
    }
    #${config.formId} button {
      width: 100%;
      padding: 12px;
      background: ${config.styling.primaryColor};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    #${config.formId} button:hover {
      opacity: 0.9;
    }
    #${config.formId} button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #${config.formId} .sf-success {
      text-align: center;
      padding: 20px;
      color: #059669;
    }
    #${config.formId} .sf-error {
      color: #DC2626;
      font-size: 0.875rem;
      margin-top: 8px;
    }
  </style>
  
  <form id="${config.formId}-form" onsubmit="submitSalesFlowForm(event)">
    <h2 class="sf-title">${config.title}</h2>
    <p class="sf-description">${config.description}</p>
    
${fieldsHtml}
    ${utmParams ? utmParams + '\n    ' : ''}<input type="hidden" name="form_id" value="${config.formId}" />
    <input type="hidden" name="source_url" value="" id="${config.formId}-source" />
    
    <button type="submit">${config.buttonText}</button>
    <div id="${config.formId}-error" class="sf-error" style="display: none;"></div>
  </form>
  
  <div id="${config.formId}-success" class="sf-success" style="display: none;">
    ✅ ${config.successMessage}
  </div>
</div>

<script>
  // Set source URL
  document.getElementById('${config.formId}-source').value = window.location.href;
  
  async function submitSalesFlowForm(e) {
    e.preventDefault();
    const form = document.getElementById('${config.formId}-form');
    const button = form.querySelector('button');
    const errorDiv = document.getElementById('${config.formId}-error');
    const successDiv = document.getElementById('${config.formId}-success');
    
    button.disabled = true;
    button.textContent = 'Wird gesendet...';
    errorDiv.style.display = 'none';
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch('${webhookUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        form.style.display = 'none';
        successDiv.style.display = 'block';
        ${config.redirectUrl ? `setTimeout(() => window.location.href = '${config.redirectUrl}', 2000);` : ''}
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      errorDiv.textContent = 'Es gab einen Fehler. Bitte versuche es erneut.';
      errorDiv.style.display = 'block';
      button.disabled = false;
      button.textContent = '${config.buttonText}';
    }
  }
</script>
<!-- End SalesFlow Lead Form -->`;
  }, [config, webhookUrl]);

  // Generate JavaScript Embed Code (minimal)
  const jsCode = useMemo(() => {
    return `<!-- SalesFlow Lead Form Widget -->
<div id="${config.formId}"></div>
<script src="${window.location.origin}/embed/lead-form.js" 
        data-form-id="${config.formId}"
        data-webhook="${webhookUrl}"
        data-title="${config.title}"
        data-button="${config.buttonText}"
        data-color="${config.styling.primaryColor}">
</script>`;
  }, [config, webhookUrl]);

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...config.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setConfig({ ...config, fields: newFields });
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `custom_${config.fields.length + 1}`,
      type: 'text',
      label: 'Neues Feld',
      required: false,
      placeholder: '',
    };
    setConfig({ ...config, fields: [...config.fields, newField] });
  };

  const removeField = (index: number) => {
    const newFields = config.fields.filter((_, i) => i !== index);
    setConfig({ ...config, fields: newFields });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web-Formular Generator</h1>
          <p className="text-gray-500">Erstelle Lead-Formulare für deine Website</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <div className="flex gap-2 border-b pb-4">
              {(['fields', 'styling', 'tracking', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'fields' && '📝 Felder'}
                  {tab === 'styling' && '🎨 Design'}
                  {tab === 'tracking' && '📊 Tracking'}
                  {tab === 'preview' && '👁 Vorschau'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Fields Tab */}
            {activeTab === 'fields' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Formular-Titel</label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Beschreibung</label>
                    <input
                      type="text"
                      value={config.description}
                      onChange={(e) => setConfig({ ...config, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Button-Text</label>
                    <input
                      type="text"
                      value={config.buttonText}
                      onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Formular-Felder</h3>
                    <button
                      onClick={addField}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      + Feld hinzufügen
                    </button>
                  </div>

                  {config.fields.map((field, index) => (
                    <div key={field.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        <button
                          onClick={() => removeField(index)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          Entfernen
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Label"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="email">E-Mail</option>
                          <option value="tel">Telefon</option>
                          <option value="textarea">Textfeld</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 mt-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                        />
                        Pflichtfeld
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Styling Tab */}
            {activeTab === 'styling' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Primärfarbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.styling.primaryColor}
                      onChange={(e) => setConfig({
                        ...config,
                        styling: { ...config.styling, primaryColor: e.target.value }
                      })}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={config.styling.primaryColor}
                      onChange={(e) => setConfig({
                        ...config,
                        styling: { ...config.styling, primaryColor: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hintergrund</label>
                  <input
                    type="text"
                    value={config.styling.backgroundColor}
                    onChange={(e) => setConfig({
                      ...config,
                      styling: { ...config.styling, backgroundColor: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="#FFFFFF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ecken-Radius</label>
                  <input
                    type="text"
                    value={config.styling.borderRadius}
                    onChange={(e) => setConfig({
                      ...config,
                      styling: { ...config.styling, borderRadius: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="8px"
                  />
                </div>
              </div>
            )}

            {/* Tracking Tab */}
            {activeTab === 'tracking' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  UTM-Parameter werden automatisch mit jedem Lead gespeichert.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">UTM Source</label>
                  <input
                    type="text"
                    value={config.tracking.utmSource || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      tracking: { ...config.tracking, utmSource: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="website"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">UTM Medium</label>
                  <input
                    type="text"
                    value={config.tracking.utmMedium || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      tracking: { ...config.tracking, utmMedium: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="form"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">UTM Campaign</label>
                  <input
                    type="text"
                    value={config.tracking.utmCampaign || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      tracking: { ...config.tracking, utmCampaign: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="lead_form_2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Redirect URL (nach Absenden)</label>
                  <input
                    type="text"
                    value={config.redirectUrl || ''}
                    onChange={(e) => setConfig({ ...config, redirectUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div 
                className="border rounded-lg p-4 bg-gray-100"
                dangerouslySetInnerHTML={{ __html: htmlCode }}
              />
            )}
          </CardContent>
        </Card>

        {/* Code Output */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HTML Embed Code</CardTitle>
              <CardDescription>
                Kopiere diesen Code und füge ihn in deine Website ein
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  {htmlCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(htmlCode)}
                  className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  {copied ? '✓ Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Einfacher Embed (JavaScript)</CardTitle>
              <CardDescription>
                Minimaler Code für schnelle Integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {jsCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(jsCode)}
                  className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  {copied ? '✓ Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tipp</h3>
              <p className="text-sm text-blue-800">
                Du kannst das Formular auf jeder Website einbetten - WordPress, Wix, Squarespace, 
                oder auch in E-Mails und Landing Pages. Die Leads landen automatisch in deinem SalesFlow CRM!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WebFormGenerator;

