import { vi } from "vitest";

/**
 * Creates a chainable mock that mimics Supabase's query builder pattern.
 * Each method returns `this` for chaining, and the final result is configurable.
 */
export function createMockSupabaseClient(overrides: {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
} = {}) {
  const { data = null, error = null, count = null } = overrides;

  const result = { data, error, count };

  const chainable: Record<string, unknown> = {};

  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in", "not",
    "or", "and", "filter",
    "order", "limit", "range",
    "single", "maybeSingle",
    "textSearch", "match", "contains", "containedBy",
  ];

  for (const method of methods) {
    chainable[method] = vi.fn().mockReturnValue(chainable);
  }

  // Terminal methods resolve to the result
  chainable.then = undefined; // Make it thenable by returning the result as a promise
  chainable.single = vi.fn().mockResolvedValue(result);

  // Override select to be thenable (resolves when awaited without .single())
  const originalSelect = chainable.select;
  chainable.select = vi.fn((...args: unknown[]) => {
    const chain = { ...chainable };
    // Make the chain itself thenable
    (chain as Record<string, unknown>).then = (resolve: (val: unknown) => void) => {
      resolve(result);
    };
    for (const method of methods) {
      if (method === "select") continue;
      (chain as Record<string, unknown>)[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue(result);
    return chain;
  });

  const client = {
    from: vi.fn().mockReturnValue(chainable),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  };

  return client;
}

/**
 * Creates a mock client where `from()` returns different results based on table name.
 */
export function createMockSupabaseClientMultiTable(
  tables: Record<string, { data?: unknown; error?: { message: string } | null; count?: number | null }>
) {
  const buildChain = (tableResult: { data?: unknown; error?: { message: string } | null; count?: number | null }) => {
    const result = {
      data: tableResult.data ?? null,
      error: tableResult.error ?? null,
      count: tableResult.count ?? null,
    };

    const chain: Record<string, unknown> = {};
    const methods = [
      "select", "insert", "update", "delete", "upsert",
      "eq", "neq", "gt", "gte", "lt", "lte",
      "like", "ilike", "is", "in", "not",
      "or", "and", "filter",
      "order", "limit", "range",
      "single", "maybeSingle",
      "textSearch", "match", "contains", "containedBy",
    ];

    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }

    chain.then = (resolve: (val: unknown) => void) => resolve(result);
    chain.single = vi.fn().mockResolvedValue(result);

    return chain;
  };

  const client = {
    from: vi.fn((table: string) => {
      const tableConfig = tables[table] ?? { data: [], error: null };
      return buildChain(tableConfig);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  };

  return client;
}
