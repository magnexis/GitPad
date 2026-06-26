import { ChevronDown, ChevronRight, Copy, Edit2, File, Folder, FolderPlus, FolderSearch, MinusSquare, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FileChangeState, FileNode } from '../shared/types';
import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from './Button';

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

export function FileExplorer() {
  const {
    tree,
    activePath,
    explorerSelectedPath,
    explorerFilter,
    setExplorerFilter,
    setExplorerSelectedPath,
    openFile,
    staging,
    createFile,
    createDirectory,
    renamePath,
    duplicatePath,
    deletePath,
    requestInput,
    requestConfirm,
    refreshTree
  } = useGitPadStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, FileNode>();
    const walk = (nodes: FileNode[]) => {
      for (const node of nodes) {
        map.set(node.relativePath, node);
        if (node.children) walk(node.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  useEffect(() => {
    if (!activePath) return;
    const parts = activePath.split('/');
    const next: Record<string, boolean> = {};
    for (let index = 1; index < parts.length; index += 1) {
      const folderPath = parts.slice(0, index).join('/');
      next[folderPath] = false;
    }
    setCollapsed((state) => ({ ...state, ...next }));
  }, [activePath]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const filteredTree = useMemo(() => filterTree(tree, explorerFilter), [tree, explorerFilter]);
  const statusByPath = useMemo(() => {
    const map = new Map<string, FileChangeState>();
    for (const change of staging?.conflicted ?? []) map.set(change.path, 'conflicted');
    for (const change of staging?.staged ?? []) {
      if (!map.has(change.path)) map.set(change.path, 'staged');
    }
    for (const change of staging?.unstaged ?? []) {
      if (!map.has(change.path)) map.set(change.path, change.state === 'untracked' ? 'untracked' : 'modified');
    }
    return map;
  }, [staging]);

  const resolveContainerPath = () => {
    if (!explorerSelectedPath) return '';
    const selected = nodeMap.get(explorerSelectedPath);
    if (!selected) return '';
    if (selected.type === 'directory') return selected.relativePath;
    const dir = dirname(selected.relativePath);
    return dir === '.' ? '' : dir;
  };

  async function promptCreateFile() {
    const container = resolveContainerPath();
    const suggestion = container ? `${container}/new-file.md` : 'new-file.md';
    const relativePath = await requestInput({
      title: 'Create new file',
      initialValue: suggestion,
      placeholder: 'notes/new-note.md',
      confirmLabel: 'Create'
    });
    if (!relativePath) return;
    await createFile(relativePath);
  }

  async function promptCreateFolder() {
    const container = resolveContainerPath();
    const suggestion = container ? `${container}/new-folder` : 'new-folder';
    const relativePath = await requestInput({
      title: 'Create new folder',
      initialValue: suggestion,
      placeholder: 'docs/guides',
      confirmLabel: 'Create'
    });
    if (!relativePath) return;
    await createDirectory(relativePath);
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    const walk = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          next[node.relativePath] = true;
          if (node.children) walk(node.children);
        }
      }
    };
    walk(tree);
    setCollapsed(next);
  }

  return (
    <aside className="flex min-h-0 w-80 flex-col border-r border-[#30363d] bg-[#161b22] text-[#c9d1d9]">
      <div className="space-y-2 border-b border-[#30363d] px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b949e]">Explorer</span>
          <div className="flex gap-1">
            <Button className="p-2" onClick={promptCreateFile} title="New File">
              <Plus className="h-4 w-4" />
            </Button>
            <Button className="p-2" onClick={promptCreateFolder} title="New Folder">
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button className="p-2" onClick={collapseAll} title="Collapse All">
              <MinusSquare className="h-4 w-4" />
            </Button>
            <Button className="p-2" onClick={() => refreshTree()} title="Refresh Explorer">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <label className="relative block">
          <FolderSearch className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[#8b949e]" />
          <input
            value={explorerFilter}
            onChange={(event) => setExplorerFilter(event.target.value)}
            title="Filter explorer"
            placeholder="Filter files"
            className="h-9 w-full rounded-md border border-[#30363d] bg-[#0d1117] pl-8 pr-3 text-sm text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {filteredTree.length === 0 ? (
          <div className="rounded-md border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#8b949e]">No files match your filter.</div>
        ) : (
          filteredTree.map((node) => (
            <NodeItem
              key={node.relativePath}
              node={node}
              depth={0}
              activePath={activePath}
              selectedPath={explorerSelectedPath}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              setSelectedPath={setExplorerSelectedPath}
              openFile={openFile}
              renamePath={renamePath}
              duplicatePath={duplicatePath}
              deletePath={deletePath}
              requestInput={requestInput}
              requestConfirm={requestConfirm}
              statusByPath={statusByPath}
              onContextMenu={setMenu}
            />
          ))
        )}
      </div>
      {menu ? (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          createFile={createFile}
          createDirectory={createDirectory}
          renamePath={renamePath}
          duplicatePath={duplicatePath}
          deletePath={deletePath}
          requestInput={requestInput}
          requestConfirm={requestConfirm}
        />
      ) : null}
    </aside>
  );
}

