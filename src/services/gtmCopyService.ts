/**
 * GTM Copy Service
 * 
 * Service für den Go-to-Market Copywriting Assistant.
 * Generiert Marketing- und Sales-Content (Landingpages, Angebote, Scripts, Social Posts).
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type GtmCopyPayload = {
  task: string;
  context?: string;
  channel?: string;
  style?: string;
  vertical?: string;
  package?: string;
  output_format?: string;
  persona_key?: string;
};

export type GtmCopyResult = {
  content: string;
};

// ─────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Generiert GTM-Content über das Backend
 */
export async function generateGtmCopy(payload: GtmCopyPayload): Promise<GtmCopyResult> {
  const response = await fetch("/api/gtm-copy/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: payload.task,
      context: payload.context ?? null,
      channel: payload.channel ?? null,
      style: payload.style ?? null,
      vertical: payload.vertical ?? null,
      package: payload.package ?? null,
      output_format: payload.output_format ?? null,
      persona_key: payload.persona_key ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `GTM-Copy-Anfrage fehlgeschlagen (${response.status}): ${
        text || "Unbekannter Fehler"
      }`
    );
  }

  const data = (await response.json()) as GtmCopyResult;
  return data;
}

