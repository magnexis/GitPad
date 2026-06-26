import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';

export function languageForPath(relativePath: string) {
  const extension = relativePath.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    md: 'markdown',
    markdown: 'markdown',
    sh: 'bash',
    ps1: 'bash'
  };
  return map[extension ?? ''] ?? 'text';
}

export function highlightCode(code: string, relativePath: string) {
  const language = languageForPath(relativePath);
  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, language);
}

export function renderMarkdown(markdown: string): string {
  // Pre-process: extract fenced code blocks so they aren't mangled by other rules
  const codeBlocks: string[] = [];
  let processed = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlocks.length;
    const highlighted = lang && Prism.languages[lang]
      ? Prism.highlight(code.trimEnd(), Prism.languages[lang], lang)
      : escapeHtml(code.trimEnd());
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${highlighted}</code></pre>`);
    return `%%CODEBLOCK_${index}%%`;
  });

  // Split into lines for block-level processing
  const lines = processed.split('\n');
  const htmlLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block placeholder (already extracted above)
    if (/^%%CODEBLOCK_\d+%%$/.test(trimmed)) {
      htmlLines.push(trimmed);
      i++;
      continue;
    }

    // Headings (h1-h6) — must be at start of line
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      htmlLines.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
      htmlLines.push('<hr />');
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.replace(/^>\s?/, '');
      const quoteLines: string[] = [renderInline(quoteContent)];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        quoteLines.push(renderInline(lines[i].trim().replace(/^>\s?/, '')));
      }
      htmlLines.push(`<blockquote><p>${quoteLines.join('</p><p>')}</p></blockquote>`);
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [trimmed];
      // Check if next line is separator (|---|---|)
      if (i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
        tableLines.push(lines[i + 1].trim());
        i += 2;
        // Collect remaining table rows
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        htmlLines.push(renderTable(tableLines));
        continue;
      }
    }

    // Unordered list (handles - [ ] / - [x] task lists too)
    if (/^[-*+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!/^[-*+]\s/.test(t)) break;
        const content = t.replace(/^[-*+]\s+/, '');
        // Task list item
        const taskMatch = content.match(/^\[([ xX])\]\s*(.*)/);
        if (taskMatch) {
          const checked = taskMatch[1] !== ' ' ? ' checked' : '';
          items.push(`<li><input type="checkbox" disabled${checked} /> ${renderInline(taskMatch[2])}</li>`);
        } else {
          items.push(`<li>${renderInline(content)}</li>`);
        }
        i++;
      }
      htmlLines.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!/^\d+\.\s/.test(t)) break;
        const content = t.replace(/^\d+\.\s+/, '');
        items.push(`<li>${renderInline(content)}</li>`);
        i++;
      }
      htmlLines.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Empty line
    if (trimmed === '') {
      htmlLines.push('');
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (next === '' || /^#{1,6}\s/.test(next) || /^[-*+]\s/.test(next) || /^\d+\.\s/.test(next) ||
          next.startsWith('>') || /^%%CODEBLOCK_\d+%%$/.test(next) || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(next) ||
          (next.startsWith('|') && next.endsWith('|'))) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    htmlLines.push(`<p>${renderInline(paraLines.join(' '))}</p>`);
  }

  // Re-insert code blocks from placeholders
  let result = htmlLines.join('\n').replace(/%%CODEBLOCK_(\d+)%%/g, (_match, idx) => {
    return codeBlocks[parseInt(idx, 10)];
  });

  // Clean up excessive newlines (more than 2 consecutive become 2)
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

/** Render inline Markdown elements (bold, italic, code, links, images) */
function renderInline(text: string): string {
  // Images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Inline code (must come before bold/italic to avoid conflicts)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold: **text** and __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* and _text_ (but not inside words)
  text = text.replace(/(?<!\w)\*(?!\*)(.+?)(?<!\*)\*(?!\w)/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_(?!_)(.+?)(?<!_)_(?!\w)/g, '<em>$1</em>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  return text;
}

/** Render a GFM table from parsed rows */
function renderTable(tableLines: string[]): string {
  if (tableLines.length < 2) return renderInline(tableLines[0] || '');
  const parseRow = (row: string) =>
    row.split('|').slice(1, -1).map(cell => cell.trim());

  const headers = parseRow(tableLines[0]);
  const alignRow = parseRow(tableLines[1]);
  const aligns = alignRow.map(cell => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    return 'left';
  });

  const bodyRows = tableLines.slice(2).map(row => parseRow(row));

  const headerHtml = headers.map((h, idx) =>
    `<th style="text-align:${aligns[idx]}">${renderInline(h)}</th>`
  ).join('');

  const bodyHtml = bodyRows.map(row =>
    '<tr>' + row.map((cell, idx) =>
      `<td style="text-align:${aligns[idx] || 'left'}">${renderInline(cell)}</td>`
    ).join('') + '</tr>'
  ).join('');

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!);
}
