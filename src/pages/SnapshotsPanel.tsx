import { useEffect } from 'react';
import { Button } from '../components/Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function SnapshotsPanel() {
  const { snapshots, loadSnapshots, createSnapshot, restoreSnapshot, requestInput, requestConfirm } = useGitPadStore();
  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);
  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-6 text-[#c9d1d9]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#c9d1d9]">Snapshots</h2>
          <p className="text-sm text-[#8b949e]">Named Git checkpoints for restoring workspace state.</p>
        </div>
        <Button
          onClick={async () => {
            const name = await requestInput({
              title: 'Snapshot name',
              initialValue: 'Workspace checkpoint',
              confirmLabel: 'Create'
            });
            if (!name) return;
            await createSnapshot(name);
          }}
          title="Create snapshot"
          className="bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]"
        >
          Create snapshot
        </Button>
      </div>
      <div className="grid gap-3">
        {snapshots.map((snapshot) => (
          <div key={snapshot.tag} className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
            <div className="font-semibold text-[#c9d1d9]">{snapshot.name}</div>
            <div className="font-mono text-xs text-[#8b949e]">{snapshot.tag} {snapshot.hash.slice(0, 7)}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-[#8b949e]">{snapshot.date && new Date(snapshot.date).toLocaleString()}</span>
              <Button
                onClick={async () => {
                  const confirmed = await requestConfirm({
                    title: `Restore ${snapshot.name}?`,
                    description: 'This checks out the snapshot state and commits the restore.',
                    confirmLabel: 'Restore'
                  });
                  if (!confirmed) return;
                  await restoreSnapshot(snapshot.tag);
                }}
                title={`Restore ${snapshot.name}`}
              >
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
