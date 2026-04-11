import { useEffect, useState } from 'react';
import { FileExplorer } from './components/FileExplorer';
import { TopBar } from './components/TopBar';
import { WorkspaceGate } from './components/WorkspaceGate';
import { CommandPalette } from './components/CommandPalette';
import { AnimatedBackdrop } from './components/AnimatedBackdrop';
import { ConfirmPrompt } from './components/ConfirmPrompt';
import { InputPrompt } from './components/InputPrompt';
import { QuickCapture } from './components/QuickCapture';
import { QuickOpen } from './components/QuickOpen';
import { EditorPane } from './editor/EditorPane';
import { GitHubPanel } from './git/GitHubPanel';
import { HistoryPanel } from './git/HistoryPanel';
import { SourceControlPanel } from './git/SourceControlPanel';
import { ActivityPanel } from './pages/ActivityPanel';
import { AccountPanel } from './pages/AccountPanel';
import { Dashboard } from './pages/Dashboard';
import { GraphView } from './pages/GraphView';
import { SnapshotsPanel } from './pages/SnapshotsPanel';
import { SearchPanel } from './search/SearchPanel';
import { SettingsPanel } from './settings/SettingsPanel';
import { TerminalPanel } from './terminal/TerminalPanel';
import { useGitPadStore, type ViewName } from './store/useGitPadStore';

const validRoutes: ViewName[] = ['dashboard', 'editor', 'search', 'graph', 'history', 'snapshots', 'terminal', 'github', 'settings', 'changes', 'activity', 'account'];

export function App() {
  const { loadInitial, workspace, activeView, settings, setActiveView, toggleSidebar, activePath, closeTab, sidebarCollapsed } = useGitPadStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickFileOpen, setQuickFileOpen] = useState(false);
  const bridgeReady = typeof window.gitpad?.getSettings === 'function';

  useEffect(() => {
    if (!bridgeReady) return;
    loadInitial().catch((error) => console.error(error));
  }, [bridgeReady, loadInitial]);

  useEffect(() => {
    const route = window.location.hash.replace('#/', '') as ViewName;
    if (validRoutes.includes(route)) setActiveView(route);
    function onHashChange() {
      const next = window.location.hash.replace('#/', '') as ViewName;
      if (validRoutes.includes(next)) setActiveView(next);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [setActiveView]);

  useEffect(() => {
    if (window.location.hash !== `#/${activeView}`) window.location.hash = `/${activeView}`;
  }, [activeView]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        useGitPadStore.getState().saveActive();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        void (async () => {
          const name = await useGitPadStore.getState().requestInput({
            title: 'Create new note',
            placeholder: 'notes/untitled.md',
            initialValue: 'Untitled.md',
            confirmLabel: 'Create'
          });
          if (!name) return;
          const normalized = name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
          await useGitPadStore.getState().createFile(normalized);
        })();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setQuickFileOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        useGitPadStore.getState().setActiveView('search');
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        if (activePath) closeTab(activePath);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setQuickOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePath, closeTab, toggleSidebar]);

  if (!bridgeReady) {
    return (
      <main className="app-shell relative grid min-h-screen place-items-center bg-[#0d1117] px-6 text-[#c9d1d9]">
        <AnimatedBackdrop />
        <section className="w-full max-w-xl rounded-md border border-[#30363d] bg-[#161b22] p-6 text-center">
          <h1 className="text-xl font-semibold">GitPad failed to connect to desktop bridge</h1>
          <p className="mt-3 text-sm text-[#8b949e]">
            Restart GitPad from the desktop launcher so the preload API can initialize correctly.
          </p>
        </section>
      </main>
    );
  }

  if (!workspace) return <WorkspaceGate />;

  return (
    <div className={`theme-${settings?.theme ?? 'dark'} app-shell relative flex h-screen flex-col overflow-hidden bg-[#0d1117] text-[#c9d1d9]`}>
      <AnimatedBackdrop />
      <TopBar onPalette={() => setPaletteOpen(true)} />
      <div className="flex min-h-0 flex-1">
        {!sidebarCollapsed ? <FileExplorer /> : null}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'editor' && <EditorPane />}
        {activeView === 'search' && <SearchPanel />}
        {activeView === 'graph' && <GraphView />}
        {activeView === 'history' && <HistoryPanel />}
        {activeView === 'changes' && <SourceControlPanel />}
        {activeView === 'activity' && <ActivityPanel />}
        {activeView === 'account' && <AccountPanel />}
        {activeView === 'snapshots' && <SnapshotsPanel />}
        {activeView === 'terminal' && <TerminalPanel />}
        {activeView === 'github' && <GitHubPanel />}
        {activeView === 'settings' && <SettingsPanel />}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onQuickOpen={() => setQuickFileOpen(true)} />
      <QuickOpen open={quickFileOpen} onClose={() => setQuickFileOpen(false)} />
      <QuickCapture open={quickOpen} onClose={() => setQuickOpen(false)} />
      <InputPrompt />
      <ConfirmPrompt />
    </div>
  );
}
