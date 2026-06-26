import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function GitHubPanel() {
  const { settings, saveGitHubToken, githubPush, githubPull } = useGitPadStore();
  const [owner, setOwner] = useState(settings?.github.owner ?? '');
  const [repo, setRepo] = useState(settings?.github.repo ?? '');
  const [token, setToken] = useState('');

  useEffect(() => {
    setOwner(settings?.github.owner ?? '');
    setRepo(settings?.github.repo ?? '');
  }, [settings]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await saveGitHubToken(token, owner, repo);
    setToken('');
  }

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-6 text-[#c9d1d9]">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-[#c9d1d9]">GitHub Sync</h2>
        <p className="mt-2 text-[#8b949e]">Tokens are encrypted with the desktop secure storage API before they touch disk.</p>
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <Input label="Owner" value={owner} onChange={setOwner} />
          <Input label="Repository" value={repo} onChange={setRepo} />
          <Input label="Personal access token" value={token} onChange={setToken} type="password" />
          <Button type="submit" title="Link repository" className="w-fit bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]">
            Link repository
          </Button>
        </form>
        <div className="mt-8 rounded-md border border-[#30363d] bg-[#161b22] p-4">
          <div className="text-sm text-[#8b949e]">Remote</div>
          <div className="font-mono text-sm text-[#c9d1d9]">{settings?.github.remoteUrl || 'No remote linked'}</div>
          <div className="mt-3 rounded-md border border-[#30363d] bg-[#21262d] p-3 text-sm text-[#c9d1d9]">
            Pull uses rebase. If Git reports conflicts, resolve them in the terminal and commit the result.
          </div>
          <div className="mt-3 text-sm text-[#8b949e]">Auto-push: {settings?.github.autoPush ? 'enabled' : 'disabled'}</div>
          <div className="mt-4 flex gap-3">
            <Button onClick={githubPull} title="Pull from GitHub">
              Pull
            </Button>
            <Button onClick={githubPush} title="Push to GitHub">
              Push
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#c9d1d9]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={label}
        className="h-11 w-full rounded-md border border-[#30363d] bg-[#161b22] px-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
      />
    </label>
  );
}