function NodeItem({
  node,
  depth,
  activePath,
  selectedPath,
  collapsed,
  setCollapsed,
  setSelectedPath,
  openFile,
  renamePath,
  duplicatePath,
  deletePath,
  requestInput,
  requestConfirm,
  statusByPath,
  onContextMenu
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  selectedPath: string | null;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSelectedPath: (path: string | null) => void;
  openFile: (path: string) => Promise<void>;
  renamePath: (path: string, nextPath: string) => Promise<void>;
  duplicatePath: (path: string, nextPath?: string) => Promise<string | null>;
  deletePath: (path: string) => Promise<void>;
  requestInput: ReturnType<typeof useGitPadStore.getState>['requestInput'];
  requestConfirm: ReturnType<typeof useGitPadStore.getState>['requestConfirm'];
  statusByPath: Map<string, FileChangeState>;
  onContextMenu: (menu: ContextMenuState | null) => void;
}) {
  const isFile = node.type === 'file';
  const isCollapsed = Boolean(collapsed[node.relativePath]);
  const isSelected = selectedPath === node.relativePath;
  const isActive = activePath === node.relativePath;
  const fileState = isFile ? statusByPath.get(node.relativePath) : undefined;

  const openNode = async () => {
    setSelectedPath(node.relativePath);
    if (isFile) await openFile(node.relativePath);
    else setCollapsed((state) => ({ ...state, [node.relativePath]: !state[node.relativePath] }));
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(event) => event.dataTransfer.setData('text/plain', node.relativePath)}
        onDragOver={(event) => !isFile && event.preventDefault()}
        onDrop={async (event) => {
          if (isFile) return;
          event.preventDefault();
          const source = event.dataTransfer.getData('text/plain');
          if (!source || source === node.relativePath || source.startsWith(`${node.relativePath}/`)) return;
          const name = source.split('/').at(-1);
          if (!name) return;
          await renamePath(source, `${node.relativePath}/${name}`);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setSelectedPath(node.relativePath);
          onContextMenu({ x: event.clientX, y: event.clientY, node });
        }}
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
          isActive ? 'bg-[#1f6feb]/25 text-[#c9d1d9]' : isSelected ? 'bg-[#30363d] text-[#c9d1d9]' : 'text-[#c9d1d9] hover:bg-[#21262d]'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isFile ? (
          <File className="h-4 w-4 text-[#8b949e]" />
        ) : (
          <button
            type="button"
            title={isCollapsed ? `Expand ${node.relativePath}` : `Collapse ${node.relativePath}`}
            className="flex items-center text-[#58a6ff]"
            onClick={(event) => {
              event.stopPropagation();
              setCollapsed((state) => ({ ...state, [node.relativePath]: !state[node.relativePath] }));
            }}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 transition" /> : <ChevronDown className="h-4 w-4 transition" />}
          </button>
        )}
        {!isFile ? <Folder className="h-4 w-4 text-[#8b949e]" /> : null}
        <button
          type="button"
          title={isFile ? `Open ${node.relativePath}` : node.relativePath}
          className="min-w-0 flex-1 truncate text-left"
          onClick={() => void openNode()}
          onDoubleClick={() => {
            if (isFile) void openFile(node.relativePath);
          }}
        >
          {node.name}
        </button>
        {isFile && fileState ? <FileStateBadge state={fileState} /> : null}
        <button
          type="button"
          title={`Rename ${node.relativePath}`}
          className="opacity-0 transition group-hover:opacity-100"
          onClick={async () => {
            const next = await requestInput({ title: `Rename ${node.name}`, initialValue: node.relativePath, confirmLabel: 'Rename' });
            if (!next || next === node.relativePath) return;
            await renamePath(node.relativePath, next);
          }}
        >
          <Edit2 className="h-4 w-4 text-[#8b949e] hover:text-[#58a6ff]" />
        </button>
        <button
          type="button"
          title={`Duplicate ${node.relativePath}`}
          className="opacity-0 transition group-hover:opacity-100"
          onClick={() => void duplicatePath(node.relativePath)}
        >
          <Copy className="h-4 w-4 text-[#8b949e] hover:text-[#58a6ff]" />
        </button>
        <button
          type="button"
          title={`Delete ${node.relativePath}`}
          className="opacity-0 transition group-hover:opacity-100"
          onClick={async () => {
            const confirmed = await requestConfirm({
              title: `Delete ${node.relativePath}?`,
              description: `This permanently removes this ${isFile ? 'file' : 'folder'} from disk and records a commit.`,
              confirmLabel: 'Delete',
              destructive: true
            });
            if (!confirmed) return;
            await deletePath(node.relativePath);
          }}
        >
          <Trash2 className="h-4 w-4 text-[#8b949e] hover:text-[#f85149]" />
        </button>
      </div>
      {!isFile && !isCollapsed
        ? node.children?.map((child) => (
            <NodeItem
              key={child.relativePath}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              selectedPath={selectedPath}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              setSelectedPath={setSelectedPath}
              openFile={openFile}
              renamePath={renamePath}
              duplicatePath={duplicatePath}
              deletePath={deletePath}
              requestInput={requestInput}
              requestConfirm={requestConfirm}
              statusByPath={statusByPath}
              onContextMenu={onContextMenu}
            />
          ))
        : null}
    </div>
  );
}

