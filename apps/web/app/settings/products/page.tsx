'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Product {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  default_milestone: string;
}

interface Component {
  id: number;
  name: string;
  product_id: number;
  description: string;
  is_active: boolean;
}

// ─── Inline editable row for a product ───────────────────────────────────────
function ProductRow({
  product,
  onUpdated,
  onDeactivated,
}: {
  product: Product;
  onUpdated: (p: Product) => void;
  onDeactivated: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [addingComp, setAddingComp] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  const loadComponents = useCallback(async () => {
    setLoadingComps(true);
    const res = await fetch(`${API_BASE}/api/v1/components?product_id=${product.id}&include_inactive=true`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setComponents(data);
    }
    setLoadingComps(false);
  }, [product.id]);

  useEffect(() => {
    if (expanded) loadComponents();
  }, [expanded, loadComponents]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`${API_BASE}/api/v1/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
      setEditing(false);
    } else {
      const err = await res.json();
      setError(err.message || 'Failed to save');
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate product "${product.name}"? It will be hidden from the bug form but existing bugs are preserved.`)) return;
    const res = await fetch(`${API_BASE}/api/v1/products/${product.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      onDeactivated(product.id);
    }
  };

  const handleReactivate = async () => {
    const res = await fetch(`${API_BASE}/api/v1/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    setAddingComp(true);
    setCompError(null);
    const res = await fetch(`${API_BASE}/api/v1/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newCompName.trim(), description: newCompDesc.trim(), product_id: product.id }),
    });
    setAddingComp(false);
    if (res.ok) {
      const newComp = await res.json();
      setComponents((prev) => [...prev, newComp]);
      setNewCompName('');
      setNewCompDesc('');
    } else {
      const err = await res.json();
      setCompError(err.message || 'Failed to add component');
    }
  };

  return (
    <div className={`border rounded-xl transition-all ${product.is_active ? 'border-outline-variant/30 bg-surface-container-lowest' : 'border-outline-variant/20 bg-surface-container/50 opacity-60'}`}>
      {/* Product Row */}
      <div className="flex items-center gap-3 p-4">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded"
          title={expanded ? 'Collapse components' : 'Show components'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {editing ? (
          <div className="flex-1 flex flex-col gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-primary rounded-lg px-3 py-1.5 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Product name"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-xs text-on-surface-variant focus:outline-none focus:border-primary"
              placeholder="Description (optional)"
            />
            {error && <p className="text-xs text-error font-semibold">{error}</p>}
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-on-surface truncate">{product.name}</span>
              {!product.is_active && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
                  Deactivated
                </span>
              )}
            </div>
            {product.description && (
              <p className="text-xs text-on-surface-variant truncate mt-0.5">{product.description}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg text-primary hover:bg-primary-container/30 transition disabled:opacity-50"
                title="Save"
              >
                <span className="material-symbols-outlined text-[18px]">{saving ? 'hourglass_empty' : 'check'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setName(product.name); setDescription(product.description); setError(null); }}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition"
                title="Cancel"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition"
                title="Edit product"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              {product.is_active ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition"
                  title="Deactivate product"
                >
                  <span className="material-symbols-outlined text-[18px]">hide_source</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivate}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition"
                  title="Reactivate product"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Components Sub-section */}
      {expanded && (
        <div className="border-t border-outline-variant/20 bg-surface-container/40 rounded-b-xl px-4 py-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label-caps flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">category</span>
            Components
          </p>

          {loadingComps ? (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-1">
              {components.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">No components yet. Add one below.</p>
              ) : (
                components.map((comp) => (
                  <ComponentRow
                    key={comp.id}
                    component={comp}
                    onUpdated={(updated) => setComponents((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
                    onDeactivated={(id) => setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: false } : c)))}
                    onReactivated={(id) => setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: true } : c)))}
                  />
                ))
              )}
            </div>
          )}

          {/* Add Component Form */}
          {product.is_active && (
            <form onSubmit={handleAddComponent} className="pt-2 flex flex-col gap-2">
              {compError && <p className="text-xs text-error font-semibold">{compError}</p>}
              <div className="flex gap-2">
                <input
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="New component name"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <input
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={addingComp || !newCompName.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-50 flex items-center gap-1 transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  {addingComp ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline editable row for a component ─────────────────────────────────────
function ComponentRow({
  component,
  onUpdated,
  onDeactivated,
  onReactivated,
}: {
  component: Component;
  onUpdated: (c: Component) => void;
  onDeactivated: (id: number) => void;
  onReactivated: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(component.name);
  const [description, setDescription] = useState(component.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`${API_BASE}/api/v1/components/${component.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
      setEditing(false);
    } else {
      const err = await res.json();
      setError(err.message || 'Failed to save');
    }
  };

  const handleToggle = async () => {
    const newActive = !component.is_active;
    if (!newActive && !confirm(`Deactivate component "${component.name}"?`)) return;
    const res = await fetch(`${API_BASE}/api/v1/components/${component.id}`, {
      method: newActive ? 'PATCH' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...(newActive ? { body: JSON.stringify({ is_active: true }) } : {}),
    });
    if (res.ok) {
      if (newActive) onReactivated(component.id);
      else onDeactivated(component.id);
    }
  };

  return (
    <div className={`flex items-center gap-3 pl-4 py-2 rounded-lg ${component.is_active ? 'hover:bg-surface-container/60' : 'opacity-50'} transition group`}>
      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">chevron_right</span>

      {editing ? (
        <div className="flex-1 flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-surface-container-lowest border border-primary rounded px-2 py-1 text-xs font-semibold text-on-surface focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1 text-xs text-on-surface-variant focus:outline-none focus:border-primary"
            placeholder="Description"
          />
          {error && <span className="text-xs text-error">{error}</span>}
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-on-surface">{component.name}</span>
          {!component.is_active && (
            <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-error-container text-on-error-container">off</span>
          )}
          {component.description && (
            <span className="ml-2 text-xs text-on-surface-variant">{component.description}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {editing ? (
          <>
            <button type="button" onClick={handleSave} disabled={saving} className="p-1 rounded text-primary hover:bg-primary-container/30 transition" title="Save">
              <span className="material-symbols-outlined text-[14px]">{saving ? 'hourglass_empty' : 'check'}</span>
            </button>
            <button type="button" onClick={() => { setEditing(false); setName(component.name); setDescription(component.description); setError(null); }} className="p-1 rounded text-on-surface-variant hover:bg-surface-container transition" title="Cancel">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition" title="Edit component">
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
            <button type="button" onClick={handleToggle} className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition" title={component.is_active ? 'Deactivate' : 'Reactivate'}>
              <span className="material-symbols-outlined text-[14px]">{component.is_active ? 'hide_source' : 'restart_alt'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function ProductSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/v1/products`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoadingProds(false); })
      .catch(() => setLoadingProds(false));
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch(`${API_BASE}/api/v1/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      const prod = await res.json();
      setProducts((prev) => [...prev, prod]);
      setNewName('');
      setNewDesc('');
    } else {
      const err = await res.json();
      setAddError(err.message || 'Failed to create product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!user.is_admin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant">lock</span>
          <h1 className="text-2xl font-bold text-on-surface">Admin Access Required</h1>
          <p className="text-on-surface-variant text-sm">Only administrators can manage products and components.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-primary hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md antialiased">
      {/* Top nav */}
      <header className="border-b border-outline-variant/20 bg-surface-container/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors p-1">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <MantisLogo size={28} />
          <div>
            <h1 className="font-bold text-on-surface text-base leading-tight">Workspace Governance &amp; Settings</h1>
            <p className="text-xs text-on-surface-variant">Products, components taxonomy, and team RBAC permissions</p>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-4xl mx-auto px-6 flex gap-6 border-t border-outline-variant/10 text-xs font-bold font-label-caps uppercase">
          <Link
            href="/settings/products"
            className="py-3 border-b-2 border-primary text-primary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            Products &amp; Components
          </Link>
          <Link
            href="/settings/team"
            className="py-3 border-b-2 border-transparent text-on-surface-variant hover:text-primary transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            Team &amp; Roles
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Add Product Form */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
          <h2 className="font-bold text-on-surface text-sm uppercase tracking-wider font-label-caps flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>
            Add New Product
          </h2>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
            {addError && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold">{addError}</div>
            )}
            <div className="flex gap-3">
              <input
                id="new-product-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Product name (e.g. Mobile App, Backend API)"
                maxLength={64}
                className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
              <button
                type="submit"
                id="add-product-btn"
                disabled={adding || !newName.trim()}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50 flex items-center gap-2 hover:opacity-90 transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {adding ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </section>

        {/* Products List */}
        <section className="space-y-3">
          <h2 className="font-bold text-on-surface text-sm uppercase tracking-wider font-label-caps flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inventory_2</span>
            All Products
            <span className="text-[11px] font-normal text-on-surface-variant normal-case tracking-normal">
              ({products.filter((p) => p.is_active).length} active, {products.filter((p) => !p.is_active).length} deactivated)
            </span>
          </h2>

          {loadingProds ? (
            <div className="flex items-center gap-3 py-8 text-on-surface-variant">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-outline-variant/40 rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">inventory_2</span>
              <p className="text-sm text-on-surface-variant mt-2">No products yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onUpdated={(updated) => setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
                  onDeactivated={(id) => setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)))}
                />
              ))}
            </div>
          )}
        </section>

        {/* Tip */}
        <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface-variant flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] mt-0.5 text-primary shrink-0">info</span>
          <span>
            <strong className="text-on-surface">Deactivating</strong> a product or component hides it from the bug filing form but preserves all existing bugs filed against it.
            Click the <strong className="text-on-surface">↺ restart</strong> icon to reactivate.
            Click the <strong className="text-on-surface">▸ expand arrow</strong> on a product row to manage its components.
          </span>
        </div>
      </main>
    </div>
  );
}
