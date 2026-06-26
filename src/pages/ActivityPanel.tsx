import { useEffect } from 'react';
import { useGitPadStore } from '../store/useGitPadStore';

export function ActivityPanel() {
  const { activityFeed, loadActivity } = useGitPadStore();

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-5 text-[#c9d1d9]">
      <h2 className="mb-4 text-2xl font-semibold">Activity Feed</h2>
      <div className="space-y-2">
        {activityFeed.map((event) => (
          <div key={event.id} className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
            <div className="text-sm font-semibold">{event.summary}</div>
            <div className="mt-1 text-xs text-[#8b949e]">
              {event.type} · {new Date(event.timestamp).toLocaleString()}
            </div>
            {event.details ? <pre className="mt-2 whitespace-pre-wrap text-xs text-[#8b949e]">{event.details}</pre> : null}
          </div>
        ))}
        {!activityFeed.length ? <div className="text-sm text-[#8b949e]">No activity yet.</div> : null}
      </div>
    </section>
  );
}
