"use client";

import * as React from "react";
import {
  columnsForScope,
  defaultHiddenColumnKeys,
  loadHiddenColumnKeys,
  saveHiddenColumnKeys,
  type SubmissionColumnScope,
} from "@/lib/submissionColumns";

export function useSubmissionHiddenColumns(scope: SubmissionColumnScope, projectId?: number) {
  const [hiddenKeys, setHiddenKeys] = React.useState<string[]>(() =>
    defaultHiddenColumnKeys(scope),
  );
  const [showPicker, setShowPicker] = React.useState(false);

  React.useEffect(() => {
    setHiddenKeys(loadHiddenColumnKeys(scope, projectId));
  }, [scope, projectId]);

  const toggleColumn = React.useCallback(
    (key: string, visible: boolean) => {
      setHiddenKeys((prev) => {
        const next = visible ? prev.filter((k) => k !== key) : [...prev, key];
        saveHiddenColumnKeys(scope, next, projectId);
        return next;
      });
    },
    [scope, projectId],
  );

  const resetColumns = React.useCallback(() => {
    const defaults = defaultHiddenColumnKeys(scope);
    setHiddenKeys(defaults);
    saveHiddenColumnKeys(scope, defaults, projectId);
  }, [scope, projectId]);

  return { hiddenKeys, showPicker, setShowPicker, toggleColumn, resetColumns };
}

export function SubmissionColumnPicker({
  scope,
  hiddenKeys,
  onToggle,
  onReset,
}: {
  scope: SubmissionColumnScope;
  hiddenKeys: string[];
  onToggle: (key: string, visible: boolean) => void;
  onReset: () => void;
}) {
  const cols = columnsForScope(scope);

  return (
    <div className="mb-4 rounded-xl border bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">Show / hide columns</p>
      <div className="flex flex-wrap gap-2">
        {cols.map((col) => {
          const visible = !hiddenKeys.includes(col.key);
          return (
            <label key={col.key} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => onToggle(col.key, e.target.checked)}
              />
              {col.label}
            </label>
          );
        })}
      </div>
      <button type="button" className="mt-2 text-xs text-emerald-700" onClick={onReset}>
        Reset to default
      </button>
    </div>
  );
}

export function SubmissionColumnsButton({
  showPicker,
  onToggle,
}: {
  showPicker: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg border px-3 py-2 text-sm"
    >
      {showPicker ? "Hide columns" : "Columns"}
    </button>
  );
}
