import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import type { FileNode } from '../shared/types';
import { useGitPadStore } from '../store/useGitPadStore';

export function QuickOpen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tree, activePath, recentFiles, openFile } = useGitPadStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const files = useMemo(() => flattenFiles(tree), [tree]);
  const ordered = useMemo(() => {
    const recentFirst = [...recentFiles.filter((item) => files.includes(item)), ...files.filter((item) => !recentFiles.includes(item))];
    const unique = [...new Set(recentFirst)];
    if (!query.trim()) return unique.slice(0, 120);
    return unique
      .map((item) => ({ item, score: fuzzyScore(item, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.item)
      .slice(0, 120);
  }, [files, query, recentFiles]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, ordered.length - 1)));
  }, [ordered.length]);

  if (!open) return null;

  async function openSelected(path: string | undefined) {
    if (!path) return;
    await openFile(path);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, ordered.length - 1)));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void openSelected(ordered[activeIndex] ?? ordered[0]);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 pt-[14vh]" onClick={onClose}>
      <div className="mx-auto w-full max-w-2xl rounded-md border border-[#30363d] bg-[#161b22] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          title="Quick open"
          placeholder="Quick open file..."
          className="h-14 w-full border-b border-[#30363d] bg-transparent px-4 text-lg text-[#c9d1d9] outline-none"
        />
        <div className="max-h-[60vh] overflow-auto p-2">
          {ordered.map((relativePath, index) => (
            <button
              key={relativePath}
              type="button"
              data-tooltip={`Open ${relativePath}`}
              title={`Open ${relativePath}`}
              onClick={() => void openSelected(relativePath)}
              className={`block w-full rounded-md border px-3 py-2 text-left ${
                index === activeIndex ? 'border-[#58a6ff] bg-[#1f2937]' : 'border-transparent hover:bg-[#21262d]'
              }`}
            >
              <div className="truncate font-medium text-[#c9d1d9]">{relativePath.split('/').at(-1)}</div>
              <div className="mt-1 truncate text-xs text-[#8b949e]">{relativePath}</div>
              {activePath === relativePath ? <div className="mt-1 text-[11px] text-[#58a6ff]">Active</div> : null}
            </button>
          ))}
          {ordered.length === 0 ? <div className="px-3 py-5 text-sm text-[#8b949e]">No files match your query.</div> : null}
        </div>
      </div>
    </div>
  );
}

function flattenFiles(nodes: FileNode[]): string[] {
  const files: string[] = [];
  const walk = (items: FileNode[]) => {
    for (const node of items) {
      if (node.type === 'file') files.push(node.relativePath);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return files;
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
