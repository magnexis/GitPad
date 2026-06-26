import { useEffect, useMemo, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';

export function GraphView() {
  const { graph, loadGraph, openFile } = useGitPadStore();
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    loadGraph();
  }, [loadGraph]);
  const layout = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    const radius = Math.max(120, nodes.length * 18);
    return nodes.map((node, index) => {
      const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
      return { ...node, x: 420 + Math.cos(angle) * radius, y: 300 + Math.sin(angle) * radius };
    });
  }, [graph]);
  const position = new Map(layout.map((node) => [node.path, node]));
  const connected = new Set((graph?.links ?? []).filter((link) => link.source === selected || link.target === selected).flatMap((link) => [link.source, link.target]));

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0d1117] text-[#c9d1d9]">
      <div className="flex h-12 items-center gap-3 border-b border-[#30363d] px-4">
        <span className="text-sm text-[#8b949e]">Zoom</span>
        <input type="range" min="0.6" max="1.8" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#0d1117]">
        <svg width="1200" height="850" style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
          {(graph?.links ?? []).map((link) => {
            const source = position.get(link.source);
            const target = position.get(link.target);
            if (!source || !target) return null;
            const active = !selected || link.source === selected || link.target === selected;
            return <line key={`${link.source}-${link.target}-${link.label}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={active ? '#58a6ff' : '#30363d'} strokeWidth={active ? 2 : 1} />;
          })}
          {layout.map((node) => {
            const active = !selected || selected === node.path || connected.has(node.path);
            return (
              <g key={node.path} onClick={() => { setSelected(node.path); openFile(node.path); }} className="cursor-pointer">
                <title>{node.title}</title>
                <circle cx={node.x} cy={node.y} r={active ? 24 : 18} fill={active ? '#58a6ff' : '#161b22'} stroke="#30363d" />
                <text x={node.x} y={node.y + 42} textAnchor="middle" fill="#c9d1d9" fontSize="13">{node.title}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
