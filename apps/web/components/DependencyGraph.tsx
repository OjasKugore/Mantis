'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Plus, Trash2, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, Link as LinkIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  id: number;
  summary: string;
  status: string;
  priority: string;
  severity: string;
  estimated_time: number;
}

interface GraphEdge {
  blockingId: number;
  blockedId: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  criticalPathIds: number[];
}

// ─── Status badge colors (Lavender Light Theme) ───────────────────────────────

const STATUS_THEME: Record<string, { bg: string; text: string; border: string }> = {
  UNCONFIRMED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  CONFIRMED:   { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  IN_PROGRESS: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  RESOLVED:    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  VERIFIED:    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  CLOSED:      { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
};

const PRIORITY_THEME: Record<string, { text: string; bg: string; border: string }> = {
  P1: { text: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  P2: { text: '#ea580c', bg: '#ffedd5', border: '#fed7aa' },
  P3: { text: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  P4: { text: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  P5: { text: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb' },
};

// ─── dagre layout ─────────────────────────────────────────────────────────────

function applyDagreLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<number, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(String(n.id), { width: 220, height: 80 }));
  edges.forEach((e) => g.setEdge(String(e.blockingId), String(e.blockedId)));
  dagre.layout(g);

  const positions = new Map<number, { x: number; y: number }>();
  nodes.forEach((n) => {
    const pos = g.node(String(n.id));
    positions.set(n.id, { x: pos.x - 110, y: pos.y - 40 });
  });
  return positions;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  bugId: number;
}

export function DependencyGraph({ bugId }: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedBug, setSelectedBug] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<GraphData | null>(null);

  // Mutation states
  const [targetBugId, setTargetBugId] = useState('');
  const [linkDirection, setLinkDirection] = useState<'blocks' | 'depends_on'>('blocks');
  const [mutating, setMutating] = useState(false);
  const [mutationMessage, setMutationMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadGraph = useCallback(() => {
    setLoading(true);
    setError(null);

    const renderData = (data: GraphData) => {
      setRawData(data);
      const positions = applyDagreLayout(data.nodes, data.edges);

      const flowNodes: Node[] = data.nodes.map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        const isCritical = data.criticalPathIds.includes(n.id);
        const isRoot = n.id === bugId;
        const statusTheme = STATUS_THEME[n.status] ?? STATUS_THEME['UNCONFIRMED'];
        const priorityTheme = PRIORITY_THEME[n.priority] ?? PRIORITY_THEME['P3'];

        return {
          id: String(n.id),
          position: pos,
          data: {
            label: (
              <div className="flex flex-col gap-1.5 w-full select-none text-left">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono font-bold ${isRoot ? 'text-primary' : 'text-slate-500'}`}>
                    #{n.id} {isRoot && '★ (Active)'}
                  </span>
                  {isCritical && (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-300 animate-pulse">
                      Critical Path
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-800 leading-snug truncate max-w-[190px]">
                  {n.summary}
                </div>

                <div className="flex gap-1.5 mt-0.5 items-center flex-wrap">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{
                      background: statusTheme.bg,
                      color: statusTheme.text,
                      border: `1px solid ${statusTheme.border}`,
                    }}
                  >
                    {n.status.replace('_', ' ')}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: priorityTheme.bg,
                      color: priorityTheme.text,
                      border: `1px solid ${priorityTheme.border}`,
                    }}
                  >
                    {n.priority}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    {n.estimated_time || 0}h
                  </span>
                </div>
              </div>
            ),
          },
          style: {
            background: isCritical ? '#fff1f2' : isRoot ? '#f0fdf4' : '#ffffff',
            border: isCritical ? '2px solid #ef4444' : isRoot ? '2px solid #486730' : '1px solid #e5dde1',
            borderRadius: 12,
            padding: '12px 14px',
            width: 220,
            minHeight: 80,
            cursor: 'pointer',
            boxShadow: isCritical
              ? '0 0 16px rgba(239, 68, 68, 0.25)'
              : isRoot
              ? '0 0 14px rgba(72, 103, 48, 0.2)'
              : '0 2px 8px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
          },
          type: 'default',
        };
      });

      const flowEdges: Edge[] = data.edges.map((e) => {
        const isCritical =
          data.criticalPathIds.includes(e.blockingId) &&
          data.criticalPathIds.includes(e.blockedId);
        return {
          id: `e${e.blockingId}-${e.blockedId}`,
          source: String(e.blockingId),
          target: String(e.blockedId),
          animated: isCritical,
          style: {
            stroke: isCritical ? '#ef4444' : '#94a3b8',
            strokeWidth: isCritical ? 3 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCritical ? '#ef4444' : '#94a3b8',
          },
        };
      });

      setRfNodes(flowNodes);
      setRfEdges(flowEdges);
      setLoading(false);
    };

    fetch(`${API_BASE}/api/v1/bugs/${bugId}/graph`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch dependency graph');
        return res.json();
      })
      .then((data: GraphData) => {
        renderData(data);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [bugId, setRfNodes, setRfEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const found = rawData?.nodes.find((n) => n.id === Number(node.id)) ?? null;
    setSelectedBug(found);
  }, [rawData]);

  // ── Add Blocker Dependency ───────────────────────────────────────────────────
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    const otherId = Number(targetBugId);
    if (isNaN(otherId) || otherId <= 0 || otherId === bugId) {
      setMutationMessage({ text: 'Please enter a valid numeric Bug ID different from current bug.', type: 'error' });
      return;
    }

    setMutating(true);
    setMutationMessage(null);

    const blockingId = linkDirection === 'blocks' ? bugId : otherId;
    const blockedId = linkDirection === 'blocks' ? otherId : bugId;

    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${blockingId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ blocked_bug_id: blockedId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add dependency');
      }

      setMutationMessage({ text: `Successfully linked: Bug #${blockingId} blocks Bug #${blockedId}`, type: 'success' });
      setTargetBugId('');
      loadGraph();
    } catch (err: any) {
      setMutationMessage({ text: err.message || 'Cycle detected or invalid relationship.', type: 'error' });
    } finally {
      setMutating(false);
    }
  };

  // ── Remove Blocker Dependency ────────────────────────────────────────────────
  const handleRemoveDependency = async (otherBugId: number) => {
    if (!confirm(`Are you sure you want to remove dependency link with Bug #${otherBugId}?`)) return;

    setMutating(true);
    setMutationMessage(null);

    try {
      await Promise.all([
        fetch(`${API_BASE}/api/v1/bugs/${bugId}/dependencies/${otherBugId}`, {
          method: 'DELETE',
          credentials: 'include',
        }),
        fetch(`${API_BASE}/api/v1/bugs/${otherBugId}/dependencies/${bugId}`, {
          method: 'DELETE',
          credentials: 'include',
        }),
      ]);

      setMutationMessage({ text: `Dependency between #${bugId} and #${otherBugId} removed.`, type: 'success' });
      setSelectedBug(null);
      loadGraph();
    } catch (err: any) {
      setMutationMessage({ text: err.message || 'Failed to unlink dependency', type: 'error' });
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar: Add Blocker Dependency */}
      <div className="p-4 rounded-xl border border-[#e5dde1] bg-[#fbf1f5] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-on-surface">
        <form onSubmit={handleAddDependency} className="flex flex-wrap items-center gap-2 text-xs flex-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <LinkIcon className="w-3.5 h-3.5 text-primary" />
            <span>Link Blocker:</span>
          </div>

          <span className="px-2 py-1 bg-white rounded border border-[#e5dde1] text-primary font-mono font-bold">
            Bug #{bugId}
          </span>

          <select
            value={linkDirection}
            onChange={(e: any) => setLinkDirection(e.target.value)}
            className="bg-white border border-[#c4c8ba] rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value="blocks">Blocks (→)</option>
            <option value="depends_on">Depends On (←)</option>
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">Bug #</span>
            <input
              type="number"
              value={targetBugId}
              onChange={(e) => setTargetBugId(e.target.value)}
              placeholder="e.g. 2, 6, 11"
              className="w-24 bg-white border border-[#c4c8ba] rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-mono focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={mutating || !targetBugId}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-opacity-90 text-on-primary font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mutating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            <span>Add Dependency</span>
          </button>
        </form>

        <button
          onClick={loadGraph}
          className="p-2 text-slate-600 hover:text-slate-900 transition text-xs border border-[#e5dde1] rounded-lg bg-white flex items-center gap-1.5 self-start sm:self-center shadow-sm"
          title="Refresh DAG"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh DAG</span>
        </button>
      </div>

      {/* Mutation Flash Alert */}
      {mutationMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            mutationMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {mutationMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{mutationMessage.text}</span>
          </div>
          <button onClick={() => setMutationMessage(null)} className="text-slate-500 hover:text-slate-800 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Graph Area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas */}
        <div
          id="dependency-graph-canvas"
          className="flex-1 h-[600px] bg-[#fff7fa] rounded-2xl overflow-hidden border border-[#e5dde1] shadow-md relative"
        >
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-600 text-xs font-medium">Calculating Critical Path DAG…</span>
            </div>
          ) : error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-red-600">
              <AlertTriangle className="w-8 h-8 mb-2 text-red-500" />
              <p className="font-bold">{error}</p>
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background color="#e5dde1" gap={20} variant={BackgroundVariant.Dots} />
              <Controls
                style={{
                  background: '#ffffff',
                  borderColor: '#e5dde1',
                  color: '#43483d',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              />
            </ReactFlow>
          )}
        </div>

        {/* Side Panel — Selected Bug Inspector */}
        {selectedBug && (
          <div
            id="graph-bug-detail-panel"
            className="w-full lg:w-80 bg-white border border-[#e5dde1] rounded-2xl p-5 flex flex-col gap-4 text-xs shadow-lg animate-fade-in-up"
          >
            <div className="flex items-center justify-between border-b border-[#e5dde1] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary font-bold text-sm">#{selectedBug.id}</span>
                {selectedBug.id === bugId && (
                  <span className="px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container text-[9px] font-bold">
                    Active Bug
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedBug(null)}
                className="text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <h3 className="font-bold text-slate-800 leading-snug text-sm">
              {selectedBug.summary}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#fbf1f5] border border-[#e5dde1] rounded-lg p-2.5 space-y-0.5">
                <div className="text-slate-500 uppercase text-[9px] font-bold">Status</div>
                <div className="font-bold text-slate-800">{selectedBug.status.replace('_', ' ')}</div>
              </div>
              <div className="bg-[#fbf1f5] border border-[#e5dde1] rounded-lg p-2.5 space-y-0.5">
                <div className="text-slate-500 uppercase text-[9px] font-bold">Priority</div>
                <div className="font-bold text-amber-700">{selectedBug.priority}</div>
              </div>
              <div className="bg-[#fbf1f5] border border-[#e5dde1] rounded-lg p-2.5 space-y-0.5">
                <div className="text-slate-500 uppercase text-[9px] font-bold">Severity</div>
                <div className="font-bold text-slate-800 capitalize">{selectedBug.severity}</div>
              </div>
              <div className="bg-[#fbf1f5] border border-[#e5dde1] rounded-lg p-2.5 space-y-0.5">
                <div className="text-slate-500 uppercase text-[9px] font-bold">Estimated</div>
                <div className="font-bold text-primary">{selectedBug.estimated_time}h</div>
              </div>
            </div>

            {rawData?.criticalPathIds.includes(selectedBug.id) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Bottleneck node on Critical Path.</span>
              </div>
            )}

            <div className="space-y-2 pt-2 mt-auto border-t border-[#e5dde1]">
              {selectedBug.id !== bugId && (
                <button
                  onClick={() => handleRemoveDependency(selectedBug.id)}
                  disabled={mutating}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unlink Dependency Link</span>
                </button>
              )}

              <a
                href={`/bugs/${selectedBug.id}`}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-opacity-90 text-on-primary text-xs font-semibold transition shadow-sm"
              >
                <span>View Full Bug Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
