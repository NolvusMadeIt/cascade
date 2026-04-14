import * as vscode from 'vscode';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

const MAX_SESSIONS    = 80;
const MAX_ARCHIVED    = 200;
const STORAGE_KEY     = 'cascade.sessions';
const ACTIVE_KEY      = 'cascade.activeSession';

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function titleFromMessage(content: string): string {
  const first = content.replace(/```[\s\S]*?```/g, '').trim().split('\n')[0].trim();
  return first.length > 50 ? first.slice(0, 47) + '…' : first || 'New chat';
}

export class SessionManager {
  private sessions: ChatSession[] = [];
  private activeId = '';

  constructor(private readonly storage: vscode.Memento) {
    this.load();
  }

  private load(): void {
    const raw = this.storage.get<ChatSession[]>(STORAGE_KEY, []);
    this.sessions = Array.isArray(raw) ? raw : [];
    this.activeId = this.storage.get<string>(ACTIVE_KEY, '');
    if (!this.sessions.find(s => s.id === this.activeId)) {
      this.activeId = this.sessions[0]?.id ?? '';
    }
    if (!this.sessions.length) {
      this.createSession();
    }
  }

  private async persist(): Promise<void> {
    await this.storage.update(STORAGE_KEY, this.sessions);
    await this.storage.update(ACTIVE_KEY, this.activeId);
  }

  get active(): ChatSession | undefined {
    return this.sessions.find(s => s.id === this.activeId);
  }

  get allSessions(): ChatSession[] {
    return [...this.sessions];
  }

  get openSessions(): ChatSession[] {
    return this.sessions.filter(s => !s.archived).slice(0, MAX_SESSIONS);
  }

  get historyItems(): ChatSession[] {
    return [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  createSession(): ChatSession {
    const session: ChatSession = {
      id: makeId(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
    };
    this.sessions.unshift(session);
    this.activeId = session.id;
    // Trim excess archived
    const archived = this.sessions.filter(s => s.archived);
    if (archived.length > MAX_ARCHIVED) {
      const keep = new Set(archived.slice(0, MAX_ARCHIVED).map(s => s.id));
      this.sessions = this.sessions.filter(s => !s.archived || keep.has(s.id));
    }
    void this.persist();
    return session;
  }

  switchTo(id: string): boolean {
    const session = this.sessions.find(s => s.id === id);
    if (!session) { return false; }
    if (session.archived) { session.archived = false; }
    this.activeId = id;
    void this.persist();
    return true;
  }

  closeSession(id: string): void {
    const session = this.sessions.find(s => s.id === id);
    if (!session) { return; }
    session.archived = true;
    if (this.activeId === id) {
      const open = this.openSessions.filter(s => s.id !== id);
      this.activeId = open[0]?.id ?? '';
      if (!this.activeId) {
        this.createSession();
        return;
      }
    }
    void this.persist();
  }

  renameSession(id: string, title: string): void {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.title = title.trim() || 'Chat';
      void this.persist();
    }
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    const session = this.active;
    if (!session) { return; }
    session.messages.push({ role, content });
    session.updatedAt = Date.now();
    // Auto-title from first user message
    if (session.title === 'New chat' && role === 'user') {
      session.title = titleFromMessage(content);
    }
    void this.persist();
  }

  updateLastAssistant(content: string): void {
    const session = this.active;
    if (!session) { return; }
    const last = session.messages.at(-1);
    if (last?.role === 'assistant') {
      last.content = content;
      session.updatedAt = Date.now();
      void this.persist();
    }
  }

  clearMessages(): void {
    const session = this.active;
    if (!session) { return; }
    session.messages = [];
    session.title = 'New chat';
    session.updatedAt = Date.now();
    void this.persist();
  }

  clearAllHistory(): void {
    this.sessions = [];
    this.activeId = '';
    this.createSession();
  }
}
