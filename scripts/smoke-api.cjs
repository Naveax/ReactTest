const http = require("http");
const https = require("https");

const base = (process.env.API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const badCode = "BAD-CODE-001";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;

    const req = transport.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": String(payload.length)
            }
          : {}
      },
      (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (chunks += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = chunks ? JSON.parse(chunks) : null;
          } catch (_err) {
            json = null;
          }
          resolve({
            status: res.statusCode || 0,
            text: chunks,
            json
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error(`Timeout: ${method} ${path}`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeDate() {
  return new Date().toISOString().slice(0, 10);
}

async function run() {
  console.log(`[smoke] API base: ${base}`);

  const health = await request("GET", "/health");
  expect(health.status === 200, `health expected 200, got ${health.status}`);
  expect(health.json && health.json.status === "ok", "health status must be ok");
  console.log("[smoke] health ok");

  const createPayload = {
    full_name: "Smoke Test User",
    course_name: "Smoke Certification",
    score: 89,
    issued_at: makeDate(),
    language: "English",
    level: "B2"
  };

  const created = await request("POST", "/api/certificates", createPayload);
  expect(created.status === 201, `create expected 201, got ${created.status}: ${created.text}`);
  expect(created.json && created.json.certificate_id, "create response missing certificate_id");
  expect(created.json && created.json.verification_code, "create response missing verification_code");
  const certId = created.json.certificate_id;
  const verifyCode = created.json.verification_code;
  console.log(`[smoke] create ok: ${certId}`);

  const fetched = await request("GET", `/api/certificates/${certId}`);
  expect(fetched.status === 200, `get by id expected 200, got ${fetched.status}`);
  expect(fetched.json && fetched.json.certificate_id === certId, "get by id mismatch");
  console.log("[smoke] get by id ok");

  const verified = await request("GET", `/api/certificates/verify?code=${encodeURIComponent(verifyCode)}`);
  expect(verified.status === 200, `verify expected 200, got ${verified.status}`);
  expect(verified.json && verified.json.valid === true, "verify expected valid=true");
  console.log("[smoke] verify(valid) ok");

  const invalid = await request("GET", `/api/certificates/verify?code=${encodeURIComponent(badCode)}`);
  expect(invalid.status === 200, `invalid verify expected 200, got ${invalid.status}`);
  expect(invalid.json && invalid.json.valid === false, "invalid verify expected valid=false");
  console.log("[smoke] verify(invalid) ok");

  const invalidCreate = await request("POST", "/api/certificates", {
    full_name: "x",
    course_name: "y",
    score: 101,
    issued_at: makeDate(),
    language: "E",
    level: ""
  });
  expect(invalidCreate.status === 422, `invalid create expected 422, got ${invalidCreate.status}`);
  console.log("[smoke] validation(422) ok");

  const notFound = await request("GET", "/api/certificates/cert_not_existing_123");
  expect(notFound.status === 404, `missing cert expected 404, got ${notFound.status}`);
  console.log("[smoke] not-found(404) ok");

  console.log("[smoke] all checks passed");
}

run().catch((err) => {
  console.error(`[smoke] FAILED: ${err.message}`);
  process.exit(1);
});
