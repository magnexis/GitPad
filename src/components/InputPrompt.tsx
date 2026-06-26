import { FormEvent, useEffect, useState } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from './Button';

export function InputPrompt() {
  const { promptRequest, resolveInput } = useGitPadStore();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!promptRequest) return;
    setValue(promptRequest.initialValue ?? '');
  }, [promptRequest]);

  useEffect(() => {
    if (!promptRequest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveInput(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promptRequest, resolveInput]);

  if (!promptRequest) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    resolveInput(value.trim() || null);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4" onClick={() => resolveInput(null)}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-md border border-[#30363d] bg-[#161b22] p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#c9d1d9]">{promptRequest.title}</h2>
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          title={promptRequest.title}
          placeholder={promptRequest.placeholder}
          className="mt-3 h-11 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button onClick={() => resolveInput(null)} title="Cancel">
            Cancel
          </Button>
          <Button type="submit" title={promptRequest.confirmLabel ?? 'Confirm'} className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]">
            {promptRequest.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </form>
    </div>
  );
}
