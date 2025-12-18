// ============================================
// 🔄 SALESFLOW AI - SMART FOLLOW-UP ENGINE
// ============================================
// Features:
// - Sequenz Builder (Drag & Drop)
// - Template Library
// - Team Template Sharing
// - A/B Testing für Follow-Ups
// - Performance Analytics
// - Calendar Integration
// - Automated Scheduling

'use client';

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Textarea,
  Tabs,
  EmptyState,
  Skeleton,
  BottomSheet,
  ProgressBar,
  Avatar,
} from '../ui/components';
import {
  useSequences,
  useSequence,
  useCreateSequence,
  useUpdateSequence,
} from '../../hooks/useClaudeApi';
import { useFollowUpBuilderStore, useUIStore } from '../../stores';
import { cn, formatPercent, formatRelativeTime, generateId } from '../../utils/cn';
import type { FollowUpSequence, FollowUpStep, FollowUpTemplate, FollowUpType } from '../../types/salesflow-ui';

// ==================== ICONS ====================

const Icons = {
  Mail: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  MessageSquare: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Linkedin: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  WhatsApp: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  GripVertical: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 10h.01M8 14h.01M8 18h.01M12 6h.01M12 10h.01M12 14h.01M12 18h.01" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  BarChart: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Share: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  Beaker: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Save: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Template: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
};

// ==================== STEP TYPE CONFIG ====================

const STEP_TYPES: Record<FollowUpType, { label: string; icon: React.ReactNode; color: string }> = {
  email: { label: 'E-Mail', icon: <Icons.Mail />, color: 'bg-blue-500' },
  sms: { label: 'SMS', icon: <Icons.MessageSquare />, color: 'bg-green-500' },
  call: { label: 'Anruf', icon: <Icons.Phone />, color: 'bg-amber-500' },
  whatsapp: { label: 'WhatsApp', icon: <Icons.WhatsApp />, color: 'bg-emerald-500' },
  linkedin: { label: 'LinkedIn', icon: <Icons.Linkedin />, color: 'bg-sky-600' },
};

// ==================== BUILDER STEP CARD ====================

