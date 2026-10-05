import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import handler from "../../api/supabase-keepalive.js";
import {
  authorizeCronRequest,
  pingKeepaliveEndpoint,
  runKeepalive,
} from "./supabase-keepalive.mjs";

const originalFetch = globalThis.fetch;

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const okRow = () => jsonResponse(200, [{ id: 1 }]);

const missingTable = () =>
  jsonResponse(404, {
    code: "PGRST205",
    message: "Could not find the table 'public.keepalive_heartbeat' in the schema cache",
  });

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const mockResponse = () => {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("authorizeCronRequest", () => {
  it("fails closed when CRON_SECRET is missing", () => {
    const result = authorizeCronRequest("Bearer anything", {});
    assert.equal(result.ok, false);
    assert.equal(result.status, "not-configured");
  });

  it("rejects a missing or wrong bearer token", () => {
    const env = { CRON_SECRET: "correct-horse" };
    assert.equal(authorizeCronRequest(undefined, env).status, "unauthorized");
    assert.equal(authorizeCronRequest("Bearer other-horse", env).status, "unauthorized");
    assert.equal(authorizeCronRequest("correct-horse", env).status, "unauthorized");
  });

  it("accepts the exact bearer token", () => {
    const result = authorizeCronRequest("Bearer correct-horse", { CRON_SECRET: "correct-horse" });
    assert.equal(result.ok, true);
  });

  it("rejects a same-length token whose bytes differ", () => {
    const secret = "sécret";
    const expected = `Bearer ${secret}`;
    const result = authorizeCronRequest("a".repeat(expected.length), { CRON_SECRET: secret });
    assert.equal(result.status, "unauthorized");
  });
});

describe("runKeepalive", () => {
  it("reports not-configured without querying when credentials are absent", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return okRow();
    };

    const result = await runKeepalive({ env: {}, budgetMs: 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.status, "not-configured");
    assert.equal(calls, 0);
  });

  it("issues several cheap reads against the first table Postgres will answer", async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      if (String(url).includes("keepalive_heartbeat")) return missingTable();
      return okRow();
    };

    const result = await runKeepalive({
      env: {
        SUPABASE_URL: "https://example.supabase.co/",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_KEEPALIVE_TABLES: "keepalive_heartbeat,upc_cache",
        SUPABASE_KEEPALIVE_READS: "3",
      },
      source: "test",
      budgetMs: 5000,
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "alive");
    assert.equal(result.table, "upc_cache");
    assert.equal(result.reads, 3);
    assert.equal(urls.length, 4);
    assert.match(urls[0], /keepalive_heartbeat\?select=id&limit=1$/);
    assert.match(urls[1], /upc_cache\?select=upc&limit=1$/);
    assert.match(urls[3], /upc_cache\?select=upc&limit=1$/);
  });

  it("does not treat a schema-cache miss as database activity", async () => {
    globalThis.fetch = async () => missingTable();

    const result = await runKeepalive({
      env: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_KEEPALIVE_TABLES: "keepalive_heartbeat",
      },
      budgetMs: 1000,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "no-ping-target");
    assert.equal(result.reads, undefined);
  });

  it("reports partial when follow-up reads do not reach Postgres", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return okRow();
      return jsonResponse(500, { message: "upstream blew up" });
    };

    const result = await runKeepalive({
      env: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_KEEPALIVE_TABLES: "profiles",
        SUPABASE_KEEPALIVE_READS: "3",
      },
      budgetMs: 5000,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "partial");
    assert.equal(result.reads, 1);
    assert.ok(calls >= 2);
  });
});

describe("pingKeepaliveEndpoint", () => {
  it("fails closed without a url and secret", async () => {
    const result = await pingKeepaliveEndpoint({ fetchImpl: async () => okRow() });
    assert.equal(result.status, "not-configured");
    assert.equal(result.ok, false);
  });

  it("accepts a successful route payload and surfaces an auth failure", async () => {
    const ok = await pingKeepaliveEndpoint({
      url: "https://filmgraph.app/api/supabase-keepalive",
      secret: "s",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, status: "alive", reads: 3, detail: "awake" }),
      }),
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.reads, 3);

    const denied = await pingKeepaliveEndpoint({
      url: "https://filmgraph.app/api/supabase-keepalive",
      secret: "s",
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ ok: false, status: "unauthorized", error: "Unauthorized." }),
      }),
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.status, "unauthorized");
  });
});

describe("keepalive route", () => {
  it("rejects callers when CRON_SECRET is not configured", async () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return okRow();
    };

    try {
      const res = mockResponse();
      await handler({ method: "GET", headers: {} }, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.status, "not-configured");
      assert.equal(calls, 0);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it("rejects a bad bearer token even when database credentials exist", async () => {
    const previous = {
      CRON_SECRET: process.env.CRON_SECRET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    };
    process.env.CRON_SECRET = "expected";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return okRow();
    };

    try {
      const res = mockResponse();
      await handler({ method: "GET", headers: { authorization: "Bearer nope" } }, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.error, "Unauthorized.");
      assert.equal(calls, 0);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("returns the database result for an authorized caller", async () => {
    const previous = {
      CRON_SECRET: process.env.CRON_SECRET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_KEEPALIVE_TABLES: process.env.SUPABASE_KEEPALIVE_TABLES,
      SUPABASE_KEEPALIVE_READS: process.env.SUPABASE_KEEPALIVE_READS,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.CRON_SECRET = "expected";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_KEEPALIVE_TABLES = "keepalive_heartbeat";
    process.env.SUPABASE_KEEPALIVE_READS = "3";
    globalThis.fetch = async () => okRow();

    try {
      const res = mockResponse();
      await handler({ method: "POST", headers: { authorization: "Bearer expected" } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.reads, 3);
      assert.equal(res.body.table, "keepalive_heartbeat");
      assert.equal(res.headers["Cache-Control"], "no-store");
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe("supabase-keepalive script", () => {
  it("exits non-zero when no secrets are present", () => {
    const result = spawnSync(process.execPath, ["scripts/supabase-keepalive.mjs"], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: { PATH: process.env.PATH, CI: "true" },
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /not-configured/);
    assert.match(result.stderr, /CRON_SECRET/);
  });
});
