// Smoke test: start the real server and check the routes the page depends on.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 3099;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});

after(() => server && server.kill());

test("health endpoint reports running", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.strictEqual(res.status, 200);
  assert.match((await res.json()).status, /running/);
});

test("serves the single-page app", async () => {
  const res = await fetch(`${BASE}/`);
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /<html/i);
});

test("model proxies refuse requests without a key", async () => {
  for (const vendor of ["anthropic", "openai", "gemini"]) {
    const res = await fetch(`${BASE}/proxy/${vendor}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.ok(res.status >= 400 && res.status < 500, `${vendor} returned ${res.status}`);
  }
});
