import { test } from "node:test";
import assert from "node:assert";
import { buildApp } from "../app.js";

test("POST /quotes with valid data redirects to /", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "POST",
        url: "/quotes",
        payload: {
            author: "Test Author",
            text: "This is a test quote",
        },
    });

    assert.strictEqual(response.statusCode, 302);
    assert.strictEqual(response.headers.location, "/");

    await app.close();
});

test("POST /quotes with empty text redirects to /", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "POST",
        url: "/quotes",
        payload: {
            author: "Test Author",
            text: "",
        },
    });

    assert.strictEqual(response.statusCode, 302);
    assert.strictEqual(response.headers.location, "/");

    await app.close();
});

test("POST /quotes with only whitespace text redirects to /", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "POST",
        url: "/quotes",
        payload: {
            author: "Test Author",
            text: "   ",
        },
    });

    assert.strictEqual(response.statusCode, 302);
    assert.strictEqual(response.headers.location, "/");

    await app.close();
});

test("POST /quotes without author uses 'anonymous'", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "POST",
        url: "/quotes",
        payload: {
            text: "Quote without author",
        },
    });

    assert.strictEqual(response.statusCode, 302);
    assert.strictEqual(response.headers.location, "/");

    await app.close();
});

test("POST /quotes with missing body redirects to /", async () => {
    const app = await buildApp();

    const response = await app.inject({
        method: "POST",
        url: "/quotes",
    });

    assert.strictEqual(response.statusCode, 302);
    assert.strictEqual(response.headers.location, "/");

    await app.close();
});
