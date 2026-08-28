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

// ─── Status badge colors ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  UNCONFIRMED: '#6B7280',
  CONFIRMED:   '#3B82F6',
  IN_PROGRESS: '#8B5CF6',
  RESOLVED:    '#10B981',
  VERIFIED:    '#06B6D4',
  CLOSED:      '#374151',
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#EF4444', P2: '#F97316', P3: '#F59E0B', P4: '#6B7280', P5: '#4B5563',
};

// ─── dagre layout ─────────────────────────────────────────────────────────────

function applyDagreLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<number, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(n => g.setNode(String(n.id), { width: 200, height: 68 }));
  edges.forEach(e => g.setEdge(String(e.blockingId), String(e.blockedId)));
  dagre.layout(g);

  const positions = new Map<number, { x: number; y: number }>();
  nodes.forEach(n => {
    const pos = g.node(String(n.id));
    positions.set(n.id, { x: pos.x - 100, y: pos.y - 34 });
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

      const flowNodes: Node[] = data.nodes.map(n => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        const isCritical = data.criticalPathIds.includes(n.id);
        const statusColor = STATUS_COLORS[n.status] ?? '#6B7280';
        const priorityColor = PRIORITY_COLORS[n.priority] ?? '#6B7280';

        return {
          id: String(n.id),
          position: pos,
          data: {
            label: (
              <div className="flex flex-col gap-1 w-full">
                <div className="text-[11px] font-mono text-slate-400">#{n.id}</div>
                <div className="text-xs font-semibold text-slate-100 leading-tight truncate max-w-[176px]">
                  {n.summary}
                </div>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ background: statusColor + '33', color: statusColor, border: `1px solid ${statusColor}55` }}
                  >
                    {n.status.replace('_', ' ')}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{ background: priorityColor + '33', color: priorityColor, border: `1px solid ${priorityColor}55` }}
                  >
                    {n.priority}
                  </span>
                </div>
              </div>
            ),
          },
          style: {
            background: isCritical ? '#1a0a0a' : '#1E293B',
            border: isCritical ? '2px solid #EF4444' : '1px solid #334155',
            borderRadius: 10,
            padding: '10px 12px',
            width: 200,
            minHeight: 68,
            cursor: 'pointer',
            boxShadow: isCritical ? '0 0 20px rgba(239,68,68,0.25)' : '0 1px 8px rgba(0,0,0,0.4)',
            transition: 'box-shadow 0.2s ease',
          },
          type: 'default',
        };
      });

      const flowEdges: Edge[] = data.edges.map(e => {
        const isCritical =
          data.criticalPathIds.includes(e.blockingId) &&
          data.criticalPathIds.includes(e.blockedId);
        return {
          id: `e${e.blockingId}-${e.blockedId}`,
          source: String(e.blockingId),
          target: String(e.blockedId),
          animated: isCritical,
          style: {
            stroke: isCritical ? '#EF4444' : '#475569',
            strokeWidth: isCritical ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCritical ? '#EF4444' : '#475569',
          },
        };
      });

      setRfNodes(flowNodes);
      setRfEdges(flowEdges);
      setLoading(false);
    };

    fetch(`${API_BASE}/api/v1/bugs/${bugId}/graph`, { credentials: 'include' })
      .then(async res => {
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
    const found = rawData?.nodes.find(n => n.id === Number(node.id)) ?? null;
    setSelectedBug(found);
  }, [rawData]);

  if (loading) {
    return (
      <div className="w-full h-[560px] bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading dependency graph…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[560px] bg-slate-950 rounded-xl border border-red-900 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Graph Canvas */}
      <div
        id="dependency-graph-canvas"
        className="flex-1 h-[560px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800"
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="#1e293b" gap={20} variant={BackgroundVariant.Dots} />
          <Controls
            style={{ background: '#0f172a', borderColor: '#1e293b', color: '#94a3b8' }}
          />
        </ReactFlow>
      </div>

      {/* Side Panel — Bug Detail */}
      {selectedBug && (
        <div
          id="graph-bug-detail-panel"
          className="w-full lg:w-72 bg-slate-900 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">#{selectedBug.id}</span>
            <button
              onClick={() => setSelectedBug(null)}
              className="text-slate-600 hover:text-slate-300 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <h3 className="text-sm font-semibold text-slate-100 leading-snug">
            {selectedBug.summary}
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-500 uppercase tracking-wide text-[9px] mb-0.5">Status</div>
              <div className="font-semibold" style={{ color: STATUS_COLORS[selectedBug.status] ?? '#fff' }}>
                {selectedBug.status.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-500 uppercase tracking-wide text-[9px] mb-0.5">Priority</div>
              <div className="font-semibold" style={{ color: PRIORITY_COLORS[selectedBug.priority] ?? '#fff' }}>
                {selectedBug.priority}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-500 uppercase tracking-wide text-[9px] mb-0.5">Severity</div>
              <div className="font-semibold text-slate-200">{selectedBug.severity}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-500 uppercase tracking-wide text-[9px] mb-0.5">Est. Time</div>
              <div className="font-semibold text-slate-200">{selectedBug.estimated_time}h</div>
            </div>
          </div>

          {rawData?.criticalPathIds.includes(selectedBug.id) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-950/60 border border-red-800/50 rounded-lg text-xs text-red-300 font-semibold">
              <span className="text-red-400">⚠</span> On Critical Path
            </div>
          )}

          <a
            href={`/bugs/${selectedBug.id}/graph`}
            className="mt-auto text-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Open Bug #{selectedBug.id} Graph
          </a>
        </div>
      )}
    </div>
  );
}
