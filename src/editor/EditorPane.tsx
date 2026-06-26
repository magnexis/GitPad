import { Play, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { highlightCode, languageForPath } from '../lib/editor';
import { MarkdownPreview } from './MarkdownPreview';
import { useGitPadStore } from '../store/useGitPadStore';

export function EditorPane() {
  const {
    tabs,
    activePath,
    setTabContent,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    reopenClosedTab,
    openFile,
    saveActive,
    saveAllTabs,
    runCodeFile,
    executionHistory,
    setActiveView
  } = useGitPadStore();
  const [layout, setLayout] = useState<'split' | 'preview' | 'editor' | 'compare'>('split');
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [tabMenu, setTabMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const active = tabs.find((tab) => tab.relativePath === activePath);
  const highlighted = useMemo(() => (active ? highlightCode(active.content, active.relativePath) : ''), [active]);
  const isMarkdown = active?.relativePath.toLowerCase().endsWith('.md');
  const isRunnableFile = Boolean(active && /\.(js|mjs|cjs|py)$/i.test(active.relativePath));

  useEffect(() => {
    function onClick() {
      setMenu(null);
      setTabMenu(null);
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  if (!active) {
    return (
      <section className="grid flex-1 place-items-center bg-[#0d1117] text-[#8b949e]">
        <div className="text-center">
          <div className="text-lg font-semibold text-[#c9d1d9]">Open a file from the explorer</div>
          <p className="mt-2 text-sm">Markdown, text, scripts, configs, and source files are all edited locally.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex min-w-0 flex-1 flex-col"
      onContextMenu={(event) => {
        event.preventDefault();
        if (isRunnableFile) setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <div className="flex h-10 items-center overflow-x-auto border-b border-[#30363d] bg-[#161b22]/90">
        {tabs.map((tab) => (
          <div
            key={tab.relativePath}
            onContextMenu={(event) => {
              event.preventDefault();
              setTabMenu({ x: event.clientX, y: event.clientY, path: tab.relativePath });
            }}
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                closeTab(tab.relativePath);
              }
            }}
            className={`flex h-full items-center gap-2 border-r border-[#30363d] px-3 text-sm ${tab.relativePath === activePath ? 'bg-[#21262d] text-[#c9d1d9]' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            <button
              type="button"
              data-tooltip={`Open ${tab.relativePath}`}
              title={`Open ${tab.relativePath}`}
              onClick={() => openFile(tab.relativePath)}
              className="flex min-w-0 items-center"
            >
              <span className="truncate">
                {tab.relativePath.split('/').at(-1)}
                {tab.dirty ? ' *' : ''}
              </span>
            </button>
            <button
              type="button"
              title={`Close ${tab.relativePath}`}
              data-tooltip={`Close ${tab.relativePath}`}
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.relativePath);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex h-10 items-center gap-2 border-b border-[#30363d] bg-[#0d1117] px-3">
        <button
          type="button"
          data-tooltip="Save active file"
          title="Save active file"
          onClick={() => saveActive()}
          className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1 text-xs text-[#c9d1d9] hover:bg-[#30363d]"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          type="button"
          data-tooltip="Save all files"
          title="Save all files"
          onClick={() => saveAllTabs()}
          className="rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1 text-xs text-[#c9d1d9] hover:bg-[#30363d]"
        >
          Save All
        </button>
        <button
          type="button"
          data-tooltip="Reopen closed tab"
          title="Reopen closed tab"
          onClick={() => reopenClosedTab()}
          className="rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1 text-xs text-[#c9d1d9] hover:bg-[#30363d]"
        >
          Reopen
        </button>
        {(['editor', 'split', 'preview', 'compare'] as const).map((mode) => (
            <button
              type="button"
              data-tooltip={layout === mode ? `Showing ${mode}` : `Switch to ${mode}`}
              title={layout === mode ? `Showing ${mode}` : `Switch to ${mode}`}
              key={mode}
              onClick={() => setLayout(mode)}
              className={`rounded-md px-3 py-1 text-xs ${layout === mode ? 'bg-[#58a6ff] text-[#0d1117]' : 'bg-[#21262d] text-[#c9d1d9]'}`}
            >
            {mode}
          </button>
        ))}
      </div>
      <div className={`grid min-h-0 flex-1 ${layout === 'editor' ? 'grid-cols-1' : layout === 'preview' ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]'}`}>
        {layout !== 'preview' && (
          <div className="relative min-w-0 border-r border-[#30363d]">
            <div className="absolute right-3 top-3 rounded-md bg-[#0d1117]/90 px-2 py-1 text-xs text-[#8b949e]">{languageForPath(active.relativePath)}</div>
            <textarea
              value={active.content}
              onChange={(event) => setTabContent(active.relativePath, event.target.value)}
              spellCheck={isMarkdown}
              className="h-full w-full resize-none bg-[#0d1117] p-5 font-mono text-sm leading-6 text-[#c9d1d9] outline-none"
            />
            {isRunnableFile && (
              <button
                type="button"
                data-tooltip={`Run ${active.relativePath}`}
                title={`Run ${active.relativePath}`}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md bg-[#58a6ff] px-3 py-2 text-sm font-semibold text-[#0d1117] transition hover:opacity-90"
                onClick={() => runCodeFile(active.relativePath)}
              >
                <Play className="h-4 w-4" />
                Run File
              </button>
            )}
          </div>
        )}
        {layout !== 'editor' && (
          <div className="min-w-0 overflow-auto bg-[#161b22] p-5">
            {isMarkdown ? (
              <MarkdownPreview markdown={active.content} sourcePath={active.relativePath} />
            ) : (
              <pre className="language-markup overflow-auto text-sm leading-6">
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            )}
            {layout === 'compare' && tabs.length > 1 && (
              <pre className="mt-4 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-4 text-xs text-[#c9d1d9]">
                {tabs.find((tab) => tab.relativePath !== active.relativePath)?.content}
              </pre>
            )}
            {isMarkdown && <ExecutionHistoryPanel sourcePath={active.relativePath} />}
          </div>
        )}
      </div>
      {menu && (
        <div
          className="fixed z-50 w-44 rounded-md border border-[#30363d] bg-[#161b22] p-1"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            data-tooltip="Run file"
            title="Run file"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d] disabled:opacity-40"
            onClick={() => {
              setMenu(null);
              runCodeFile(active.relativePath);
            }}
            disabled={!isRunnableFile}
          >
            Run File
          </button>
          <button
            type="button"
            data-tooltip="Open terminal"
            title="Open terminal"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
            onClick={() => {
              setMenu(null);
              setActiveView('terminal');
            }}
          >
            Open Terminal
          </button>
        </div>
      )}
      {tabMenu ? (
        <div
          className="fixed z-50 w-44 rounded-md border border-[#30363d] bg-[#161b22] p-1"
          style={{ left: tabMenu.x, top: tabMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            title="Close Tab"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
            onClick={() => {
              closeTab(tabMenu.path);
              setTabMenu(null);
            }}
          >
            Close Tab
          </button>
          <button
            type="button"
            title="Close Other Tabs"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
            onClick={() => {
              closeOtherTabs(tabMenu.path);
              setTabMenu(null);
            }}
          >
            Close Other Tabs
          </button>
          <button
            type="button"
            title="Close All Tabs"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
            onClick={() => {
              closeAllTabs();
              setTabMenu(null);
            }}
          >
            Close All Tabs
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ExecutionHistoryPanel({ sourcePath }: { sourcePath: string }) {
  const { executionHistory } = useGitPadStore();
  const items = executionHistory.filter((item) => item.sourcePath === sourcePath).slice(0, 5);
  if (!items.length) return null;
  return (
    <aside className="mt-5 rounded-md border border-[#30363d] bg-[#161b22] p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8b949e]">Execution History</div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className={`rounded-md border p-3 text-sm ${item.exitCode === 0 ? 'border-[#238636]/20 bg-[#238636]/10' : 'border-[#da3633]/20 bg-[#da3633]/10'}`}>
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8b949e]">
              {item.language} {item.scope}
            </div>
            {item.stdout.trim() ? <pre className="whitespace-pre-wrap text-[#c9d1d9]">{item.stdout}</pre> : null}
            {item.stderr.trim() ? <pre className="whitespace-pre-wrap text-[#ffa198]">{item.stderr}</pre> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
