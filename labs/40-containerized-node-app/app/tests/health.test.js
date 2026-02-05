import { test } from "node:test";
import assert from "node:assert";
import { buildApp } from "../app.js";

test("GET /health returns 200 OK", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "GET",
        url: "/health",
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.json().status, "ok");

    await app.close();
});

test("GET / returns 200 OK", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "GET",
        url: "/",
    });

    assert.strictEqual(response.statusCode, 200);

    await app.close();
});
