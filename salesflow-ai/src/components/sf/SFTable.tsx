import { memo, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface SFTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  className?: string;
}

function InnerTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = 'Keine Daten vorhanden',
  onRowClick,
  keyExtractor,
  className,
}: SFTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal === bVal) return 0;
      const direction = sortDirection === 'asc' ? 1 : -1;
      return aVal > bVal ? direction : -direction;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-12 w-full bg-sf-surface/80" />
        ))}
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-sf-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-sf-border/80 text-xs uppercase tracking-wide text-sf-text-muted">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'py-2 pr-4 text-left font-medium',
                  column.sortable && 'cursor-pointer hover:text-sf-text',
                  column.className
                )}
                onClick={() => column.sortable && handleSort(String(column.key))}
                role="columnheader"
                aria-sort={
                  sortKey === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortKey === column.key && (
                    <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <motion.tr
              key={keyExtractor(row)}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                'border-b border-sf-border/40 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-white/5'
              )}
              onClick={() => onRowClick?.(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(event) => {
                if (!onRowClick) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {columns.map((column) => {
                const value = (row as any)[column.key];
                return (
                  <td key={String(column.key)} className={cn('py-3 pr-4', column.className)}>
                    {column.render ? column.render(value, row) : value}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const SFTable = memo(InnerTable) as typeof InnerTable;
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface SFTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  className?: string;
}

export function SFTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = "Keine Daten vorhanden",
  onRowClick,
  keyExtractor,
  className,
}: SFTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc"
  );

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal === bVal) return 0;
      const direction = sortDirection === "asc" ? 1 : -1;
      return aVal > bVal ? direction : -direction;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-sf-surface" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-sf-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-sm" role="table">
        <thead>
          <tr
            className="border-b border-sf-border/70 text-xs uppercase tracking-wide text-sf-text-muted"
            role="row"
          >
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "py-2 pr-4 text-left font-medium",
                  column.sortable && "cursor-pointer hover:text-sf-text",
                  column.className
                )}
                onClick={() => column.sortable && handleSort(String(column.key))}
                role="columnheader"
                aria-sort={
                  sortKey === column.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortKey === column.key && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <motion.tr
              key={keyExtractor(row)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "border-b border-sf-border/40 last:border-0 transition-colors hover:bg-white/5",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
              role="row"
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {columns.map((column) => {
                const value = (row as any)[column.key];
                return (
                  <td
                    key={String(column.key)}
                    className={cn("py-2 pr-4", column.className)}
                    role="cell"
                  >
                    {column.render ? column.render(value, row) : value}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

