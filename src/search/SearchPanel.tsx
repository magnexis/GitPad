import { FormEvent } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';
import { useMemo, useState } from 'react';

export function SearchPanel() {
  const { searchQuery, searchResults, setSearchQuery, runAdvancedSearch, openFile, graph } = useGitPadStore();
  const [withinResults, setWithinResults] = useState('');
  const tags = Object.keys(graph?.tags ?? {});
  const visibleResults = useMemo(() => {
    const needle = withinResults.trim().toLowerCase();
    if (!needle) return searchResults;
    return searchResults.filter((result) => {
      if (result.relativePath.toLowerCase().includes(needle)) return true;
      return result.matches.some((match) => match.preview.toLowerCase().includes(needle));
    });
  }, [searchResults, withinResults]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAdvancedSearch({
      query: searchQuery,
      fileType: form.get('fileType')?.toString() || undefined,
      tag: form.get('tag')?.toString() || undefined,
      modifiedAfter: form.get('modifiedAfter')?.toString() || undefined
    });
  }
  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-5 text-[#c9d1d9]">
      <form onSubmit={submit} className="mb-5 grid gap-3">
        <input
          autoFocus
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          title="Search query"
          placeholder="Search every text file in this workspace"
          className="h-11 flex-1 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
        />
        <div className="flex flex-wrap gap-3">
          <select name="fileType" title="Filter by file type" className="h-10 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-sm text-[#c9d1d9]">
            <option value="">All files</option>
            <option value=".md">Markdown</option>
            <option value=".ts">TypeScript</option>
            <option value=".js">JavaScript</option>
            <option value=".txt">Text</option>
          </select>
          <select name="tag" title="Filter by tag" className="h-10 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-sm text-[#c9d1d9]">
            <option value="">All tags</option>
            {tags.map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
          </select>
          <input name="modifiedAfter" type="date" title="Modified after" className="h-10 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-sm text-[#c9d1d9]" />
          <button type="submit" data-tooltip="Search files" title="Search files" className="rounded-md border border-[#30363d] bg-[#21262d] px-4 font-semibold text-[#c9d1d9] hover:bg-[#30363d]">Search</button>
        </div>
        <input
          value={withinResults}
          onChange={(event) => setWithinResults(event.target.value)}
          title="Search inside current results"
          placeholder="Search inside results"
          className="h-10 rounded-md border border-[#30363d] bg-[#161b22] px-3 text-sm text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
        />
      </form>
      <div className="space-y-3">
        {visibleResults.map((result) => (
          <button
            type="button"
            data-tooltip={`Open ${result.relativePath}`}
            title={`Open ${result.relativePath}`}
            key={result.relativePath}
            className="block w-full rounded-md border border-[#30363d] bg-[#161b22] p-4 text-left hover:bg-[#21262d]"
            onClick={() => openFile(result.relativePath)}
          >
            <div className="font-semibold text-[#c9d1d9]">{result.relativePath}</div>
            <div className="mt-1 flex gap-2 text-xs text-[#8b949e]">
              {result.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
              {result.updatedAt && <span>{new Date(result.updatedAt).toLocaleDateString()}</span>}
            </div>
            {result.matches.map((match) => (
              <div key={`${match.line}:${match.column}`} className="mt-2 font-mono text-xs text-[#c9d1d9]">
                {match.line}:{match.column} <Highlighted text={match.preview} query={searchQuery} />
              </div>
            ))}
          </button>
        ))}
      </div>
    </section>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#58a6ff] px-1 text-[#0d1117]">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
