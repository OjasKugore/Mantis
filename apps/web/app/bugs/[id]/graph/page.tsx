import { DependencyGraph } from '@/components/DependencyGraph';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export const metadata = {
  title: 'Dependency Graph | Mantis',
  description: 'Interactive Critical Path DAG for bug dependency visualization',
};

export default function BugGraphPage({ params }: Props) {
  const bugId = Number(params.id);

  return (
    <div className="min-h-screen bg-surface text-on-surface p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1 font-body-sm">
              <Link href="/dashboard" className="hover:text-primary transition">Dashboard</Link>
              <span>/</span>
              <Link href={`/bugs/${bugId}`} className="hover:text-primary transition">#{bugId}</Link>
              <span>/</span>
              <span className="text-on-surface font-medium">Dependency Graph</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface font-headline-sm">
              Critical Path DAG — Bug #{bugId}
            </h1>
          </div>
          <Link
            href={`/bugs/${bugId}`}
            className="px-4 py-2 text-sm font-semibold bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 text-on-surface rounded-lg transition shadow-sm"
          >
            ← Back to Bug
          </Link>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-on-surface-variant px-1 font-body-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-red-500" />
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-slate-400" />
            <span>Dependency Edge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500 bg-white" />
            <span>Critical Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
            <span>Normal Node</span>
          </div>
        </div>

        {/* Graph */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 shadow-sm">
          <DependencyGraph bugId={bugId} />
        </div>
      </div>
    </div>
  );
}

