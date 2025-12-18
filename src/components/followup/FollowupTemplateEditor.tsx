import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Eye, Save, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Template {
  id?: string;
  name: string;
  trigger_key: string;
  channel: 'whatsapp' | 'email' | 'in_app';
  category?: string;
  subject_template?: string;
  body_template: string;
  reminder_template?: string;
  fallback_template?: string;
  gpt_autocomplete_prompt?: string;
  preview_context?: Record<string, any>;
}

interface FollowupTemplateEditorProps {
  template?: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

export default function FollowupTemplateEditor({
  template,
  onSave,
  onCancel
}: FollowupTemplateEditorProps) {
  const [form, setForm] = useState<Template>(template || {
    name: '',
    trigger_key: '',
    channel: 'email',
    body_template: '',
    preview_context: {}
  });

  const [loading, setLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleChange = (field: keyof Template, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGptAutocomplete = async () => {
    if (!form.id) {
      alert('Bitte speichere das Template zuerst, bevor du GPT Auto-Complete verwendest.');
      return;
    }

    setGptLoading(true);

    try {
      const response = await api.post('/api/templates/autocomplete', {
        template_id: form.id,
        lead_context: form.preview_context
      });

      if (response.data.success) {
        setForm(prev => ({
          ...prev,
          reminder_template: response.data.data.reminder_template,
          fallback_template: response.data.data.fallback_template
        }));
      }
    } catch (error) {
      console.error('GPT autocomplete error:', error);
      alert('Fehler beim Generieren der Templates');
    } finally {
      setGptLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!form.id) {
      alert('Bitte speichere das Template zuerst.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/templates/preview', {
        template_id: form.id,
        context: form.preview_context
      });

      if (response.data.success) {
        setPreview(response.data.preview);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (form.id) {
        // Update existing
        const response = await api.put(`/api/templates/${form.id}`, form);
        if (response.data.success) {
          onSave(response.data.template);
        }
      } else {
        // Create new
        const response = await api.post('/api/templates/create', form);
        if (response.data.success) {
          onSave(response.data.template);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {form.id ? 'Template bearbeiten' : 'Neues Template erstellen'}
          </CardTitle>
          <CardDescription>
            Erstelle oder bearbeite Follow-up Templates mit GPT Auto-Complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. Inaktivität 14 Tage"
            />
          </div>

          {/* Trigger Key */}
          <div>
            <Label htmlFor="trigger_key">Trigger Key</Label>
            <Input
              id="trigger_key"
              value={form.trigger_key}
              onChange={(e) => handleChange('trigger_key', e.target.value)}
              placeholder="z.B. inactivity_14d"
            />
          </div>

          {/* Channel */}
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={form.channel}
              onValueChange={(value) => handleChange('channel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Kategorie</Label>
            <Select
              value={form.category || ''}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wähle Kategorie..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reactivation">Reactivation</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="objection">Objection</SelectItem>
                <SelectItem value="nurture">Nurture</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject (Email only) */}
          {form.channel === 'email' && (
            <div>
              <Label htmlFor="subject">Betreff (Email)</Label>
              <Input
                id="subject"
                value={form.subject_template || ''}
                onChange={(e) => handleChange('subject_template', e.target.value)}
                placeholder="z.B. Noch Fragen zu {{product_name}}?"
              />
            </div>
          )}

          {/* Body Template */}
          <div>
            <Label htmlFor="body">Body Template</Label>
            <Textarea
              id="body"
              value={form.body_template}
              onChange={(e) => handleChange('body_template', e.target.value)}
              placeholder="Hey {{first_name}}, ..."
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Verwende {{'{'}{'{'} first_name {'}'}{'}'}, {{'{'}{'{'} company {'}'}{'}'}, etc.
            </p>
          </div>

          {/* GPT Autocomplete Prompt */}
          <div>
            <Label htmlFor="gpt_prompt">GPT Auto-Complete Prompt</Label>
            <Textarea
              id="gpt_prompt"
              value={form.gpt_autocomplete_prompt || ''}
              onChange={(e) => handleChange('gpt_autocomplete_prompt', e.target.value)}
              placeholder="Generiere für {{first_name}} nach 14 Tagen..."
              rows={4}
            />
          </div>

          {/* GPT Auto-Complete Button */}
          <Button
            onClick={handleGptAutocomplete}
            disabled={gptLoading || !form.id}
            variant="outline"
            className="w-full"
          >
            {gptLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                🤖 Generate Reminder + Fallback mit GPT
              </>
            )}
          </Button>

          {/* Reminder Template */}
          <div>
            <Label htmlFor="reminder">Reminder Template (Tag 2)</Label>
            <Textarea
              id="reminder"
              value={form.reminder_template || ''}
              onChange={(e) => handleChange('reminder_template', e.target.value)}
              placeholder="Auto-generiert oder manuell eingeben..."
              rows={4}
            />
          </div>

          {/* Fallback Template */}
          <div>
            <Label htmlFor="fallback">Fallback Template (Tag 5)</Label>
            <Textarea
              id="fallback"
              value={form.fallback_template || ''}
              onChange={(e) => handleChange('fallback_template', e.target.value)}
              placeholder="Auto-generiert oder manuell eingeben..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  💾 Speichern
                </>
              )}
            </Button>

            <Button onClick={handlePreview} disabled={loading || !form.id} variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Vorschau
            </Button>

            <Button onClick={onCancel} variant="ghost">
              <X className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewOpen && preview && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>Template Vorschau</CardTitle>
            <Button
              onClick={() => setPreviewOpen(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.subject && (
              <div>
                <Label className="text-xs text-gray-500">Betreff:</Label>
                <p className="font-semibold">{preview.subject}</p>
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500">Body:</Label>
              <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap">
                {preview.body}
              </div>
            </div>

            {preview.reminder && (
              <div>
                <Label className="text-xs text-gray-500">Reminder (Tag 2):</Label>
                <div className="p-3 bg-blue-50 rounded whitespace-pre-wrap">
                  {preview.reminder}
                </div>
              </div>
            )}

            {preview.fallback && (
              <div>
                <Label className="text-xs text-gray-500">Fallback (Tag 5):</Label>
                <div className="p-3 bg-orange-50 rounded whitespace-pre-wrap">
                  {preview.fallback}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

