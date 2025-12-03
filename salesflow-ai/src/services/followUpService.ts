/**
 * Follow-up Service
 * 
 * Service-Funktionen für das Follow-up-System.
 * Reine Datenlogik, keine UI-Komponenten.
 */

import { supabaseClient } from "@/lib/supabaseClient";
import { STANDARD_FOLLOW_UP_SEQUENCE } from "@/config/followupSequence";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface LeadTaskInsert {
  lead_id: string;
  task_type: 'follow_up';
  status: 'open';
  template_key: string;
  due_at: string;
  note: string;
}

/**
 * Minimales Interface für die aktuelle Task bei Loop-Check-in Planung.
 */
interface LoopCheckinTaskInput {
  id: string;
  lead_id: string;
  due_at: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Startet die Standard-Follow-up-Sequenz für einen Lead.
 * Erstellt alle Tasks mit fixem offsetDays (ohne Loop-Step).
 * 
 * @param leadId - Die ID des Leads
 * @param baseDate - Das Startdatum (Standard: jetzt)
 * @throws Error wenn das Einfügen fehlschlägt
 */
export async function startStandardFollowUpSequenceForLead(
  leadId: string,
  baseDate: Date = new Date()
): Promise<void> {
  // Nur Templates mit offsetDays nehmen (Loop-Step hat intervalDays statt offsetDays)
  const templatesWithOffset = STANDARD_FOLLOW_UP_SEQUENCE.filter(
    (template) => template.offsetDays !== undefined
  );

  // Tasks für die Datenbank vorbereiten
  const tasks: LeadTaskInsert[] = templatesWithOffset.map((template) => {
    const dueAt = new Date(
      baseDate.getTime() + (template.offsetDays ?? 0) * 24 * 60 * 60 * 1000
    );

    return {
      lead_id: leadId,
      task_type: 'follow_up',
      status: 'open',
      template_key: template.key,
      due_at: dueAt.toISOString(),
      note: template.label,
    };
  });

  // Alle Tasks in einem Insert einfügen
  const { error } = await supabaseClient.from('lead_tasks').insert(tasks);

  if (error) {
    console.error('Follow-up Sequenz Insert Fehler:', error);
    throw new Error('Follow-up Sequenz konnte nicht gestartet werden: ' + error.message);
  }
}

/**
 * Prüft, ob für einen Lead bereits offene Follow-up Tasks existieren.
 * 
 * @param leadId - Die ID des Leads
 * @returns true wenn bereits offene Tasks existieren
 */
export async function hasOpenFollowUpTasks(leadId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('lead_tasks')
    .select('id')
    .eq('lead_id', leadId)
    .eq('task_type', 'follow_up')
    .eq('status', 'open')
    .limit(1);

  if (error) {
    console.error('Follow-up Check Fehler:', error);
    throw new Error('Konnte nicht prüfen, ob Follow-up Tasks existieren: ' + error.message);
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Löscht alle offenen Follow-up Tasks für einen Lead.
 * Nützlich, um eine Sequenz neu zu starten.
 * 
 * @param leadId - Die ID des Leads
 */
export async function deleteOpenFollowUpTasksForLead(leadId: string): Promise<void> {
  const { error } = await supabaseClient
    .from('lead_tasks')
    .delete()
    .eq('lead_id', leadId)
    .eq('task_type', 'follow_up')
    .eq('status', 'open');

  if (error) {
    console.error('Follow-up Delete Fehler:', error);
    throw new Error('Offene Follow-up Tasks konnten nicht gelöscht werden: ' + error.message);
  }
}

/**
 * Plant den nächsten Loop-Check-in Task 180 Tage nach dem aktuellen due_at.
 * Wird aufgerufen, wenn ein rx_loop_checkin Task als 'done' markiert wird.
 * 
 * @param currentTask - Die aktuelle Task mit id, lead_id und due_at
 * @throws Error wenn due_at nicht gesetzt ist oder das Einfügen fehlschlägt
 */
export async function scheduleNextLoopCheckinTask(
  currentTask: LoopCheckinTaskInput
): Promise<void> {
  // Nur ausführen, wenn due_at gesetzt ist
  if (!currentTask.due_at) {
    console.warn('scheduleNextLoopCheckinTask: due_at ist nicht gesetzt, übersprungen.');
    return;
  }

  const dueDate = new Date(currentTask.due_at);
  const nextDate = new Date(dueDate.getTime() + 180 * 24 * 60 * 60 * 1000);

  const newTask: LeadTaskInsert = {
    lead_id: currentTask.lead_id,
    task_type: 'follow_up',
    status: 'open',
    template_key: 'rx_loop_checkin',
    due_at: nextDate.toISOString(),
    note: 'Regelmäßiger Check-in',
  };

  const { error } = await supabaseClient.from('lead_tasks').insert(newTask);

  if (error) {
    console.error('Loop-Check-in Insert Fehler:', error);
    throw new Error('Nächster Loop-Check-in konnte nicht angelegt werden: ' + error.message);
  }
}

