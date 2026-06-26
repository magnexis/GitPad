import { Play } from 'lucide-react';
import { ReactNode, useMemo } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';
import type { CodeExecutionResult, ExecutionLanguage } from '../shared/types';

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; key: string }
  | { type: 'paragraph'; text: string; key: string }
  | { type: 'code'; language: ExecutionLanguage | 'text'; code: string; key: string };

export function MarkdownPreview({ markdown, sourcePath }: { markdown: string; sourcePath: string }) {
  const { executionHistory, openLinkedNote, runCodeSnippet } = useGitPadStore();
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <article className="markdown space-y-4 text-zinc-100">
      {blocks.map((block) => {
        if (block.type === 'heading') {
          const Tag = `h${block.level}` as const;
          return <Tag key={block.key ?? `${block.level}-${block.text}`}>{renderInline(block.text, openLinkedNote)}</Tag>;
        }
        if (block.type === 'code') {
          const latest = executionHistory.find((item) => item.sourcePath === sourcePath && item.blockKey === block.key);
          const runnable = block.language === 'javascript' || block.language === 'python';
          return (
            <section key={block.key} className="overflow-hidden rounded-md border border-white/10 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{block.language}</span>
                <button
                  type="button"
                  data-tooltip={`Run ${block.language} block`}
                  title={`Run ${block.language} block`}
                  disabled={!runnable}
                  onClick={() => runnable && runCodeSnippet(block.language as ExecutionLanguage, block.code, sourcePath, block.key)}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run
                </button>
              </div>
              <pre className="overflow-auto p-4 text-sm leading-6 text-zinc-100">
                <code>{block.code}</code>
              </pre>
              {latest && <ExecutionOutput result={latest} />}
            </section>
          );
        }
        return <p key={block.key}>{renderInline(block.text, openLinkedNote)}</p>;
      })}
    </article>
  );
}

function ExecutionOutput({ result }: { result: CodeExecutionResult }) {
  const hasError = result.exitCode !== 0 || Boolean(result.stderr.trim());
  return (
    <div className={`border-t px-4 py-3 text-sm ${hasError ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-100'}`}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Output</div>
      {result.stdout.trim() ? <pre className="whitespace-pre-wrap">{result.stdout}</pre> : null}
      {result.stderr.trim() ? <pre className="whitespace-pre-wrap text-red-200">{result.stderr}</pre> : null}
      {!result.stdout.trim() && !result.stderr.trim() ? <div className="text-zinc-400">No output.</div> : null}
    </div>
  );
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let codeFence: { language: string; lines: string[]; index: number } | null = null;
  let blockIndex = 0;

  function flushParagraph() {
    const text = buffer.join('\n').trim();
    if (text) blocks.push({ type: 'paragraph', text, key: `p-${blockIndex++}` });
    buffer = [];
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      if (codeFence) {
        blocks.push({
          type: 'code',
          language: normalizeLanguage(codeFence.language),
          code: codeFence.lines.join('\n'),
          key: `code-${codeFence.index}`
        });
        codeFence = null;
      } else {
        flushParagraph();
        codeFence = { language: fenceMatch[1] || 'text', lines: [], index: blockIndex++ };
      }
      continue;
    }
    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2], key: `h-${blockIndex++}` });
      continue;
    }
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    buffer.push(line);
  }

  flushParagraph();
  if (codeFence) {
    blocks.push({
      type: 'code',
      language: normalizeLanguage(codeFence.language),
      code: codeFence.lines.join('\n'),
      key: `code-${codeFence.index}`
    });
  }

  return blocks;
}

function renderInline(text: string, openLinkedNote: (noteName: string) => Promise<void>): ReactNode[] {
  const segments = text.split(/(\[\[[^\]]+\]\])/g);
  return segments.map((segment, index) => {
    const linkMatch = segment.match(/^\[\[([^\]]+)\]\]$/);
    if (linkMatch) {
      const noteName = linkMatch[1];
      return (
        <button
          type="button"
          data-tooltip={`Open ${noteName}`}
          title={`Open ${noteName}`}
          key={`${noteName}-${index}`}
          className="wiki-link"
          onClick={(event) => {
            event.preventDefault();
            openLinkedNote(noteName);
          }}
        >
          {noteName}
        </button>
      );
    }
    return <span key={`${index}-${segment}`}>{segment}</span>;
  });
}

function normalizeLanguage(language: string): ExecutionLanguage | 'text' {
  const value = language.toLowerCase();
  if (value === 'js' || value === 'javascript' || value === 'node') return 'javascript';
  if (value === 'py' || value === 'python') return 'python';
  return 'text';
}
