import { FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { useGitPadStore } from '../store/useGitPadStore';

export function AccountPanel() {
  const { session, users, login, register, logout } = useGitPadStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'login') {
      await login(identifier, password);
    } else {
      await register(username, email, password);
    }
    setPassword('');
  }

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(360px,480px)_minmax(0,1fr)] bg-[#0d1117] text-[#c9d1d9]">
      <div className="border-r border-[#30363d] p-5">
        <h2 className="mb-3 text-2xl font-semibold">Account</h2>
        {session ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
            <div className="font-semibold">{session.user.username}</div>
            <div className="text-sm text-[#8b949e]">{session.user.email}</div>
            <div className="mt-2 text-xs text-[#8b949e]">Logged in {new Date(session.loginAt).toLocaleString()}</div>
            <Button title="Logout" className="mt-3" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
            <div className="mb-3 flex gap-2">
              <Button title="Login mode" className={mode === 'login' ? 'bg-[#58a6ff] text-[#0d1117]' : ''} onClick={() => setMode('login')}>
                Login
              </Button>
              <Button title="Register mode" className={mode === 'register' ? 'bg-[#58a6ff] text-[#0d1117]' : ''} onClick={() => setMode('register')}>
                Register
              </Button>
            </div>
            {mode === 'login' ? (
              <label className="block">
                <span className="mb-1 block text-sm">Email or username</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  title="Email or username"
                  className="h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm outline-none focus:border-[#58a6ff]"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm">Username</span>
                  <input value={username} onChange={(event) => setUsername(event.target.value)} title="Username" className="h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm outline-none focus:border-[#58a6ff]" />
                </label>
                <label className="mt-2 block">
                  <span className="mb-1 block text-sm">Email</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} title="Email" className="h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm outline-none focus:border-[#58a6ff]" />
                </label>
              </>
            )}
            <label className="mt-2 block">
              <span className="mb-1 block text-sm">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} title="Password" className="h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm outline-none focus:border-[#58a6ff]" />
            </label>
            <Button type="submit" title={mode === 'login' ? 'Login' : 'Register'} className="mt-3 w-full bg-[#238636] text-[#f0f6fc] hover:bg-[#2ea043]">
              {mode === 'login' ? 'Login' : 'Register'}
            </Button>
          </form>
        )}
      </div>
      <div className="overflow-auto p-5">
        <h3 className="mb-3 text-lg font-semibold">Users</h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
              <div className="font-semibold">{user.username}</div>
              <div className="text-sm text-[#8b949e]">{user.email}</div>
            </div>
          ))}
          {!users.length ? <div className="text-sm text-[#8b949e]">No users registered yet.</div> : null}
        </div>
      </div>
    </section>
  );
}
