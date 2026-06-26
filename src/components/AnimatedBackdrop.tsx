export function AnimatedBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="gitpad-backdrop gitpad-backdrop-a" />
      <div className="gitpad-backdrop gitpad-backdrop-b" />
      <div className="gitpad-backdrop gitpad-backdrop-grid" />
    </div>
  );
}
