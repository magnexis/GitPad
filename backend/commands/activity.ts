import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ActivityEvent } from '../../src/shared/types.js';

interface ActivityStore {
  events: ActivityEvent[];
}

export class ActivityService {
  private readonly storePath: string;

  constructor(private readonly appDataPath: string) {
    this.storePath = path.join(appDataPath, 'activity-store.json');
  }

  async feed(workspacePath?: string): Promise<ActivityEvent[]> {
    const store = await this.loadStore();
    const list = workspacePath
      ? store.events.filter((event) => !event.workspacePath || event.workspacePath === workspacePath)
      : store.events;
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 300);
  }

  async record(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent> {
    const next: ActivityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };
    const store = await this.loadStore();
    store.events.unshift(next);
    store.events = store.events.slice(0, 1000);
    await this.saveStore(store);
    return next;
  }

  private async loadStore(): Promise<ActivityStore> {
    await fs.mkdir(this.appDataPath, { recursive: true });
    try {
      const raw = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as ActivityStore;
      return { events: parsed.events ?? [] };
    } catch {
      const store: ActivityStore = { events: [] };
      await this.saveStore(store);
      return store;
    }
  }

  private async saveStore(store: ActivityStore) {
    await fs.mkdir(this.appDataPath, { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }
}
