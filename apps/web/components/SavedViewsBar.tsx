'use client';

import React, { useState, useEffect } from 'react';

export interface SavedView {
  id: number;
  name: string;
  query_json: {
    status?: string;
    priority?: string;
    severity?: string;
    embargo?: 'all' | 'embargoed' | 'public';
  };
  is_preset?: boolean;
}

interface SavedViewsBarProps {
  currentFilters: {
    status: string;
    priority: string;
    severity: string;
    embargo: 'all' | 'embargoed' | 'public';
  };
  onApplyView: (filters: {
    status: string;
    priority: string;
    severity: string;
    embargo: 'all' | 'embargoed' | 'public';
  }, viewName?: string) => void;
  activeViewName?: string | null;
}

export function SavedViewsBar({ currentFilters, onApplyView, activeViewName }: SavedViewsBarProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [newViewName, setNewViewName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchViews = async () => {
    try {
      const res = await fetch('/api/v1/saved-views');
      if (res.ok) {
        const data = await res.json();
        setViews(data.views || []);
      }
    } catch {
      // Ignore fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViews();
  }, []);

  const handleSaveCurrentView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/v1/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newViewName.trim(),
          query_json: currentFilters,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setViews((prev) => [...prev, data.view]);
        onApplyView(currentFilters, data.view.name);
        setNewViewName('');
        setSaveModalOpen(false);
      }
    } catch (err: any) {
      alert(`Failed to save view: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteView = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/saved-views/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setViews((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading && views.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-3 bg-surface-container-lowest/60 border border-outline-variant/30 rounded-xl text-xs backdrop-blur-sm">
      <span className="text-on-surface-variant/70 font-semibold flex items-center gap-1 shrink-0 uppercase tracking-wider text-[10px]">
        <span className="material-symbols-outlined text-[14px] text-primary">bookmark</span>
        Saved Views:
      </span>

      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
        {views.map((v) => {
          const isActive = activeViewName === v.name;
          return (
            <button
              key={v.id}
              onClick={() => onApplyView(v.query_json as any, v.name)}
              className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all text-xs shrink-0 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface border border-outline-variant/20'
              }`}
            >
              <span>{v.name}</span>
              {!v.is_preset && (
                <span
                  onClick={(e) => handleDeleteView(e, v.id)}
                  className="opacity-60 hover:opacity-100 hover:text-error ml-0.5"
                  title="Delete saved view"
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setSaveModalOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high/80 text-on-surface hover:bg-primary/20 hover:text-primary transition-all font-medium text-xs shrink-0 border border-outline-variant/30"
        title="Save current filter combination"
      >
        <span className="material-symbols-outlined text-[14px]">save</span>
        <span>Save View</span>
      </button>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-high border border-outline-variant/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">bookmark_add</span>
              Save Current Filter Preset
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Save your current status, priority, severity, and embargo filters for quick access across sessions.
            </p>

            <form onSubmit={handleSaveCurrentView} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Preset View Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. My Active P1 Blockers"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newViewName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save View'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
