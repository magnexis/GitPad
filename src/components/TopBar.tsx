import { useEffect, useState } from 'react';
import { Activity, BarChart3, GitBranch, Github, LayoutPanelLeft, MoreHorizontal, Network, Save, Search, Settings, TerminalSquare, UserCircle2, Workflow, type LucideIcon } from 'lucide-react';
import { useGitPadStore, type ViewName } from '../store/useGitPadStore';
import { Button } from './Button';

export function TopBar({ onPalette }: { onPalette: () => void }) {
  const headerLogo = 'GITPAD.png';
  const [moreOpen, setMoreOpen] = useState(false);
  const {
    workspace,
    activeView,
    branches,
    syncStatus,
    saveActive,
    saveAllTabs,
    loadBranches,
    switchBranch,
    createBranch,
    requestInput,
    sidebarCollapsed,
    toggleSidebar,
    setActiveView,
    notice
  } = useGitPadStore();
  const activeBranch = branches.find((branch) => branch.isActive)?.name ?? 'main';
  const primaryViews: Array<{ view: ViewName; label: string; icon: LucideIcon }> = [
    { view: 'editor', label: 'Editor', icon: Workflow },
    { view: 'search', label: 'Search', icon: Search },
    { view: 'changes', label: 'Changes', icon: GitBranch },
    { view: 'history', label: 'History', icon: BarChart3 },
    { view: 'terminal', label: 'Terminal', icon: TerminalSquare }
  ];
  const secondaryViews: Array<{ view: ViewName; label: string; icon: LucideIcon }> = [
    { view: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { view: 'graph', label: 'Graph', icon: Network },
    { view: 'activity', label: 'Activity', icon: Activity },
    { view: 'snapshots', label: 'Snapshots', icon: Workflow },
    { view: 'github', label: 'GitHub', icon: Github },
    { view: 'settings', label: 'Settings', icon: Settings },
    { view: 'account', label: 'Account', icon: UserCircle2 }
  ];

  useEffect(() => {
    if (!moreOpen) return;
    const close = () => setMoreOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [moreOpen]);

  async function handleCreateBranch() {
    const name = await requestInput({ title: 'New branch name', placeholder: 'feature/my-branch', confirmLabel: 'Create' });
    if (!name) return;
    try {
      await createBranch(name);
      await loadBranches();
    } catch (error) {
      useGitPadStore.getState().setNotice(error instanceof Error ? error.message : 'Failed to create branch.');
    }
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between gap-3 overflow-visible border-b border-[#30363d] bg-[#161b22]/96 px-4 py-3 text-[#c9d1d9] backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <img src={headerLogo} alt="GitPad" className="h-10 w-10 object-contain" />
        <div className="min-w-0 max-w-[360px]">
          <div className="truncate text-sm font-semibold text-[#c9d1d9]">{workspace?.name ?? 'GitPad'}</div>
          <div className="max-w-[560px] truncate text-xs text-[#8b949e]">{workspace?.path ?? 'Create or open a Git workspace to begin'}</div>
        </div>
      </div>
      <nav className="hidden min-w-0 items-center gap-1 rounded-md border border-[#30363d] bg-[#0d1117] p-1 lg:flex">
        {primaryViews.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              data-tooltip={`Open ${item.label}`}
              title={`Open ${item.label}`}
              onClick={() => setActiveView(item.view)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition ${
                active ? 'bg-[#1f6feb] text-[#f0f6fc]' : 'text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex min-w-0 items-center gap-2 overflow-visible">
        <div className="hidden items-center gap-1 rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1 md:flex">
          <GitBranch className="h-4 w-4 text-[#8b949e]" />
          <select
            value={activeBranch}
            onChange={(event) => {
              void switchBranch(event.target.value).catch((error) => {
                setActiveView('changes');
                useGitPadStore.getState().setNotice(error instanceof Error ? error.message : 'Failed to switch branch.');
              });
            }}
            title="Switch branch"
            className="h-7 max-w-[140px] rounded-md border border-[#30363d] bg-[#161b22] px-2 text-xs text-[#c9d1d9]"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={toggleSidebar} title={sidebarCollapsed ? 'Show explorer' : 'Hide explorer'} className="px-2 py-2">
          <LayoutPanelLeft className="h-4 w-4" />
        </Button>
        <Button onClick={onPalette} title="Open command palette" className="px-2 py-2">
          Ctrl K
        </Button>
        <Button onClick={saveActive} title="Save active file" className="bg-emerald-500 px-2 py-2 text-zinc-950 hover:bg-emerald-400">
          <Save className="h-4 w-4" />
        </Button>
        <div className="relative" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            data-tooltip="More actions"
            title="More actions"
            onClick={() => setMoreOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#21262d] px-2 py-2 text-xs text-[#c9d1d9] transition hover:bg-[#30363d]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[65] w-52 rounded-md border border-[#30363d] bg-[#161b22] p-1 shadow-lg">
              <button
                type="button"
                data-tooltip="Save all files"
                title="Save all files"
                onClick={() => {
                  void saveAllTabs();
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
              >
                <Save className="h-4 w-4" />
                Save All
              </button>
              <button
                type="button"
                data-tooltip="Create branch"
                title="Create branch"
                onClick={() => {
                  void handleCreateBranch();
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
              >
                <GitBranch className="h-4 w-4" />
                New Branch
              </button>
              <div className="my-1 border-t border-[#30363d]" />
              {secondaryViews.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    data-tooltip={`Open ${item.label}`}
                    title={`Open ${item.label}`}
                    onClick={() => {
                      setActiveView(item.view);
                      setMoreOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                      active ? 'bg-[#1f6feb] text-[#f0f6fc]' : 'text-[#c9d1d9] hover:bg-[#21262d]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <span className="hidden max-w-[160px] truncate text-xs text-[#8b949e] xl:inline">
          {syncStatus?.status ?? 'no-upstream'}
        </span>
        {notice ? <span className="hidden max-w-[220px] truncate text-xs text-[#58a6ff] 2xl:inline">{notice}</span> : null}
      </div>
    </header>
  );
}