function FileStateBadge({ state }: { state: FileChangeState }) {
  const label = state === 'untracked' ? 'U' : state === 'staged' ? 'S' : state === 'conflicted' ? 'C' : 'M';
  const color =
    state === 'untracked'
      ? 'text-[#58a6ff]'
      : state === 'staged'
        ? 'text-[#3fb950]'
        : state === 'conflicted'
          ? 'text-[#f85149]'
          : 'text-[#e3b341]';
  return <span className={`rounded border border-[#30363d] px-1 text-[10px] font-semibold ${color}`}>{label}</span>;
}

function ContextMenu({
  menu,
  onClose,
  createFile,
  createDirectory,
  renamePath,
  duplicatePath,
  deletePath,
  requestInput,
  requestConfirm
}: {
  menu: ContextMenuState;
  onClose: () => void;
  createFile: (relativePath: string) => Promise<void>;
  createDirectory: (relativePath: string) => Promise<void>;
  renamePath: (relativePath: string, nextRelativePath: string) => Promise<void>;
  duplicatePath: (relativePath: string, nextRelativePath?: string) => Promise<string | null>;
  deletePath: (relativePath: string) => Promise<void>;
  requestInput: ReturnType<typeof useGitPadStore.getState>['requestInput'];
  requestConfirm: ReturnType<typeof useGitPadStore.getState>['requestConfirm'];
}) {
  const sourceParent = menu.node.type === 'directory' ? menu.node.relativePath : dirname(menu.node.relativePath);
  const normalizedContainer = sourceParent === '.' ? '' : sourceParent;
  const menuActions = [
    {
      label: 'New File',
      run: async () => {
        const value = await requestInput({
          title: 'Create new file',
          initialValue: normalizedContainer ? `${normalizedContainer}/new-file.md` : 'new-file.md',
          confirmLabel: 'Create'
        });
        if (value) await createFile(value);
      }
    },
    {
      label: 'New Folder',
      run: async () => {
        const value = await requestInput({
          title: 'Create new folder',
          initialValue: normalizedContainer ? `${normalizedContainer}/new-folder` : 'new-folder',
          confirmLabel: 'Create'
        });
        if (value) await createDirectory(value);
      }
    },
    {
      label: 'Rename',
      run: async () => {
        const value = await requestInput({
          title: `Rename ${menu.node.name}`,
          initialValue: menu.node.relativePath,
          confirmLabel: 'Rename'
        });
        if (value && value !== menu.node.relativePath) await renamePath(menu.node.relativePath, value);
      }
    },
    {
      label: 'Duplicate',
      run: async () => {
        await duplicatePath(menu.node.relativePath);
      }
    },
    {
      label: 'Delete',
      run: async () => {
        const confirmed = await requestConfirm({
          title: `Delete ${menu.node.relativePath}?`,
          description: `This permanently removes this ${menu.node.type === 'file' ? 'file' : 'folder'} from disk and records a commit.`,
          confirmLabel: 'Delete',
          destructive: true
        });
        if (!confirmed) return;
        await deletePath(menu.node.relativePath);
      }
    }
  ];

  return (
    <div
      className="fixed z-[65] w-48 rounded-md border border-[#30363d] bg-[#161b22] p-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {menuActions.map((action) => (
        <button
          key={action.label}
          type="button"
          title={action.label}
          data-tooltip={action.label}
          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
          onClick={() => {
            void action.run();
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function filterTree(nodes: FileNode[], filter: string): FileNode[] {
  const needle = filter.trim().toLowerCase();
  if (!needle) return nodes;
  const filtered: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(needle) || node.relativePath.toLowerCase().includes(needle)) filtered.push(node);
      continue;
    }
    const children = filterTree(node.children ?? [], filter);
    const matches = node.name.toLowerCase().includes(needle) || node.relativePath.toLowerCase().includes(needle);
    if (matches || children.length) filtered.push({ ...node, children });
  }
  return filtered;
}

function dirname(relativePath: string) {
  const normalized = relativePath.replaceAll('\\', '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) return '.';
  return normalized.slice(0, index);
}
