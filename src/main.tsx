import React from 'react';
import ReactDOM from 'react-dom/client';
import 'prismjs/themes/prism-tomorrow.css';
import './styles.css';
import { App } from './App';
import { useGitPadStore } from './store/useGitPadStore';

function FatalScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1117] px-6 text-[#c9d1d9]">
      <section className="w-full max-w-xl rounded-md border border-[#30363d] bg-[#161b22] p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm text-[#8b949e]">{message}</p>
      </section>
    </main>
  );
}

class RootErrorBoundary extends React.Component<React.PropsWithChildren, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'Unknown renderer error' };
  }

  componentDidCatch(error: Error) {
    console.error('Renderer crashed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <FatalScreen title="GitPad renderer error" message={this.state.error} />;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

function renderRoot(fatal?: { title: string; message: string }) {
  root.render(
    <React.StrictMode>
      {fatal ? (
        <FatalScreen title={fatal.title} message={fatal.message} />
      ) : (
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      )}
    </React.StrictMode>
  );
}

function formatError(reason: unknown) {
  if (reason instanceof Error) return reason.message || 'Unknown error';
  if (typeof reason === 'string') return reason;
  return JSON.stringify(reason);
}

window.addEventListener('error', (event) => {
  console.error('Unhandled window error', event.error || event.message);
  if (event.error instanceof Error) {
    renderRoot({
      title: 'Unhandled window error',
      message: formatError(event.error || event.message)
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error('Unhandled promise rejection', event.reason);
  useGitPadStore.getState().setNotice(formatError(event.reason));
});

renderRoot();
