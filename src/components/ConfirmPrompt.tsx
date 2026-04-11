import { useGitPadStore } from '../store/useGitPadStore';
import { Button } from './Button';
import { useEffect } from 'react';

export function ConfirmPrompt() {
  const { confirmRequest, resolveConfirm } = useGitPadStore();

  useEffect(() => {
    if (!confirmRequest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveConfirm(false);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        resolveConfirm(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmRequest, resolveConfirm]);

  if (!confirmRequest) return null;

  return (
    <div className="fixed inset-0 z-[71] grid place-items-center bg-black/60 px-4" onClick={() => resolveConfirm(false)}>
      <section
        className="w-full max-w-md rounded-md border border-[#30363d] bg-[#161b22] p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#c9d1d9]">{confirmRequest.title}</h2>
        {confirmRequest.description ? <p className="mt-2 text-sm text-[#8b949e]">{confirmRequest.description}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button onClick={() => resolveConfirm(false)} title="Cancel">
            Cancel
          </Button>
          <Button
            onClick={() => resolveConfirm(true)}
            title={confirmRequest.confirmLabel ?? 'Confirm'}
            className={
              confirmRequest.destructive
                ? 'bg-[#da3633] text-[#f0f6fc] hover:bg-[#f85149]'
                : 'bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]'
            }
          >
            {confirmRequest.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </section>
    </div>
  );
}
