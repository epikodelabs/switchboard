/**
 * Mock backend for the General Ledger demo.
 * Exports:
 *  - mockBackend / mockFetch  — lightweight request router
 *  - InMemoryDataService     — angular-in-memory-web-api compatible seed
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MockRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | undefined>;
}

export interface MockResponse<T = unknown> {
  readonly status: number;
  readonly data: T;
  readonly ok: boolean;
}

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MockHttpError';
  }
}

const LATENCY_MIN = 80;
const LATENCY_MAX = 280;

function delay(ms?: number): Promise<void> {
  const wait =
    ms ??
    LATENCY_MIN + Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN));
  return new Promise(resolve => setTimeout(resolve, wait));
}

function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]!;
    const vp = pathParts[i]!;
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(vp);
    } else if (pp !== vp) {
      return null;
    }
  }
  return params;
}

type Handler = (
  req: MockRequest,
  params: Record<string, string>,
) => unknown | Promise<unknown>;

interface Route {
  method: HttpMethod;
  pattern: string;
  handler: Handler;
}

export class MockBackend {
  private readonly routes: Route[] = [];
  private readonly store = new Map<string, unknown>();

  getState<T>(key: string, fallback: T): T {
    if (!this.store.has(key)) {
      this.store.set(key, fallback);
    }
    return this.store.get(key) as T;
  }

  setState(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  on(method: HttpMethod, pattern: string, handler: Handler): this {
    this.routes.push({ method, pattern, handler });
    return this;
  }

  get(pattern: string, handler: Handler): this {
    return this.on('GET', pattern, handler);
  }

  post(pattern: string, handler: Handler): this {
    return this.on('POST', pattern, handler);
  }

  put(pattern: string, handler: Handler): this {
    return this.on('PUT', pattern, handler);
  }

  patch(pattern: string, handler: Handler): this {
    return this.on('PATCH', pattern, handler);
  }

  delete(pattern: string, handler: Handler): this {
    return this.on('DELETE', pattern, handler);
  }

  async request<T = unknown>(req: MockRequest): Promise<MockResponse<T>> {
    await delay();

    const path = req.path.startsWith('/') ? req.path : `/${req.path}`;

    for (const route of this.routes) {
      if (route.method !== req.method) {
        continue;
      }
      const params = matchPath(route.pattern, path);
      if (!params) {
        continue;
      }
      try {
        const data = (await route.handler({ ...req, path }, params)) as T;
        return { status: 200, data, ok: true };
      } catch (err) {
        if (err instanceof MockHttpError) {
          return {
            status: err.status,
            data: { message: err.message } as T,
            ok: false,
          };
        }
        throw err;
      }
    }

    return {
      status: 404,
      data: { message: `No mock route for ${req.method} ${path}` } as T,
      ok: false,
    };
  }
}

export const mockBackend = new MockBackend();

mockBackend.get('/health', () => ({
  status: 'ok',
  service: 'mock-backend',
  at: new Date().toISOString(),
}));

mockBackend.get('/meta', () => ({
  name: 'General Ledger mock API',
  version: '1.0.0',
  persistence: 'localStorage + in-memory routes',
}));

export async function mockFetch<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const res = await mockBackend.request<T>({ method, path, body, query });
  if (!res.ok) {
    const message =
      res.data &&
      typeof res.data === 'object' &&
      'message' in (res.data as object)
        ? String((res.data as any).message)
        : `Mock request failed (${res.status})`;
    throw new MockHttpError(res.status, message);
  }
  return res.data;
}

// ────────────────────────────────────────────────────────────────
// angular-in-memory-web-api compatible service
// Used as: HttpClientInMemoryWebApiModule.forRoot(InMemoryDataService)
// ────────────────────────────────────────────────────────────────

/** Shape expected by angular-in-memory-web-api `InMemoryDbService`. */
export interface InMemoryDbService {
  createDb(reqInfo?: unknown): Record<string, unknown[]> | Promise<Record<string, unknown[]>>;
}

/**
 * Seed data for HttpClient + InMemoryWebApi.
 * Collection names become URL segments, e.g. GET api/accounts.
 */
