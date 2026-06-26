import { FormEvent, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';

export function TerminalPanel() {
  const { terminalOutput, runTerminal, workspace } = useGitPadStore();
  const [command, setCommand] = useState('git status');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!command.trim()) return;
    await runTerminal(command);
    setCommand('');
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0d1117] text-[#c9d1d9]">
      <div className="border-b border-[#30363d] px-4 py-2 font-mono text-xs text-[#8b949e]">{workspace?.path}</div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm">
        {terminalOutput.map((result, index) => (
          <div key={`${result.command}-${index}`} className="mb-5">
            <div className="text-[#58a6ff]">$ {result.command}</div>
            {result.stdout && <pre className="whitespace-pre-wrap text-[#c9d1d9]">{result.stdout}</pre>}
            {result.stderr && <pre className="whitespace-pre-wrap text-red-300">{result.stderr}</pre>}
            <div className="text-xs text-[#8b949e]">exit {result.exitCode}</div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex border-t border-[#30363d] p-3">
        <span className="px-3 py-2 font-mono text-[#58a6ff]">$</span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          title="Terminal command"
          className="flex-1 bg-transparent font-mono text-sm text-[#c9d1d9] outline-none"
          placeholder="git status"
          aria-label="Terminal command"
        />
      </form>
    </section>
  );
}
