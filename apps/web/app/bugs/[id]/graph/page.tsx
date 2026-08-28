import { DependencyGraph } from '@/components/DependencyGraph';

interface Props {
  params: { id: string };
}

export const metadata = {
  title: 'Dependency Graph | BugzillaRevamp',
  description: 'Interactive Critical Path DAG for bug dependency visualization',
};

export default function BugGraphPage({ params }: Props) {
  const bugId = Number(params.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <a href="/bugs" className="hover:text-slate-300 transition">Bugs</a>
              <span>/</span>
              <a href={`/bugs/${bugId}`} className="hover:text-slate-300 transition">#{bugId}</a>
              <span>/</span>
              <span className="text-slate-400">Dependency Graph</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Critical Path DAG — Bug #{bugId}
            </h1>
          </div>
          <a
            href={`/bugs/${bugId}`}
            className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition"
          >
            ← Back to Bug
          </a>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-slate-500" />
            <span>Dependency Edge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-950/40" />
            <span>Critical Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 bg-slate-800" />
            <span>Normal Node</span>
          </div>
        </div>

        {/* Graph */}
        <DependencyGraph bugId={bugId} />
      </div>
    </div>
  );
}