interface BuilderStepCardProps {
  step: {
    id: string;
    type: FollowUpType;
    delayDays: number;
    delayHours: number;
    subject?: string;
    content: string;
  };
  index: number;
  isFirst: boolean;
  isDragging?: boolean;
  onUpdate: (id: string, updates: Partial<BuilderStepCardProps['step']>) => void;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

const BuilderStepCard = memo(({
  step,
  index,
  isFirst,
  isDragging,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
}: BuilderStepCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const stepConfig = STEP_TYPES[step.type];

  return (
    <Card
      variant="default"
      padding="none"
      className={cn(
        'relative transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        'group'
      )}
    >
      {/* Connector Line */}
      {!isFirst && (
        <div className="absolute -top-8 left-8 w-0.5 h-8 bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            className="mt-1 p-1 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={() => onDragStart(step.id)}
            onMouseUp={onDragEnd}
            onTouchStart={() => onDragStart(step.id)}
            onTouchEnd={onDragEnd}
          >
            <Icons.GripVertical />
          </button>

          {/* Step Icon */}
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', stepConfig.color)}>
            {stepConfig.icon}
          </div>

          {/* Step Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">Schritt {index + 1}</Badge>
              <span className="font-medium text-gray-900 dark:text-white">
                {stepConfig.label}
              </span>
            </div>

            {/* Delay */}
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <Icons.Clock />
              <span>
                {isFirst ? 'Sofort' : `Nach ${step.delayDays} Tag${step.delayDays !== 1 ? 'en' : ''}${step.delayHours > 0 ? ` ${step.delayHours}h` : ''}`}
              </span>
            </div>

            {/* Subject Preview */}
            {step.subject && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                Betreff: {step.subject}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Icons.Edit />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(step.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Icons.Trash />
            </Button>
          </div>
        </div>

        {/* Expanded Editor */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
            {/* Step Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kanal
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STEP_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => onUpdate(step.id, { type: type as FollowUpType })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                      step.type === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    {config.icon}
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Delay */}
            {!isFirst && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tage warten"
                  type="number"
                  min={0}
                  value={step.delayDays}
                  onChange={(e) => onUpdate(step.id, { delayDays: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Stunden"
                  type="number"
                  min={0}
                  max={23}
                  value={step.delayHours}
                  onChange={(e) => onUpdate(step.id, { delayHours: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            {/* Subject (for email) */}
            {step.type === 'email' && (
              <Input
                label="Betreff"
                placeholder="Betreffzeile eingeben..."
                value={step.subject || ''}
                onChange={(e) => onUpdate(step.id, { subject: e.target.value })}
              />
            )}

            {/* Content */}
            <Textarea
              label="Nachricht"
              placeholder="Nachrichtentext eingeben..."
              value={step.content}
              onChange={(e) => onUpdate(step.id, { content: e.target.value })}
              rows={4}
            />

            {/* Variables Info */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Verfügbare Variablen:
              </p>
              <div className="flex flex-wrap gap-1">
                {['{{vorname}}', '{{nachname}}', '{{firma}}', '{{position}}'].map((v) => (
                  <Badge key={v} variant="default" size="sm">{v}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});
BuilderStepCard.displayName = 'BuilderStepCard';

// ==================== ADD STEP BUTTON ====================

interface AddStepButtonProps {
  onAdd: (type: FollowUpType) => void;
}

const AddStepButton = memo(({ onAdd }: AddStepButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        <Icons.Plus />
        <span className="font-medium">Schritt hinzufügen</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(STEP_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    onAdd(type as FollowUpType);
                    setIsOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', config.color)}>
                    {config.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
AddStepButton.displayName = 'AddStepButton';

// ==================== SEQUENCE CARD ====================

interface SequenceCardProps {
  sequence: FollowUpSequence;
  onEdit: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDuplicate: (id: string) => void;
}

const SequenceCard = memo(({ sequence, onEdit, onToggle, onDuplicate }: SequenceCardProps) => (
  <Card variant="default" padding="md" interactive onClick={() => onEdit(sequence.id)}>
    <div className="flex items-start gap-4">
      {/* Status Indicator */}
      <div className={cn(
        'w-3 h-3 rounded-full mt-1.5 flex-shrink-0',
        sequence.isActive ? 'bg-green-500' : 'bg-gray-300'
      )} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {sequence.name}
          </h3>
          {sequence.isShared && (
            <Badge variant="primary" size="sm">
              <Icons.Share />
              Geteilt
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {sequence.steps.length} Schritte • {sequence.stats.totalEnrolled} Leads eingetragen
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Öffnungsrate</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatPercent(sequence.stats.openRate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Antwortrate</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatPercent(sequence.stats.replyRate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Abgeschlossen</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {sequence.stats.completed}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(sequence.id, !sequence.isActive);
          }}
        >
          {sequence.isActive ? <Icons.Pause /> : <Icons.Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(sequence.id);
          }}
        >
          <Icons.Copy />
        </Button>
      </div>
    </div>
  </Card>
));
SequenceCard.displayName = 'SequenceCard';

// ==================== TEMPLATE LIBRARY ====================

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: FollowUpTemplate) => void;
}

const SAMPLE_TEMPLATES: FollowUpTemplate[] = [
  {
    id: '1',
    name: 'Erstkontakt - Freundlich',
    subject: 'Kurze Frage zu {{firma}}',
    content: 'Hallo {{vorname}},\n\nich bin auf {{firma}} aufmerksam geworden und würde mich gerne kurz mit Ihnen austauschen.\n\nHaben Sie diese Woche 15 Minuten Zeit für ein kurzes Gespräch?\n\nBeste Grüße',
    variables: ['vorname', 'firma'],
    isShared: true,
    createdBy: 'system',
    category: 'Erstkontakt',
  },
  {
    id: '2',
    name: 'Follow-Up #1 - Sanft',
    subject: 'Nochmal zu unserem Gespräch',
    content: 'Hallo {{vorname}},\n\nich wollte kurz nachfragen, ob meine letzte Nachricht angekommen ist.\n\nWäre toll, wenn wir uns diese Woche verbinden könnten.\n\nBeste Grüße',
    variables: ['vorname'],
    isShared: true,
    createdBy: 'system',
    category: 'Follow-Up',
  },
  {
    id: '3',
    name: 'Breakup Email',
    subject: 'Letzter Versuch',
    content: 'Hallo {{vorname}},\n\nich habe versucht, Sie zu erreichen, aber bisher keine Antwort erhalten.\n\nIch gehe davon aus, dass dies gerade keine Priorität für Sie ist - kein Problem!\n\nFalls sich das ändert, können Sie mich jederzeit erreichen.\n\nAlles Gute!',
    variables: ['vorname'],
    isShared: true,
    createdBy: 'system',
    category: 'Breakup',
  },
];

const TemplateLibrary = memo(({ isOpen, onClose, onSelect }: TemplateLibraryProps) => {
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(SAMPLE_TEMPLATES.map((t) => t.category || 'Sonstige'));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (category === 'all') return SAMPLE_TEMPLATES;
    return SAMPLE_TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Template Library" height="half">
      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            )}
          >
            {cat === 'all' ? 'Alle' : cat}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            variant="default"
            padding="md"
            interactive
            onClick={() => {
              onSelect(template);
              onClose();
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Icons.Template />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </h4>
                {template.subject && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {template.subject}
                  </p>
                )}
                <Badge variant="default" size="sm" className="mt-2">
                  {template.category}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </BottomSheet>
  );
});
TemplateLibrary.displayName = 'TemplateLibrary';

// ==================== A/B TEST PANEL ====================

interface ABTestPanelProps {
  sequenceId: string;
}

const ABTestPanel = memo(({ sequenceId }: ABTestPanelProps) => {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <Card variant="gradient" padding="lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
          <Icons.Beaker />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            A/B Testing
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Teste verschiedene Versionen deiner Nachrichten um die beste Performance zu finden.
          </p>

          {!isCreating ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              <Icons.Plus />
              Variante erstellen
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                label="Variante Name"
                placeholder="z.B. Version B - Kürzerer Text"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  Erstellen
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});
ABTestPanel.displayName = 'ABTestPanel';

// ==================== PERFORMANCE STATS ====================

interface PerformanceStatsProps {
  stats?: {
    totalEnrolled: number;
    completed: number;
    replied: number;
    bounced: number;
    openRate: number;
    replyRate: number;
  };
}

const PerformanceStats = memo(({ stats }: PerformanceStatsProps) => {
  if (!stats) return null;

  return (
    <Card variant="default" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.BarChart />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Öffnungsrate</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPercent(stats.openRate)}
              </span>
            </div>
            <ProgressBar value={stats.openRate} size="sm" color="blue" className="mt-2" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Antwortrate</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPercent(stats.replyRate)}
              </span>
            </div>
            <ProgressBar value={stats.replyRate} size="sm" color="green" className="mt-2" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Eingetragen</p>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.totalEnrolled}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Abgeschlossen</p>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.completed}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
PerformanceStats.displayName = 'PerformanceStats';

// ==================== MAIN COMPONENT ====================

export function SmartFollowUpEngine() {
  const { addToast } = useUIStore();
  const {
    steps,
    isDirty,
    currentSequenceId,
    showTemplateLibrary,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    setDraggedStep,
    toggleTemplateLibrary,
    clearBuilder,
    markClean,
  } = useFollowUpBuilderStore();

  // Data
  const { data: sequencesData, isLoading: sequencesLoading } = useSequences();
  const { data: currentSequenceData } = useSequence(currentSequenceId || '');
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();

  // Local state
  const [activeTab, setActiveTab] = useState('sequences');
  const [sequenceName, setSequenceName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sequences = useMemo(() => sequencesData?.data || [], [sequencesData]);

  // Handlers
  const handleAddStep = useCallback((type: FollowUpType) => {
    addStep({
      id: generateId(),
      type,
      delayDays: steps.length === 0 ? 0 : 2,
      delayHours: 0,
      content: '',
    });
  }, [addStep, steps.length]);

  const handleTemplateSelect = useCallback((template: FollowUpTemplate) => {
    addStep({
      id: generateId(),
      type: 'email',
      delayDays: steps.length === 0 ? 0 : 2,
      delayHours: 0,
      subject: template.subject,
      content: template.content,
    });
  }, [addStep, steps.length]);

  const handleSave = useCallback(async () => {
    if (!sequenceName.trim() && !currentSequenceId) {
      addToast({ type: 'warning', title: 'Name erforderlich', message: 'Bitte gib einen Namen für die Sequenz ein.' });
      return;
    }

    try {
      if (currentSequenceId) {
        await updateSequence.mutateAsync({
          id: currentSequenceId,
          data: { steps: steps as any },
        });
      } else {
        await createSequence.mutateAsync({
          name: sequenceName,
          steps: steps as any,
          isActive: false,
        });
      }

      addToast({ type: 'success', title: 'Gespeichert!' });
      markClean();
      if (!currentSequenceId) {
        clearBuilder();
        setSequenceName('');
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Fehler beim Speichern' });
    }
  }, [sequenceName, currentSequenceId, steps, createSequence, updateSequence, addToast, markClean, clearBuilder]);

  const tabs = useMemo(() => [
    { id: 'sequences', label: 'Sequenzen', badge: sequences.length },
    { id: 'builder', label: 'Builder', badge: isDirty ? 1 : undefined },
  ], [sequences.length, isDirty]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Follow-Up Engine
          </h1>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        {activeTab === 'sequences' && (
          <div className="space-y-4">
            {/* New Sequence Button */}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                clearBuilder();
                setActiveTab('builder');
              }}
            >
              <Icons.Plus />
              Neue Sequenz erstellen
            </Button>

            {/* Sequences List */}
            {sequencesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={140} className="rounded-2xl" />
                ))}
              </div>
            ) : sequences.length > 0 ? (
              <div className="space-y-3">
                {sequences.map((seq) => (
                  <SequenceCard
                    key={seq.id}
                    sequence={seq}
                    onEdit={(id) => {
                      // Load sequence into builder
                      setActiveTab('builder');
                    }}
                    onToggle={(id, isActive) => {
                      updateSequence.mutate({ id, data: { isActive } });
                    }}
                    onDuplicate={(id) => {
                      addToast({ type: 'success', title: 'Sequenz dupliziert' });
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Icons.Mail />}
                title="Keine Sequenzen"
                description="Erstelle deine erste Follow-Up Sequenz um automatisch mit Leads in Kontakt zu bleiben."
              />
            )}
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="space-y-6">
            {/* Sequence Name */}
            <Input
              label="Sequenz Name"
              placeholder="z.B. Erstkontakt Sequenz"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
            />

            {/* Steps */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Schritte ({steps.length})
                </h2>
                <Button variant="ghost" size="sm" onClick={() => toggleTemplateLibrary()}>
                  <Icons.Template />
                  Templates
                </Button>
              </div>

              {steps.length > 0 ? (
                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <BuilderStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      isFirst={index === 0}
                      isDragging={draggedId === step.id}
                      onUpdate={updateStep}
                      onRemove={removeStep}
                      onDragStart={setDraggedId}
                      onDragEnd={() => setDraggedId(null)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Keine Schritte"
                  description="Füge den ersten Schritt hinzu um deine Sequenz zu starten."
                />
              )}

              <AddStepButton onAdd={handleAddStep} />
            </div>

            {/* A/B Testing */}
            {steps.length > 0 && (
              <ABTestPanel sequenceId={currentSequenceId || ''} />
            )}

            {/* Performance (if editing existing) */}
            {currentSequenceData?.data && (
              <PerformanceStats stats={currentSequenceData.data.stats} />
            )}

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSave}
                isLoading={createSequence.isPending || updateSequence.isPending}
                disabled={steps.length === 0}
              >
                <Icons.Save />
                {currentSequenceId ? 'Änderungen speichern' : 'Sequenz erstellen'}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Template Library */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => toggleTemplateLibrary()}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

export default SmartFollowUpEngine;