export class InMemoryDataService implements InMemoryDbService {
  createDb(_reqInfo?: unknown): Record<string, unknown[]> {
    const accounts = [
      { id: 'a-1000', code: '1000', name: 'Cash', type: 'asset', currency: 'USD', archived: false },
      { id: 'a-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', currency: 'USD', archived: false },
      { id: 'a-1200', code: '1200', name: 'Inventory', type: 'asset', currency: 'USD', archived: false },
      { id: 'a-2000', code: '2000', name: 'Accounts Payable', type: 'liability', currency: 'USD', archived: false },
      { id: 'a-2100', code: '2100', name: 'Accrued Expenses', type: 'liability', currency: 'USD', archived: false },
      { id: 'a-3000', code: '3000', name: 'Owner Equity', type: 'equity', currency: 'USD', archived: false },
      { id: 'a-4000', code: '4000', name: 'Sales Revenue', type: 'income', currency: 'USD', archived: false },
      { id: 'a-4100', code: '4100', name: 'Service Revenue', type: 'income', currency: 'USD', archived: false },
      { id: 'a-5000', code: '5000', name: 'Cost of Goods Sold', type: 'expense', currency: 'USD', archived: false },
      { id: 'a-5100', code: '5100', name: 'Rent Expense', type: 'expense', currency: 'USD', archived: false },
      { id: 'a-5200', code: '5200', name: 'Utilities', type: 'expense', currency: 'USD', archived: false },
      { id: 'a-5300', code: '5300', name: 'Salaries', type: 'expense', currency: 'USD', archived: false },
    ];

    const entries = [
      {
        id: 'je-001',
        date: '2026-07-01',
        description: 'Opening capital contribution',
        reference: 'OPEN-001',
        status: 'posted',
        createdAt: '2026-07-01T09:00:00.000Z',
        postedAt: '2026-07-01T09:00:00.000Z',
        lines: [
          { accountId: 'a-1000', debit: 50000, credit: 0, memo: 'Initial cash' },
          { accountId: 'a-3000', debit: 0, credit: 50000, memo: 'Owner equity' },
        ],
      },
      {
        id: 'je-002',
        date: '2026-07-03',
        description: 'Office rent — July',
        reference: 'RENT-0701',
        status: 'posted',
        createdAt: '2026-07-03T11:20:00.000Z',
        postedAt: '2026-07-03T11:20:00.000Z',
        lines: [
          { accountId: 'a-5100', debit: 2400, credit: 0 },
          { accountId: 'a-1000', debit: 0, credit: 2400 },
        ],
      },
      {
        id: 'je-003',
        date: '2026-07-05',
        description: 'Invoice #1042 — consulting services',
        reference: 'INV-1042',
        status: 'posted',
        createdAt: '2026-07-05T14:10:00.000Z',
        postedAt: '2026-07-05T14:10:00.000Z',
        lines: [
          { accountId: 'a-1100', debit: 8500, credit: 0 },
          { accountId: 'a-4100', debit: 0, credit: 8500 },
        ],
      },
      {
        id: 'je-009',
        date: '2026-07-28',
        description: 'Draft: supplier credit note (unposted)',
        reference: 'CN-019',
        status: 'draft',
        createdAt: '2026-07-28T15:00:00.000Z',
        lines: [
          { accountId: 'a-2000', debit: 450, credit: 0 },
          { accountId: 'a-1200', debit: 0, credit: 450 },
        ],
      },
    ];

    const events = [
      {
        id: 'ev-seed',
        at: new Date().toISOString(),
        message: 'In-memory database seeded.',
        kind: 'info',
      },
    ];

    // Collection keys = URL path segments for in-memory-web-api
    // e.g. GET /api/accounts  → accounts
    return {
      accounts,
      entries,
      events,
      // aliases some apps expect
      account: accounts,
      journalEntries: entries,
      journal: entries,
    };
  }

  /**
   * Optional: generate numeric ids for POST when the client omits id.
   * angular-in-memory-web-api calls this if present.
   */
  genId(collection: { id: string | number }[], _collectionName: string): string {
    if (!collection || collection.length === 0) {
      return '1';
    }
    const nums = collection
      .map(item => {
        const n = Number(String(item.id).replace(/\D/g, ''));
        return Number.isFinite(n) ? n : 0;
      })
      .filter(n => n > 0);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return String(next);
  }
}

/** Default export for modules that do: import InMemoryDataService from '...' */
export default InMemoryDataService;
