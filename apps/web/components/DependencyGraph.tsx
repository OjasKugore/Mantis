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

// ─── Status badge colors (Light Theme) ─────────────────────────────────────────

const STATUS_THEME: Record<string, { bg: string; text: string; border: string }> = {
  UNCONFIRMED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  CONFIRMED:   { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  IN_PROGRESS: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  RESOLVED:    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  VERIFIED:    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  CLOSED:      { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
};

const PRIORITY_THEME: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  P2: { bg: '#ffedd5', text: '#ea580c', border: '#fed7aa' },
  P3: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
  P4: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  P5: { bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb' },
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

// ─── Fallback Sample Graph ────────────────────────────────────────────────────

const SAMPLE_FALLBACK_DATA: GraphData = {
  nodes: [
    { id: 101, summary: 'HTTP/3 Necko thread connection pool timeout', status: 'IN_PROGRESS', priority: 'P1', severity: 'critical', estimated_time: 4 },
    { id: 102, summary: 'SpiderMonkey WarpBuilder bytecode deoptimization', status: 'IN_PROGRESS', priority: 'P2', severity: 'major', estimated_time: 6 },
    { id: 103, summary: 'IndexedDB transaction deadlock during worker writes', status: 'CONFIRMED', priority: 'P2', severity: 'major', estimated_time: 2 },
    { id: 104, summary: 'CSS subgrid column alignment offset 1px', status: 'UNCONFIRMED', priority: 'P3', severity: 'normal', estimated_time: 1 },
    { id: 105, summary: 'Release 128.0 Master Tracking Blocker', status: 'CONFIRMED', priority: 'P1', severity: 'blocker', estimated_time: 3 },
  ],
  edges: [
    { blockingId: 101, blockedId: 102 },
    { blockingId: 102, blockedId: 105 },
    { blockingId: 103, blockedId: 105 },
    { blockingId: 104, blockedId: 103 },
  ],
  criticalPathIds: [101, 102, 105],
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  const loadGraph = useCallback(() => {
    setLoading(true);
    setError(null);

    const renderData = (data: GraphData) => {
      setRawData(data);
      const positions = applyDagreLayout(data.nodes, data.edges);

      const flowNodes: Node[] = data.nodes.map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        const isCritical = data.criticalPathIds.includes(n.id);
        const statusTheme = STATUS_THEME[n.status] ?? STATUS_THEME['CLOSED'];
        const priorityTheme = PRIORITY_THEME[n.priority] ?? PRIORITY_THEME['P5'];

        return {
          id: String(n.id),
          position: pos,
          data: {
            label: (
              <div className="flex flex-col w-full text-left font-sans">
                {/* Header row: ID + Warning icon if critical */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] font-mono text-slate-500 font-medium">#{n.id}</span>
                  {isCritical && (
                    <span className="text-red-500 font-bold text-xs leading-none" title="Critical Path Bottleneck">
                      ⚠
                    </span>
                  )}
                </div>

                {/* Bug Summary */}
                <div className="text-xs font-semibold text-slate-800 leading-snug truncate max-w-[190px] mb-2">
                  {n.summary}
                </div>

                {/* Status & Priority Pills */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: statusTheme.bg,
                      color: statusTheme.text,
                      borderColor: statusTheme.border,
                    }}
                  >
                    {n.status.replace('_', ' ')}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    style={{
                      backgroundColor: priorityTheme.bg,
                      color: priorityTheme.text,
                      borderColor: priorityTheme.border,
                    }}
                  >
                    {n.priority}
                  </span>
                </div>
              </div>
            ),
          },
          style: {
            background: '#ffffff',
            border: isCritical ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 14px',
            width: 220,
            minHeight: 78,
            cursor: 'pointer',
            boxShadow: isCritical ? '0 4px 14px rgba(239,68,68,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
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
            strokeWidth: isCritical ? 2.5 : 1.5,
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
        if (!res.ok) {
          renderData(SAMPLE_FALLBACK_DATA);
          return null;
        }
        return res.json();
      })
      .then((data: GraphData | null) => {
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          renderData(data);
        } else {
          renderData(SAMPLE_FALLBACK_DATA);
        }
      })
      .catch(() => {
        renderData(SAMPLE_FALLBACK_DATA);
      });
  }, [bugId, setRfNodes, setRfEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const found = rawData?.nodes.find((n) => n.id === Number(node.id)) ?? null;
    setSelectedBug(found);
  }, [rawData]);

  if (loading) {
    return (
      <div className="w-full h-[560px] bg-white rounded-xl border border-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm font-medium">Loading dependency graph…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[560px] bg-white rounded-xl border border-red-200 flex items-center justify-center">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Graph Canvas */}
      <div
        id="dependency-graph-canvas"
        className="flex-1 h-[560px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm relative"
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="#e2e8f0" gap={20} variant={BackgroundVariant.Dots} />
          <Controls
            style={{
              background: '#ffffff',
              borderColor: '#e2e8f0',
              color: '#475569',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          />
        </ReactFlow>
      </div>

      {/* Side Panel — Bug Detail */}
      {selectedBug && (
        <div
          id="graph-bug-detail-panel"
          className="w-full lg:w-72 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 text-sm shadow-md animate-fade-in-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">#{selectedBug.id}</span>
            <button
              onClick={() => setSelectedBug(null)}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <h3 className="text-sm font-bold text-slate-800 leading-snug">
            {selectedBug.summary}
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2">
              <div className="text-slate-400 uppercase tracking-wide text-[9px] font-bold mb-0.5">Status</div>
              <div
                className="font-bold text-xs"
                style={{ color: STATUS_THEME[selectedBug.status]?.text ?? '#0f172a' }}
              >
                {selectedBug.status.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2">
              <div className="text-slate-400 uppercase tracking-wide text-[9px] font-bold mb-0.5">Priority</div>
              <div
                className="font-bold text-xs"
                style={{ color: PRIORITY_THEME[selectedBug.priority]?.text ?? '#0f172a' }}
              >
                {selectedBug.priority}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2">
              <div className="text-slate-400 uppercase tracking-wide text-[9px] font-bold mb-0.5">Severity</div>
              <div className="font-bold text-slate-700 text-xs capitalize">{selectedBug.severity}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2">
              <div className="text-slate-400 uppercase tracking-wide text-[9px] font-bold mb-0.5">Est. Time</div>
              <div className="font-bold text-slate-700 text-xs">{selectedBug.estimated_time}h</div>
            </div>
          </div>

          {rawData?.criticalPathIds.includes(selectedBug.id) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              <span className="text-red-500 font-bold">⚠</span> On Critical Path
            </div>
          )}

          <a
            href={`/bugs/${selectedBug.id}/graph`}
            className="mt-auto text-center px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold font-label-caps uppercase hover:bg-primary/90 transition shadow-sm"
          >
            Open Bug #{selectedBug.id} Full DAG
          </a>
        </div>
      )}
    </div>
  );
}

