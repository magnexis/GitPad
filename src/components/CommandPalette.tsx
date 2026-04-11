import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';

interface PaletteCommand {
  id: string;
  category: string;
  label: string;
  description: string;
  shortcut?: string;
  enabled?: boolean;
  run: () => Promise<void>;
}

const recentCommandKey = 'gitpad:recent-commands';

export function CommandPalette({ open, onClose, onQuickOpen }: { open: boolean; onClose: () => void; onQuickOpen: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const {
    activePath,
    explorerSelectedPath,
    workspace,
    workspaces,
    settings,
    staging,
    branches,
    createFile,
    createDirectory,
    renamePath,
    duplicatePath,
    deletePath,
    openFile,
    openWorkspace,
    renameWorkspace,
    deleteWorkspace,
    saveActive,
    saveAllTabs,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    reopenClosedTab,
    runSearch,
    setActiveView,
    setExplorerSelectedPath,
    toggleSidebar,
    updateSettings,
    requestInput,
    requestConfirm,
    commitStaged
  } = useGitPadStore();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(recentCommandKey);
      if (!raw) return;
      setRecent(JSON.parse(raw) as string[]);
    } catch {
      setRecent([]);
    }
  }, []);

  const commands = useMemo<PaletteCommand[]>(() => {
    const selectedPath = explorerSelectedPath ?? activePath;
    const selectedLabel = selectedPath ? selectedPath.split('/').at(-1) ?? selectedPath : 'selected item';
    const workspaceCommands: PaletteCommand[] = workspaces.map((item) => ({
      id: `workspace:switch:${item.path}`,
      category: 'Workspaces',
      label: `Switch Workspace: ${item.name}`,
      description: item.path,
      enabled: workspace?.path !== item.path,
      run: async () => openWorkspace(item.path)
    }));
    return [
      {
        id: 'files:new-file',
        category: 'Files',
        label: 'Create New File',
        description: 'Create a file in the current workspace.',
        shortcut: 'Ctrl+N',
        run: async () => {
          const value = await requestInput({ title: 'Create new file', initialValue: activePath ?? 'new-file.md', confirmLabel: 'Create' });
          if (value) await createFile(value);
        }
      },
      {
        id: 'files:new-folder',
        category: 'Files',
        label: 'Create New Folder',
        description: 'Create a folder in the current workspace.',
        run: async () => {
          const value = await requestInput({ title: 'Create new folder', initialValue: 'new-folder', confirmLabel: 'Create' });
          if (value) await createDirectory(value);
        }
      },
      {
        id: 'files:rename-selected',
        category: 'Explorer',
        label: 'Rename Selected Item',
        description: `Rename ${selectedLabel}.`,
        enabled: Boolean(selectedPath),
        run: async () => {
          if (!selectedPath) return;
          const value = await requestInput({ title: `Rename ${selectedLabel}`, initialValue: selectedPath, confirmLabel: 'Rename' });
          if (value && value !== selectedPath) await renamePath(selectedPath, value);
        }
      },
      {
        id: 'files:duplicate-selected',
        category: 'Explorer',
        label: 'Duplicate Selected Item',
        description: `Duplicate ${selectedLabel}.`,
        enabled: Boolean(selectedPath),
        run: async () => {
          if (selectedPath) await duplicatePath(selectedPath);
        }
      },
      {
        id: 'files:delete-selected',
        category: 'Explorer',
        label: 'Delete Selected Item',
        description: `Delete ${selectedLabel}.`,
        enabled: Boolean(selectedPath),
        run: async () => {
          if (!selectedPath) return;
          const confirmed = await requestConfirm({
            title: `Delete ${selectedPath}?`,
            description: 'This permanently removes it and records a commit.',
            confirmLabel: 'Delete',
            destructive: true
          });
          if (confirmed) await deletePath(selectedPath);
        }
      },
      {
        id: 'files:open-by-name',
        category: 'Files',
        label: 'Open File By Name',
        description: 'Enter a path to open a file.',
        run: async () => {
          const value = await requestInput({ title: 'Open file path', initialValue: activePath ?? '', confirmLabel: 'Open' });
          if (value) await openFile(value);
        }
      },
      {
        id: 'files:quick-open',
        category: 'Files',
        label: 'Quick Open File',
        description: 'Open the quick file switcher.',
        shortcut: 'Ctrl+P',
        run: async () => {
          onQuickOpen();
        }
      },
      {
        id: 'editor:save-active',
        category: 'Editor',
        label: 'Save Active File',
        description: 'Save active tab changes.',
        shortcut: 'Ctrl+S',
        enabled: Boolean(activePath),
        run: async () => saveActive()
      },
      {
        id: 'editor:save-all',
        category: 'Editor',
        label: 'Save All Files',
        description: 'Save all dirty tabs.',
        run: async () => saveAllTabs()
      },
      {
        id: 'tabs:close-active',
        category: 'Tabs',
        label: 'Close Active Tab',
        description: 'Close the current editor tab.',
        shortcut: 'Ctrl+W',
        enabled: Boolean(activePath),
        run: async () => {
          if (activePath) closeTab(activePath);
        }
      },
      {
        id: 'tabs:close-others',
        category: 'Tabs',
        label: 'Close Other Tabs',
        description: 'Keep only the active tab.',
        enabled: Boolean(activePath),
        run: async () => {
          if (activePath) closeOtherTabs(activePath);
        }
      },
      {
        id: 'tabs:close-all',
        category: 'Tabs',
        label: 'Close All Tabs',
        description: 'Close all open editor tabs.',
        run: async () => closeAllTabs()
      },
      {
        id: 'tabs:reopen-last',
        category: 'Tabs',
        label: 'Reopen Closed Tab',
        description: 'Restore the most recently closed tab.',
        run: async () => reopenClosedTab()
      },
      {
        id: 'view:toggle-sidebar',
        category: 'View',
        label: 'Toggle Sidebar',
        description: 'Show or hide the explorer panel.',
        shortcut: 'Ctrl+B',
        run: async () => toggleSidebar()
      },
      {
        id: 'view:focus-explorer',
        category: 'View',
        label: 'Focus Explorer',
        description: 'Select the active file in explorer.',
        enabled: Boolean(activePath),
        run: async () => setExplorerSelectedPath(activePath)
      },
      {
        id: 'view:focus-editor',
        category: 'View',
        label: 'Focus Editor',
        description: 'Return to editor view.',
        run: async () => setActiveView('editor')
      },
      {
        id: 'history:open',
        category: 'History',
        label: 'Toggle History Panel',
        description: 'Open commit history view.',
        run: async () => setActiveView('history')
      },
      {
        id: 'search:notes',
        category: 'Search',
        label: 'Search Notes',
        description: 'Run a text search across workspace files.',
        shortcut: 'Ctrl+Shift+F',
        run: async () => {
          const value = await requestInput({ title: 'Search query', confirmLabel: 'Search' });
          if (value) await runSearch(value);
        }
      },
      {
        id: 'workspace:new',
        category: 'Workspaces',
        label: 'New Workspace',
        description: 'Create a new workspace repository.',
        run: async () => {
          const value = await requestInput({ title: 'New workspace name', initialValue: 'My Workspace', confirmLabel: 'Create' });
          if (value) await useGitPadStore.getState().createWorkspace(value);
        }
      },
      {
        id: 'workspace:rename',
        category: 'Workspaces',
        label: 'Rename Workspace',
        description: 'Rename the current workspace.',
        enabled: Boolean(workspace),
        run: async () => {
          if (!workspace) return;
          const value = await requestInput({ title: 'Rename workspace', initialValue: workspace.name, confirmLabel: 'Rename' });
          if (value && value !== workspace.name) await renameWorkspace(value);
        }
      },
      {
        id: 'workspace:delete',
        category: 'Workspaces',
        label: 'Delete Workspace',
        description: 'Remove current workspace from disk and list.',
        enabled: Boolean(workspace),
        run: async () => {
          if (!workspace) return;
          const confirmed = await requestConfirm({
            title: `Delete workspace "${workspace.name}"?`,
            description: 'This removes the workspace folder from disk.',
            confirmLabel: 'Delete workspace',
            destructive: true
          });
          if (confirmed) await deleteWorkspace(true);
        }
      },
      {
        id: 'git:commit-staged',
        category: 'History',
        label: 'Commit Staged Changes',
        description: 'Create a commit using only staged files.',
        enabled: Boolean(staging?.staged.length),
        run: async () => {
          const message = await requestInput({ title: 'Commit message', initialValue: 'Manual GitPad commit', confirmLabel: 'Commit' });
          if (message) await commitStaged(message);
        }
      },
      ...branches
        .filter((branch) => !branch.isActive)
        .map((branch) => ({
          id: `branch:switch:${branch.name}`,
          category: 'Workspaces',
          label: `Switch Branch: ${branch.name}`,
          description: 'Checkout this branch.',
          run: async () => useGitPadStore.getState().switchBranch(branch.name)
        })),
      {
        id: 'view:theme',
        category: 'View',
        label: 'Toggle Theme',
        description: 'Cycle through available themes.',
        run: async () => {
          const next =
            settings?.theme === 'dark' ? 'light' : settings?.theme === 'light' ? 'cyberpunk' : settings?.theme === 'cyberpunk' ? 'high-contrast' : 'dark';
          await updateSettings({ theme: next });
        }
      }
    ].concat(workspaceCommands);
  }, [
    activePath,
    branches,
    commitStaged,
    closeAllTabs,
    closeOtherTabs,
    closeTab,
    createDirectory,
    createFile,
    deletePath,
    deleteWorkspace,
    duplicatePath,
    explorerSelectedPath,
    onQuickOpen,
    openFile,
    openWorkspace,
    renamePath,
    renameWorkspace,
    reopenClosedTab,
    requestConfirm,
    requestInput,
    runSearch,
    saveActive,
    saveAllTabs,
    setActiveView,
    setExplorerSelectedPath,
    settings?.theme,
    staging?.staged.length,
    toggleSidebar,
    updateSettings,
    workspace,
    workspaces
  ]);

  const filtered = useMemo(() => {
    const withScore = commands
      .map((command) => ({ ...command, score: fuzzyScore(command.label, query) + fuzzyScore(command.description, query) }))
      .filter((command) => command.enabled !== false && command.score > 0);
    withScore.sort((a, b) => {
      const recentA = recent.includes(a.id) ? 8 : 0;
      const recentB = recent.includes(b.id) ? 8 : 0;
      return b.score + recentB - (a.score + recentA);
    });
    return withScore;
  }, [commands, query, recent]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  async function execute(command: PaletteCommand | undefined) {
    if (!command) return;
    await command.run();
    const nextRecent = [command.id, ...recent.filter((item) => item !== command.id)].slice(0, 12);
    setRecent(nextRecent);
    window.localStorage.setItem(recentCommandKey, JSON.stringify(nextRecent));
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await execute(filtered[activeIndex] ?? filtered[0]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, filtered.length - 1)));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 pt-[10vh]" onClick={onClose}>
      <form onSubmit={submit} className="mx-auto w-full max-w-2xl rounded-md border border-[#30363d] bg-[#161b22] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          title="Command search"
          className="h-14 w-full border-b border-[#30363d] bg-transparent px-4 text-lg text-[#c9d1d9] outline-none"
          placeholder="Type a command or action"
        />
        <div className="max-h-[70vh] overflow-auto p-2">
          {filtered.map((command, index) => (
            <button
              key={command.id}
              type="button"
              title={command.label}
              data-tooltip={command.label}
              onClick={() => void execute(command)}
              className={`block w-full rounded-md border px-3 py-2 text-left ${
                index === activeIndex ? 'border-[#58a6ff] bg-[#1f2937] text-[#c9d1d9]' : 'border-transparent text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{command.label}</div>
                {command.shortcut ? <span className="rounded border border-[#30363d] px-1.5 py-0.5 text-[10px] text-[#8b949e]">{command.shortcut}</span> : null}
              </div>
              <div className="mt-1 text-xs text-[#8b949e]">{command.category} · {command.description}</div>
            </button>
          ))}
          {filtered.length === 0 ? <div className="px-3 py-5 text-sm text-[#8b949e]">No commands match this query.</div> : null}
        </div>
      </form>
    </div>
  );
}

function fuzzyScore(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  const haystack = value.toLowerCase();
  if (haystack.includes(needle)) return needle.length + 20;
  let score = 0;
  let offset = 0;
  for (const char of needle) {
    const index = haystack.indexOf(char, offset);
    if (index === -1) return 0;
    score += index === offset ? 2 : 1;
    offset = index + 1;
  }
  return score;
}
