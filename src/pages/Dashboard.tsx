import { useEffect } from 'react';
import { Button } from '../components/Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function Dashboard() {
  const { analytics, graph, loadAnalytics, loadGraph, openFile, setActiveView } = useGitPadStore();
  useEffect(() => {
    loadAnalytics();
    loadGraph();
  }, [loadAnalytics, loadGraph]);

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-6 text-[#c9d1d9]">
      <div className="mb-6 flex items-center justify-between border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#c9d1d9]">Notes</h1>
          <p className="text-sm text-[#8b949e]">Repository activity, tags, and recent knowledge work.</p>
        </div>
        <Button onClick={() => setActiveView('graph')} title="Open graph" className="px-3 py-2 text-sm text-[#c9d1d9]">
          Open graph
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Notes" value={analytics?.noteCount ?? 0} />
        <Metric label="Files" value={analytics?.fileCount ?? 0} />
        <Metric label="Tags" value={analytics?.tagCount ?? 0} />
        <Metric label="Commits" value={analytics?.recentActivity.length ?? 0} />
      </div>
      <div className="mt-6 grid grid-cols-[1fr_340px] gap-4">
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#8b949e]">Recent Activity</h2>
          {analytics?.recentActivity.map((commit) => (
            <div key={commit.hash} className="border-b border-[#30363d] py-3 last:border-0">
              <div className="font-medium text-[#c9d1d9]">{commit.message}</div>
              <div className="text-xs text-[#8b949e]">{commit.shortHash} {new Date(commit.date).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <aside className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#8b949e]">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(graph?.tags ?? {}).map(([tag, files]) => (
              <button key={tag} data-tooltip={`Open #${tag}`} title={`Open #${tag}`} onClick={() => files[0] && openFile(files[0])} className="rounded-md border border-[#30363d] bg-[#21262d] px-2 py-1 text-sm text-[#58a6ff] hover:bg-[#30363d]">
                #{tag} <span className="text-[#8b949e]">{files.length}</span>
              </button>
            ))}
          </div>
          <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#8b949e]">Most Edited</h2>
          {analytics?.mostEditedFiles.map((file) => (
            <button key={file.path} data-tooltip={`Open ${file.path}`} title={`Open ${file.path}`} onClick={() => openFile(file.path)} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]">
              {file.path} <span className="text-[#8b949e]">{file.edits}</span>
            </button>
          ))}
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b949e]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#c9d1d9]">{value}</div>
    </div>
  );
}
