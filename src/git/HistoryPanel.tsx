import { useEffect, useMemo, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from '../components/Button';

export function HistoryPanel() {
  const { commits, selectedCommit, loadHistory, selectCommit, restoreFile, revertCommit } = useGitPadStore();
  const [filter, setFilter] = useState<'all' | 'files' | 'folders' | 'edits' | 'creates' | 'deletes' | 'renames'>('all');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredCommits = useMemo(() => commits.filter((commit) => matchesFilter(commit.message, filter)), [commits, filter]);

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] bg-[#0d1117] text-[#c9d1d9]">
      <div className="overflow-auto border-r border-[#30363d] p-3">
        <div className="mb-3 flex flex-wrap gap-1">
          {(['all', 'files', 'folders', 'edits', 'creates', 'deletes', 'renames'] as const).map((item) => (
            <button
              key={item}
              type="button"
              title={`Filter ${item}`}
              data-tooltip={`Filter ${item}`}
              onClick={() => setFilter(item)}
              className={`rounded-md border px-2 py-1 text-xs ${filter === item ? 'border-[#58a6ff] bg-[#1f2937] text-[#c9d1d9]' : 'border-[#30363d] bg-[#161b22] text-[#8b949e]'}`}
            >
              {item}
            </button>
          ))}
        </div>
        {filteredCommits.map((commit) => (
          <button
            key={commit.hash}
            type="button"
            data-tooltip={`Open ${commit.message}`}
            title={`Open ${commit.message}`}
            onClick={() => selectCommit(commit.hash)}
            className="mb-2 block w-full rounded-md border border-[#30363d] bg-[#161b22] p-3 text-left hover:bg-[#21262d]"
          >
            <div className="text-sm font-semibold text-[#c9d1d9]">{commit.message}</div>
            <div className="mt-1 text-xs text-[#8b949e]">{commit.shortHash} by {commit.author}</div>
            <div className="text-xs text-[#8b949e]" title={new Date(commit.date).toISOString()}>
              {formatRelativeTime(commit.date)} · {new Date(commit.date).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
      <div className="min-w-0 overflow-auto bg-[#0d1117] p-4">
        {selectedCommit ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#c9d1d9]">{selectedCommit.commit.message}</h2>
                <p className="text-sm text-[#8b949e]">{selectedCommit.commit.hash}</p>
                <p className="text-xs text-[#8b949e]" title={new Date(selectedCommit.commit.date).toISOString()}>
                  {formatRelativeTime(selectedCommit.commit.date)} · {new Date(selectedCommit.commit.date).toLocaleString()}
                </p>
              </div>
              <Button onClick={() => revertCommit(selectedCommit.commit.hash)} title="Revert commit">
                Revert commit
              </Button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedCommit.files.map((file) => (
                <Button key={`${file.status}:${file.path}`} onClick={() => restoreFile(selectedCommit.commit.hash, file.path)} title={`Restore ${file.path}`}>
                  {file.status} {file.path}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <DiffColumn title="Removed" diff={selectedCommit.diff} mode="removed" />
              <DiffColumn title="Added" diff={selectedCommit.diff} mode="added" />
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-[#8b949e]">Select a commit to inspect changes.</div>
        )}
      </div>
    </section>
  );
}

function DiffColumn({ title, diff, mode }: { title: string; diff: string; mode: 'added' | 'removed' }) {
  const prefix = mode === 'added' ? '+' : '-';
  const color = mode === 'added' ? 'text-[#7ee787] bg-[#238636]/10' : 'text-[#ffa198] bg-[#da3633]/10';
  const lines = diff.split(/\r?\n/).filter((line) => line.startsWith(prefix) && !line.startsWith(`${prefix}${prefix}${prefix}`));
  return (
    <div className="min-w-0 rounded-md border border-[#30363d] bg-[#161b22]">
      <div className="border-b border-[#30363d] px-3 py-2 text-sm font-semibold text-[#c9d1d9]">{title}</div>
      <pre className="max-h-[620px] overflow-auto p-3 text-xs leading-5">
        {lines.map((line, index) => (
          <div key={`${mode}-${index}`} className={color}>{line}</div>
        ))}
      </pre>
    </div>
  );
}

function matchesFilter(message: string, filter: 'all' | 'files' | 'folders' | 'edits' | 'creates' | 'deletes' | 'renames') {
  const lower = message.toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'files') return lower.includes('file');
  if (filter === 'folders') return lower.includes('folder');
  if (filter === 'edits') return lower.includes('updated') || lower.includes('edited');
  if (filter === 'creates') return lower.includes('created');
  if (filter === 'deletes') return lower.includes('deleted');
  if (filter === 'renames') return lower.includes('renamed');
  return true;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
