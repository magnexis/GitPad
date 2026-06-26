import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function SourceControlPanel() {
  const {
    staging,
    selectedDiff,
    branches,
    syncStatus,
    requestConfirm,
    loadStaging,
    loadBranches,
    loadSyncStatus,
    stagePath,
    unstagePath,
    stageAll,
    unstageAll,
    discardPath,
    discardAll,
    loadDiff,
    commitStaged,
    mergeBranch
  } = useGitPadStore();
  const [message, setMessage] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  useEffect(() => {
    loadStaging();
    loadBranches();
    loadSyncStatus();
  }, [loadBranches, loadStaging, loadSyncStatus]);

  const staged = staging?.staged ?? [];
  const unstaged = staging?.unstaged ?? [];
  const conflicted = staging?.conflicted ?? [];
  const activeBranch = branches.find((branch) => branch.isActive)?.name ?? 'main';

  async function submit(event: FormEvent) {
    event.preventDefault();
    await commitStaged(message);
    setMessage('');
  }

  async function confirmDiscardPath(relativePath: string) {
    const confirmed = await requestConfirm({
      title: `Discard changes in ${relativePath}?`,
      description: 'This reverts unstaged edits for this file to the last committed state.',
      confirmLabel: 'Discard',
      destructive: true
    });
    if (!confirmed) return;
    await discardPath(relativePath);
  }

  async function confirmDiscardAll() {
    const confirmed = await requestConfirm({
      title: 'Discard all unstaged changes?',
      description: 'This reverts every unstaged file to the last committed state.',
      confirmLabel: 'Discard all',
      destructive: true
    });
    if (!confirmed) return;
    await discardAll();
  }

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(320px,420px)_minmax(0,1fr)] bg-[#0d1117] text-[#c9d1d9]">
      <div className="overflow-auto border-r border-[#30363d] p-4">
        <div className="mb-4 rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#8b949e]">Branch</div>
          <div className="mt-1 font-semibold">{activeBranch}</div>
          <div className="mt-2 text-xs text-[#8b949e]">
            Sync: {syncStatus?.status ?? 'unknown'}{syncStatus?.hasUpstream ? ` · ahead ${syncStatus.ahead} / behind ${syncStatus.behind}` : ''}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={mergeTarget}
              onChange={(event) => setMergeTarget(event.target.value)}
              title="Branch to merge into current branch"
              placeholder="branch to merge"
              className="h-9 flex-1 rounded-md border border-[#30363d] bg-[#0d1117] px-2 text-sm outline-none focus:border-[#58a6ff]"
            />
            <Button
              title="Merge branch"
              onClick={() => mergeTarget.trim() && mergeBranch(mergeTarget.trim()).then(() => setMergeTarget(''))}
            >
              Merge
            </Button>
          </div>
        </div>

        <form onSubmit={submit} className="mb-4 rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#8b949e]">Commit</div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            title="Commit message"
            placeholder="Commit message"
            className="mt-2 h-20 w-full resize-none rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-sm outline-none focus:border-[#58a6ff]"
          />
          <Button type="submit" title="Commit staged changes" className="mt-2 w-full bg-[#238636] text-[#f0f6fc] hover:bg-[#2ea043]" disabled={!staged.length || !message.trim()}>
            Commit Staged ({staged.length})
          </Button>
        </form>

        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Changes</h3>
          <div className="flex gap-1">
            <Button title="Stage all changes" className="px-2 py-1 text-xs" onClick={() => stageAll()}>
              Stage all
            </Button>
            <Button title="Discard all unstaged changes" className="px-2 py-1 text-xs" onClick={() => void confirmDiscardAll()}>
              Discard all
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {unstaged.map((change) => (
            <FileChangeRow
              key={`unstaged-${change.path}`}
              path={change.path}
              state={change.state}
              primaryLabel="Stage"
              onPrimary={() => stagePath(change.path)}
              secondaryLabel="Discard"
              onSecondary={() => confirmDiscardPath(change.path)}
              onSelect={() => loadDiff(change.path, 'unstaged')}
            />
          ))}
          {!unstaged.length ? <div className="rounded-md border border-dashed border-[#30363d] px-3 py-2 text-xs text-[#8b949e]">No unstaged changes.</div> : null}
        </div>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Staged Changes</h3>
          <Button title="Unstage all" className="px-2 py-1 text-xs" onClick={() => unstageAll()}>
            Unstage all
          </Button>
        </div>
        <div className="space-y-2">
          {staged.map((change) => (
            <FileChangeRow
              key={`staged-${change.path}`}
              path={change.path}
              state="staged"
              primaryLabel="Unstage"
              onPrimary={() => unstagePath(change.path)}
              onSelect={() => loadDiff(change.path, 'staged')}
            />
          ))}
          {!staged.length ? <div className="rounded-md border border-dashed border-[#30363d] px-3 py-2 text-xs text-[#8b949e]">No staged changes.</div> : null}
        </div>

        {conflicted.length ? (
          <div className="mt-6 rounded-md border border-[#da3633]/40 bg-[#da3633]/10 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#ffa198]">Conflicts</div>
            {conflicted.map((change) => (
              <button
                key={change.path}
                type="button"
                className="mt-2 block w-full rounded-md border border-[#da3633]/50 bg-[#161b22] px-2 py-1 text-left text-sm text-[#f0f6fc] hover:bg-[#21262d]"
                onClick={() => loadDiff(change.path, 'working-vs-head')}
              >
                {change.path}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 overflow-auto p-4">
        {selectedDiff ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22]">
            <div className="border-b border-[#30363d] px-3 py-2 text-sm">
              {selectedDiff.path} · {selectedDiff.mode}
            </div>
            <pre className="max-h-[80vh] overflow-auto p-3 text-xs leading-5 text-[#c9d1d9]">{selectedDiff.diff || 'No diff for this file in the selected mode.'}</pre>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-[#8b949e]">Select a file change to view diff.</div>
        )}
      </div>
    </section>
  );
}

function FileChangeRow({
  path,
  state,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onSelect
}: {
  path: string;
  state: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onSelect: () => void;
}) {
  const statusColor = state === 'untracked' ? 'text-[#58a6ff]' : state === 'conflicted' ? 'text-[#f85149]' : state === 'staged' ? 'text-[#3fb950]' : 'text-[#e3b341]';
  const statusLabel = state === 'untracked' ? 'U' : state === 'conflicted' ? 'C' : state === 'staged' ? 'S' : 'M';
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] px-2 py-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
        <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-[#c9d1d9] hover:text-[#58a6ff]" onClick={onSelect} title={`Open diff for ${path}`}>
          {path}
        </button>
        <Button title={primaryLabel} className="px-2 py-1 text-xs" onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary ? (
          <Button title={secondaryLabel} className="px-2 py-1 text-xs" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
