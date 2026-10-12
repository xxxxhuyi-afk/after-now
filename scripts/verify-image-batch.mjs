import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/lab/image-canvas/image-batch.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { runImageBatch } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

for (const count of [1, 2, 3, 4]) {
  test(`generates ${count} distinct results in order, with no concurrent requests`, async () => {
    let active = 0, calls = 0;
    const images = [], progress = [];
    const result = await runImageBatch({
      count, shouldStop: () => false, onProgress: (index) => progress.push(index),
      generate: async () => { assert.equal(active, 0); active++; await new Promise((resolve) => setTimeout(resolve, 5)); active--; return `image-${++calls}`; },
      onResult: (image, index) => images.push([image, index]),
    });
    assert.deepEqual(result, { completed: count, stopped: false, error: null });
    assert.equal(new Set(images.map(([image]) => image)).size, count);
    assert.deepEqual(progress, Array.from({ length: count }, (_, index) => index));
  });
}

test("quota or provider failure retains completed images and stops without retry", async () => {
  let calls = 0;
  const images = [];
  const result = await runImageBatch({ count: 4, shouldStop: () => false, onProgress: () => {},
    generate: async () => { if (++calls === 2) throw new Error("quota exhausted"); return "first-image"; },
    onResult: (image) => images.push(image),
  });
  assert.equal(calls, 2); assert.deepEqual(images, ["first-image"]);
  assert.deepEqual(result, { completed: 1, stopped: false, error: "quota exhausted" });
});

test("stop during current request keeps its result and never submits the next", async () => {
  let stop = false, calls = 0;
  const images = [];
  const result = await runImageBatch({ count: 4, shouldStop: () => stop, onProgress: () => {},
    generate: async () => { calls++; stop = true; return "completed-image"; }, onResult: (image) => images.push(image),
  });
  assert.equal(calls, 1); assert.deepEqual(images, ["completed-image"]);
  assert.deepEqual(result, { completed: 1, stopped: true, error: null });
});

test("invalid count makes no provider request", async () => {
  let calls = 0;
  await assert.rejects(runImageBatch({ count: 5, shouldStop: () => false, onProgress: () => {}, generate: async () => ++calls, onResult: () => {} }));
  assert.equal(calls, 0);
});

test("first request failure leaves no completed images", async () => {
  const result = await runImageBatch({ count: 4, shouldStop: () => false, onProgress: () => {}, generate: async () => { throw new Error("offline"); }, onResult: () => assert.fail("no image should be added") });
  assert.equal(result.completed, 0); assert.equal(result.error, "offline");
});
