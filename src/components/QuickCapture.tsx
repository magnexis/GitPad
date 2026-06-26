import { FormEvent, useEffect, useState } from 'react';
import { Button } from './Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function QuickCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [content, setContent] = useState('');
  const quickCapture = useGitPadStore((state) => state.quickCapture);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    await quickCapture(content);
    setContent('');
    onClose();
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-md border border-[#30363d] bg-[#161b22] p-4" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold text-[#c9d1d9]">Quick Note</h2>
        <textarea
          autoFocus
          value={content}
          onChange={(event) => setContent(event.target.value)}
          title="Quick note content"
          className="h-44 w-full resize-none rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" title="Close quick note" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" title="Capture quick note" className="bg-[#58a6ff] text-[#0d1117] hover:opacity-90">
            Capture
          </Button>
        </div>
      </form>
    </div>
  );
}
