import { useEffect, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from '../components/Button';

export function SettingsPanel() {
  const { settings, updateSettings } = useGitPadStore();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!settings || !draft) return null;

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-6 text-[#c9d1d9]">
      <div className="max-w-3xl space-y-5">
        <h2 className="text-2xl font-semibold text-[#c9d1d9]">Settings</h2>
        <label className="flex items-center gap-3 rounded-md border border-[#30363d] bg-[#161b22] p-4">
          <input type="checkbox" checked={draft.autoCommit} onChange={(event) => setDraft({ ...draft, autoCommit: event.target.checked })} />
          <span>Auto-commit saved file changes</span>
        </label>
        <Field label="Git user name" value={draft.gitUserName} onChange={(gitUserName) => setDraft({ ...draft, gitUserName })} />
        <Field label="Git user email" value={draft.gitUserEmail} onChange={(gitUserEmail) => setDraft({ ...draft, gitUserEmail })} />
        <Field
          label="Default workspace location"
          value={draft.defaultWorkspaceLocation}
          onChange={(defaultWorkspaceLocation) => setDraft({ ...draft, defaultWorkspaceLocation })}
        />
        <label className="block">
          <span className="mb-2 block text-sm text-[#c9d1d9]">Theme</span>
          <select
            value={draft.theme}
            onChange={(event) => setDraft({ ...draft, theme: event.target.value as typeof draft.theme })}
            title="Theme"
            className="h-11 w-full rounded-md border border-[#30363d] bg-[#161b22] px-3 text-[#c9d1d9]"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="high-contrast">High contrast</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-md border border-[#30363d] bg-[#161b22] p-4">
          <input
            type="checkbox"
            checked={draft.github.autoPush}
            onChange={(event) => setDraft({ ...draft, github: { ...draft.github, autoPush: event.target.checked } })}
          />
          <span>Auto-push after sync-ready commits</span>
        </label>
        <Button title="Save settings" className="bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]" onClick={() => updateSettings(draft)}>
          Save settings
        </Button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#c9d1d9]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={label}
        className="h-11 w-full rounded-md border border-[#30363d] bg-[#161b22] px-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
      />
    </label>
  );
}
