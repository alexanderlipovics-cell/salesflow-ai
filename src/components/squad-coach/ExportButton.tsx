// ============================================================================
// FILE: src/components/squad-coach/ExportButton.tsx
// DESCRIPTION: Export functionality for Squad Coach reports (CSV/PDF)
// ============================================================================

import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SquadCoachReport } from '@/types/squad-coach';

interface ExportButtonProps {
  reports: SquadCoachReport[];
  workspaceName?: string;
  className?: string;
}

export const ExportButton = React.memo<ExportButtonProps>(
  ({ reports, workspaceName = 'workspace', className }) => {
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = () => {
      setIsExporting(true);
      try {
        const headers = [
          'Name',
          'Email',
          'Role',
          'Health Score',
          'Focus Area',
          'Conversion Rate %',
          'Reply Rate %',
          'Contacts Contacted',
          'Contacts Signed',
          'Overdue Follow-ups',
          'High Priority Tasks',
        ];

        const rows = reports.map((r) => [
          r.full_name,
          r.email,
          r.role,
          r.health_score.toFixed(2),
          r.focus_area,
          r.conversion_rate_percent.toFixed(2),
          r.reply_rate_percent.toFixed(2),
          r.contacts_contacted,
          r.contacts_signed,
          r.overdue_followups,
          r.high_priority_open_followups,
        ]);

        const csv = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `squad-coach-${workspaceName}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        console.log('Export successful');
      } catch (err) {
        console.error('Export error:', err);
      } finally {
        setIsExporting(false);
      }
    };

    return (
      <Button
        onClick={exportToCSV}
        variant="outline"
        size="sm"
        className={cn('sf-button-secondary', className)}
        disabled={isExporting || reports.length === 0}
      >
        {isExporting ? (
          <>
            <Download className="h-4 w-4 mr-2 animate-spin" />
            Exportiere...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV Export
          </>
        )}
      </Button>
    );
  }
);

ExportButton.displayName = 'ExportButton';

