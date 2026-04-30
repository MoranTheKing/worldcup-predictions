const DEFAULT_LIVE_WINDOW_DAYS = 1;

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!isAuthorized(request, env)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    const mode = url.searchParams.get("mode") ?? "manual";
    const result = await runSyncPlan(mode, env);
    return Response.json(result);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledSync(event, env));
  },
};

export default worker;

async function runScheduledSync(event, env) {
  const scheduledAt = new Date(event.scheduledTime);
  const minute = scheduledAt.getUTCMinutes();
  const jobs = [];

  jobs.push(["live", () => callAppRoute(env, "/api/admin/bzzoiro/sync-live", buildLiveQuery(scheduledAt))]);

  if (minute % 5 === 0) {
    jobs.push(["odds-active-window", () => callAppRoute(env, "/api/admin/bzzoiro/sync-odds", buildLiveQuery(scheduledAt))]);
  }

  if (minute % 30 === 0) {
    jobs.push(["odds-full-1x2", () => callAppRoute(env, "/api/admin/bzzoiro/sync-odds")]);
  }

  if (minute % 15 === 0) {
    jobs.push(["predictions", () => callAppRoute(env, "/api/admin/bzzoiro/sync-predictions")]);
  }

  return runJobs(jobs);
}

async function runSyncPlan(mode, env) {
  if (mode === "live") {
    return runJobs([["live", () => callAppRoute(env, "/api/admin/bzzoiro/sync-live")]]);
  }

  if (mode === "odds") {
    return runJobs([["odds", () => callAppRoute(env, "/api/admin/bzzoiro/sync-odds")]]);
  }

  if (mode === "predictions") {
    return runJobs([["predictions", () => callAppRoute(env, "/api/admin/bzzoiro/sync-predictions")]]);
  }

  return runJobs([
    ["live", () => callAppRoute(env, "/api/admin/bzzoiro/sync-live")],
    ["odds-full-1x2", () => callAppRoute(env, "/api/admin/bzzoiro/sync-odds")],
    ["predictions", () => callAppRoute(env, "/api/admin/bzzoiro/sync-predictions")],
  ]);
}

async function runJobs(jobs) {
  const startedAt = new Date().toISOString();
  const results = [];

  for (const [name, run] of jobs) {
    try {
      results.push({ name, ok: true, response: await run() });
    } catch (error) {
      results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    ok: results.every((result) => result.ok),
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
}

async function callAppRoute(env, path, query = {}) {
  const baseUrl = normalizeBaseUrl(env.APP_BASE_URL);
  const secret = env.CRON_SECRET ?? env.TOURNAMENT_ADMIN_SECRET ?? env.ADMIN_API_SECRET;

  if (!baseUrl) {
    throw new Error("Missing APP_BASE_URL");
  }

  if (!secret) {
    throw new Error("Missing CRON_SECRET");
  }

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      accept: "application/json",
    },
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 500);
  }

  if (!response.ok) {
    throw new Error(`${url.pathname} failed with ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }

  return body;
}

function buildLiveQuery(now) {
  return {
    date_from: shiftDate(toDateKey(now), -DEFAULT_LIVE_WINDOW_DAYS),
    date_to: shiftDate(toDateKey(now), DEFAULT_LIVE_WINDOW_DAYS),
  };
}

function isAuthorized(request, env) {
  const secret = env.CRON_SECRET ?? env.TOURNAMENT_ADMIN_SECRET ?? env.ADMIN_API_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return constantTimeEqual(header, expected);
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function normalizeBaseUrl(value) {
  return value ? String(value).replace(/\/+$/, "") : "";
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}
