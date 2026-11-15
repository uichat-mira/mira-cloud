import test from "node:test";
import assert from "node:assert/strict";
import {
  createProbe, applyStream, completeGeneration, abortGeneration,
  requestStageAcceptance, proposeFieldEdit,
} from "./protocol-gate.mjs";

const truth = { rules: { intervalHours: 1, importantOnly: true } };
const j = (seq, path, value, op = "add") => ({
  generationId: "gen-json-1", seq, payload: { op, path, value },
});
const a = (seq, payload) => ({ generationId: "gen-a2ui-1", seq, payload: { version: "1.0", ...payload } });

function jsonSurface() {
  let s = createProbe("json-render", "gen-json-1", truth);
  for (const event of [
    j(1, "/root", "root"),
    j(2, "/elements/root", { type: "Column", props: {}, children: ["frequency", "important"] }),
    j(3, "/elements/frequency", { type: "NumberField", props: { label: "检查间隔", value: { $bindState: "/rules/intervalHours" } }, children: [] }),
    j(4, "/elements/important", { type: "ToggleField", props: { label: "仅重要结果通知", value: { $bindState: "/rules/importantOnly" } }, children: [] }),
    j(5, "/state", truth),
  ]) s = applyStream(s, event);
  return s;
}
function a2uiSurface() {
  let s = createProbe("a2ui", "gen-a2ui-1", truth);
  s = applyStream(s, a(1, { createSurface: {
    surfaceId: "stage-1", dataModel: truth,
    components: [
      { id: "root", component: "Column", children: ["frequency", "important"] },
      { id: "frequency", component: "NumberField", label: "检查间隔", value: { "@path": "/rules/intervalHours" } },
    ],
  }}));
  s = applyStream(s, a(2, { updateComponents: {
    surfaceId: "stage-1",
    components: [{ id: "important", component: "ToggleField", label: "仅重要结果通知", value: { "@path": "/rules/importantOnly" } }],
  }}));
  return s;
}
test("json-render patch subset: incremental completion", () => assert.equal(completeGeneration(jsonSurface()).status, "complete"));
test("A2UI v1 envelope subset: component updates", () => assert.equal(completeGeneration(a2uiSurface()).status, "complete"));
test("missing children block completion", () => {
  let s = createProbe("json-render", "gen-json-1", truth);
  s = applyStream(s, j(1, "/root", "root"));
  s = applyStream(s, j(2, "/elements/root", { type: "Column", props: {}, children: ["missing"] }));
  assert.equal(completeGeneration(s).status, "blocked");
});
test("generation id and monotonic event sequence", () => {
  const s = jsonSurface();
  assert.throws(() => applyStream(s, j(7, "/root", "root")), /out-of-order/);
  assert.throws(() => applyStream(s, { ...j(6, "/root", "root"), generationId: "other" }), /stale/);
});
test("deny patches outside UI surface and prototype pollution", () => {
  const s = jsonSurface();
  assert.throws(() => applyStream(s, j(6, "/auth/role", "admin")), /outside approved/);
  assert.throws(() => applyStream(s, j(6, "/elements/__proto__", {})), /unsafe pointer/);
});
test("deny unknown components and model-defined agent actions", () => {
  const s = jsonSurface();
  const injected = applyStream(s, j(6, "/elements/important", { type: "Iframe", props: { url: "https://example.com" }, children: [] }, "replace"));
  assert.equal(completeGeneration(injected).status, "blocked");
  const injectedAction = applyStream(s, j(6, "/elements/important", {
    type: "ToggleField", props: { label: "通知", value: { $bindState: "/rules/importantOnly" } },
    children: [], on: { press: { action: "sendMail" } },
  }, "replace"));
  assert.equal(completeGeneration(injectedAction).status, "blocked");
});
test("Text must carry a string, not arbitrary HTML/JS objects", () => {
  const s = jsonSurface();
  const injected = applyStream(s, j(6, "/elements/important", { type: "Text", props: { text: { dangerouslySetInnerHTML: "<script>" } }, children: [] }, "replace"));
  assert.equal(completeGeneration(injected).status, "blocked");
});
test("agent presentation model drift blocks completion", () => {
  const s = applyStream(jsonSurface(), j(6, "/state", { rules: { intervalHours: 0, importantOnly: false } }, "replace"));
  assert.equal(completeGeneration(s).status, "blocked");
});
test("stage acceptance must be host-confirmed, consistent, and saved", () => {
  const s = completeGeneration(jsonSurface());
  const gate = { userConfirmed: true, semanticAgreementVerified: true, commentsClosed: true, savedRevisionId: "v1", expectedRevisionId: "v1" };
  assert.equal(requestStageAcceptance(s, gate), true);
  assert.equal(requestStageAcceptance(s, { ...gate, commentsClosed: false }), false);
  assert.equal(requestStageAcceptance(s, { ...gate, userConfirmed: false }), false);
  assert.equal(requestStageAcceptance(s, { ...gate, semanticAgreementVerified: false }), false);
  assert.equal(requestStageAcceptance(s, { ...gate, expectedRevisionId: "v2" }), false);
});
test("aborted stream never becomes accepted", () => {
  const s = abortGeneration(jsonSurface());
  assert.equal(requestStageAcceptance(s, { userConfirmed: true, semanticAgreementVerified: true, commentsClosed: true, savedRevisionId: "v1", expectedRevisionId: "v1" }), false);
});
test("field editing is a proposal, not an implicit authoritative write", () => {
  const s = completeGeneration(a2uiSurface());
  const p = proposeFieldEdit(s, "/rules/intervalHours", 2);
  assert.equal(p.requiresServerPersistence, true);
  assert.equal(s.truth.rules.intervalHours, 1);
  assert.throws(() => proposeFieldEdit(s, "/rules/intervalHours", 0), /at least one hour/);
  assert.throws(() => proposeFieldEdit(s, "/auth/admin", true), /unapproved/);
});
test("A2UI unknown or destructive surfaces rejected", () => {
  const s = a2uiSurface();
  assert.throws(() => applyStream(s, a(3, { updateComponents: { surfaceId: "other", components: [] } })), /unknown surface/);
  assert.throws(() => applyStream(s, a(3, { deleteSurface: { surfaceId: "stage-1" } })), /cannot destroy/);
});
test("A2UI duplicate components rejected", () => {
  const s = createProbe("a2ui", "gen-a2ui-1", truth);
  assert.throws(() => applyStream(s, a(1, { createSurface: { surfaceId: "stage-1", components: [
    { id: "root", component: "Column", children: [] },
    { id: "root", component: "Text", text: "dup" },
  ], dataModel: truth } })), /duplicate/);
});
test("A2UI data update does not overwrite authoritative draft", () => {
  const s = a2uiSurface();
  const next = applyStream(s, a(3, { updateDataModel: { surfaceId: "stage-1", path: "/rules/intervalHours", value: 0 } }));
  assert.equal(next.truth.rules.intervalHours, 1);
  assert.equal(completeGeneration(next).status, "blocked");
});
