import { FormEvent, useState } from 'react';
import { AnimatedBackdrop } from './AnimatedBackdrop';
import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from './Button';

export function WorkspaceGate() {
  const heroLogo = 'GITPAD.png';
  const { createWorkspace, openWorkspace, renameWorkspace, deleteWorkspace, requestInput, requestConfirm, workspaces } = useGitPadStore();
  const [name, setName] = useState('My GitPad Workspace');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await createWorkspace(name);
  }

  return (
    <main className="app-shell relative grid min-h-screen place-items-center bg-[#0d1117] px-6 text-[#c9d1d9]">
      <AnimatedBackdrop />
      <section className="w-full max-w-3xl text-center">
        <img src={heroLogo} alt="GitPad" className="mb-6 h-auto w-full max-w-[560px] object-contain" />
        <h1 className="text-5xl font-bold tracking-tight text-[#c9d1d9]">A Git repository for every thought, note, and working file.</h1>
        <p className="mt-5 mx-auto max-w-2xl text-lg text-[#8b949e]">
          Create a workspace and GitPad initializes the repo, saves files locally, commits changes, searches content, and gives you a terminal where the work already lives.
        </p>
        <form onSubmit={submit} className="mx-auto mt-8 flex max-w-3xl gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            title="Workspace name"
            className="h-11 flex-1 rounded-md border border-[#30363d] bg-[#0d1117] pl-5 pr-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
          />
          <Button type="submit" title="Create workspace" className="bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]">Create workspace</Button>
          <Button type="button" title="Open existing folder" onClick={() => openWorkspace()}>Open folder</Button>
        </form>
        {workspaces.length > 0 && (
          <div className="mx-auto mt-8 grid max-w-3xl gap-2 text-center">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                data-tooltip={`Open ${workspace.name}`}
                title={`Open ${workspace.name}`}
                onClick={() => openWorkspace(workspace.path)}
                className="rounded-md border border-[#30363d] bg-[#161b22] p-3 text-left transition hover:bg-[#21262d]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#c9d1d9]">{workspace.name}</div>
                    <div className="truncate text-sm text-[#8b949e]">{workspace.path}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      title={`Rename ${workspace.name}`}
                      onClick={async (event) => {
                        event.stopPropagation();
                        await openWorkspace(workspace.path);
                        const next = await requestInput({ title: 'Rename workspace', initialValue: workspace.name, confirmLabel: 'Rename' });
                        if (next && next !== workspace.name) await renameWorkspace(next);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      title={`Delete ${workspace.name}`}
                      className="bg-[#da3633] text-[#f0f6fc] hover:bg-[#f85149]"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await openWorkspace(workspace.path);
                        const confirmed = await requestConfirm({
                          title: `Delete workspace "${workspace.name}"?`,
                          description: 'This permanently deletes the workspace folder.',
                          confirmLabel: 'Delete',
                          destructive: true
                        });
                        if (confirmed) await deleteWorkspace(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
