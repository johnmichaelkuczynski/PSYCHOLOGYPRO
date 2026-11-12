import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LLMService } from "../server/services/llm-service";
import { StreamingService } from "../server/services/streaming-service";
import LiveOutputPanel from "../client/src/components/live-output-panel";

// These tests never call a provider or database.
process.env.DEEPSEEK_API_KEY = "test-provider-key";
delete process.env.XAI_API_KEY;
process.env.XAI_MODEL = "grok-4.20-non-reasoning-latest";
const encoder = new TextEncoder();
const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

test("the live window renders partial output with resize and collapse controls", () => {
  const html = renderToStaticMarkup(createElement(LiveOutputPanel, {
    content: "first word",
    stage: "Summary",
    status: "streaming",
  }));
  assert.match(html, /first word/);
  assert.match(html, /resize:both/);
  assert.match(html, /Collapse live output/);
  assert.match(html, /Hide live output without stopping analysis/);
});

test("provider words are yielded before the response finishes, including fragmented SSE", async t => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(value) { controller = value; },
  });
  t.mock.method(globalThis, "fetch", async () => new Response(body));
  const chunks: string[] = [];
  const iterator = new LLMService().streamResponse("zhi3", [{ role: "user", content: "test" }], chunk => chunks.push(chunk));
  const first = iterator.next();
  controller.enqueue(encoder.encode('data:{"choices":[{"delta":{"content":"hel'));
  controller.enqueue(encoder.encode('lo "}}]}\n\n'));
  assert.deepEqual(await first, { value: "hello ", done: false });
  assert.deepEqual(chunks, ["hello "]);
  controller.enqueue(encoder.encode(event("world")));
  assert.deepEqual(await iterator.next(), { value: "world", done: false });
  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
  controller.close();
  assert.equal((await iterator.next()).done, true);
});

test("ZHI 5 uses the connected xAI proxy without requiring a local API key", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Direct fetch must not be used"); });
  const service = new LLMService();
  let request: any;
  (service as any).connectors = {
    proxy: async (connector: string, path: string, options: any) => {
      request = { connector, path, body: JSON.parse(options.body), headers: options.headers };
      return new Response(event("Connected") + "data: [DONE]\n\n");
    },
  };
  const words: string[] = [];
  for await (const chunk of service.streamResponse("zhi5", [{ role: "user", content: "test" }])) words.push(chunk);
  assert.deepEqual(words, ["Connected"]);
  assert.equal(request.connector, "xai");
  assert.equal(request.path, "/v1/chat/completions");
  assert.equal(request.body.stream, true);
  assert.equal(request.body.model, "grok-4.20-non-reasoning-latest");
  assert.equal(request.headers.Authorization, undefined);
});

test("provider errors inside an HTTP 200 stream are reported immediately", async t => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response('data: {"error":{"message":"Provider rejected the model"}}\n\n')
  );
  await assert.rejects(async () => {
    for await (const _ of new LLMService().streamResponse("zhi3", [{ role: "user", content: "test" }])) {}
  }, /Provider rejected the model/);
});

test("a display can reconnect and receive the latest cumulative words", () => {
  const service = new StreamingService({} as any, {} as any);
  const first: any[] = [];
  const unsubscribe = service.streamAnalysis("reconnect-test", data => first.push(data));
  (service as any).broadcastToStream("reconnect-test", { type: "raw_stream", batchNumber: 1, rawContent: "one " });
  unsubscribe();
  (service as any).broadcastToStream("reconnect-test", { type: "raw_stream", batchNumber: 1, rawContent: "one two" });
  const reconnected: any[] = [];
  const disconnect = service.streamAnalysis("reconnect-test", data => reconnected.push(data));
  assert.equal(first.length, 1);
  assert.equal(reconnected[0].rawContent, "one two");
  disconnect();
});

test("early words replay to a late subscriber, before completion, without duplicate generation", async () => {
  const analysis: any = {
    id: "stream-test",
    status: "pending",
    type: "comprehensive-psychopathological",
    llmProvider: "zhi3",
    textContent: "A test passage.",
    results: null,
  };
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let firstWords!: () => void;
  const firstWordsReceived = new Promise<void>(resolve => { firstWords = resolve; });
  let providerCalls = 0;
  const llm: any = {
    createScaffoldedAnalysisPrompt: () => "test prompt",
    getComprehensivePsychopathologicalQuestions: () => ["Question one", "Question two"],
    async *streamResponse(_provider: string, _messages: unknown, onChunk: (chunk: string) => void) {
      providerCalls++;
      onChunk("first ");
      yield "first ";
      if (providerCalls === 1) {
        firstWords();
        await gate;
      }
      onChunk("second");
      yield "second";
    },
  };
  const storage: any = {
    getAnalysis: async () => analysis,
    getAnalysisSetting: async () => undefined,
    updateAnalysisStatus: async (_id: string, status: string) => { analysis.status = status; },
    updateAnalysisResults: async (_id: string, results: unknown) => { analysis.results = results; },
  };
  const service = new StreamingService(llm, storage);
  (service as any).ensureHistoryAnchor = async () => {};
  const events: any[] = [];
  const running = service.startAnalysis(analysis.id);
  await firstWordsReceived;
  const disconnect = service.streamAnalysis(analysis.id, data => events.push(data));
  await service.startAnalysis(analysis.id);
  assert.equal(providerCalls, 1);
  assert.equal(events[0].type, "summary");
  assert.equal(events[0].content, "first ");
  assert.equal(events.some(data => data.type === "complete"), false);
  release();
  await running;
  const partialBatch = events.findIndex(data => data.type === "raw_stream" && data.rawContent === "first ");
  const finishedBatch = events.findIndex(data => data.type === "batch_complete");
  assert.ok(partialBatch >= 0 && partialBatch < finishedBatch);
  assert.equal(events.at(-1).type, "complete");
  assert.equal(analysis.status, "completed");
  disconnect();
});
