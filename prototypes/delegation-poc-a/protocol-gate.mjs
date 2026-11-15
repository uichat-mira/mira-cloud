export function createProbe(kind, generationId, truth) {
  if (!["json-render", "a2ui"].includes(kind) || !/^[a-z0-9-]{3,48}$/.test(generationId)) throw Error("invalid probe");
  return { kind, generationId, seq: 0, status: "streaming", surfaceId: null, root: null, elements: {}, model: {}, truth: JSON.parse(JSON.stringify(truth)), issues: [] };
}

export function validPointer(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 180) throw Error("invalid pointer");
  const parts = path.slice(1).split("/").map(x => x.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (parts.some(x => !x || ["__proto__", "constructor", "prototype"].includes(x))) throw Error("unsafe pointer");
  return parts;
}

export function setPointer(target, path, value) {
  const parts = validPointer(path);
  let obj = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!Object.hasOwn(obj, p) || typeof obj[p] !== "object" || obj[p] === null || Array.isArray(obj[p])) throw Error("missing patch parent");
    obj = obj[p];
  }
  obj[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));
}

export function nodeFromA2ui(component) {
  if (!component || typeof component !== "object" || Array.isArray(component)) throw Error("invalid component");
  const { id, component: type, children = [], ...props } = component;
  return { id, type, children, props };
}

export function applyStream(state, event) {
  if (!event || event.generationId !== state.generationId || event.seq !== state.seq + 1) throw Error("stale or out-of-order stream event");
  if (state.status !== "streaming" || event.seq > 64 || JSON.stringify(event).length > 8192) throw Error("stream not writable or over limit");
  const next = JSON.parse(JSON.stringify(state));
  if (next.kind === "json-render") {
    const p = event.payload;
    if (!p || !["add", "replace"].includes(p.op)) throw Error("unsupported patch op");
    const parts = validPointer(p.path);
    if (parts[0] === "root" && parts.length === 1) next.root = p.value;
    else if (parts[0] === "elements" && parts.length === 2) {
      if (!/^[a-z][a-z0-9_-]{0,39}$/.test(parts[1])) throw Error("invalid element id");
      next.elements[parts[1]] = JSON.parse(JSON.stringify(p.value));
    } else if (parts[0] === "state" && parts.length === 1) next.model = JSON.parse(JSON.stringify(p.value));
    else throw Error("patch path outside approved UI surface");
  } else {
    const p = event.payload;
    if (!p || p.version !== "1.0") throw Error("unsupported A2UI version");
    const kinds = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"].filter(k => Object.hasOwn(p, k));
    if (kinds.length !== 1) throw Error("invalid A2UI envelope");
    const kind = kinds[0], body = p[kind];
    if (!body || typeof body.surfaceId !== "string") throw Error("missing surface id");
    if (kind === "createSurface") {
      if (next.surfaceId !== null) throw Error("duplicate surface");
      next.surfaceId = body.surfaceId;
      next.root = "root";
      next.model = JSON.parse(JSON.stringify(body.dataModel ?? {}));
      for (const c of body.components ?? []) {
        const n = nodeFromA2ui(c);
        if (Object.hasOwn(next.elements, n.id)) throw Error("duplicate component id");
        next.elements[n.id] = n;
      }
    } else {
      if (next.surfaceId !== body.surfaceId) throw Error("unknown surface");
      if (kind === "deleteSurface") throw Error("agent cannot destroy active review canvas");
      if (kind === "updateComponents") {
        if (!Array.isArray(body.components)) throw Error("missing components");
        for (const c of body.components) {
          const n = nodeFromA2ui(c);
          next.elements[n.id] = n;
        }
      } else if (kind === "updateDataModel") {
        if (!Object.hasOwn(body, "value")) throw Error("missing data model value");
        if (body.path === undefined || body.path === "/") next.model = JSON.parse(JSON.stringify(body.value));
        else {
          const parts = validPointer(body.path);
          if (parts.length !== 2 || parts[0] !== "rules") throw Error("unapproved model path");
          setPointer(next.model, body.path, body.value);
        }
      }
    }
  }
  next.seq = event.seq;
  return next;
}

export function readBinding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || !["$state", "$bindState", "@path"].includes(keys[0])) throw Error("dynamic expression not permitted");
  if (!["/rules/intervalHours", "/rules/importantOnly"].includes(value[keys[0]])) throw Error("binding outside business projection");
  return value[keys[0]];
}

export function verifyTree(state) {
  const issues = [], nodes = state.elements, ids = Object.keys(nodes);
  if (ids.length > 24) issues.push("component limit exceeded");
  if (!state.root || !Object.hasOwn(nodes, state.root)) issues.push("root absent");
  const visited = new Set(), walking = new Set();
  function walk(id, depth = 0) {
    if (depth > 8) { issues.push("component depth exceeded"); return; }
    if (walking.has(id)) { issues.push("cyclic tree"); return; }
    const node = nodes[id];
    if (!node) { issues.push("missing child: " + id); return; }
    if (visited.has(id)) return;
    walking.add(id);
    if (!["Column", "Text", "NumberField", "ToggleField"].includes(node.type)) issues.push("unapproved component: " + node.type);
    if (!Array.isArray(node.children) || !node.props || typeof node.props !== "object") issues.push("invalid component shape: " + id);
    else {
      if (node.on || node.actions || Object.keys(node.props).some(x => !["label","value","text"].includes(x))) issues.push("unapproved action or prop: " + id);
      if (node.type === "NumberField" || node.type === "ToggleField") {
        try {
          const bound = readBinding(node.props.value);
          const expected = node.type === "NumberField" ? "/rules/intervalHours" : "/rules/importantOnly";
          if (bound !== expected || typeof node.props.label !== "string") issues.push("field binding mismatch: " + id);
        } catch (e) { issues.push(e.message); }
      }
      for (const child of node.children) walk(child, depth + 1);
    }
    walking.delete(id); visited.add(id);
  }
  if (state.root && Object.hasOwn(nodes, state.root)) walk(state.root);
  if (ids.some(id => !/^[a-z][a-z0-9_-]{0,39}$/.test(id))) issues.push("invalid semantic component id");
  if (ids.some(id => !visited.has(id))) issues.push("orphan component");
  const model = state.model?.rules, truth = state.truth?.rules;
  if (!model || !truth || typeof model.intervalHours !== "number" || typeof model.importantOnly !== "boolean" ||
      !Number.isInteger(model.intervalHours) || model.intervalHours < 1 ||
      JSON.stringify(model) !== JSON.stringify(truth) ||
      Object.keys(state.model).some(k => k !== "rules")) issues.push("presentation model differs from authoritative draft");
  return [...new Set(issues)];
}

export function completeGeneration(state) {
  if (state.status !== "streaming") throw Error("not generating");
  const next = JSON.parse(JSON.stringify(state));
  next.issues = verifyTree(next);
  next.status = next.issues.length ? "blocked" : "complete";
  return next;
}

export function abortGeneration(state) {
  if (state.status !== "streaming") throw Error("not generating");
  return { ...state, status: "aborted", issues: ["generation was aborted"] };
}

export function requestStageAcceptance(state, gate) {
  return state.status === "complete" && state.issues.length === 0 &&
    gate?.userConfirmed === true && gate?.semanticAgreementVerified === true &&
    gate?.commentsClosed === true && gate?.savedRevisionId === gate?.expectedRevisionId &&
    typeof gate?.savedRevisionId === "string";
}

export function proposeFieldEdit(state, path, value) {
  if (state.status !== "complete") throw Error("editing disabled during generation");
  if (!["/rules/intervalHours", "/rules/importantOnly"].includes(path)) throw Error("unapproved draft field");
  const exists = Object.values(state.elements).some(n => {
    try { return readBinding(n?.props?.value) === path; } catch { return false; }
  });
  if (!exists) throw Error("field is not bound to UI");
  if (path.endsWith("intervalHours") && (!Number.isInteger(value) || value < 1)) throw Error("interval must be at least one hour");
  if (path.endsWith("importantOnly") && typeof value !== "boolean") throw Error("invalid importance flag");
  return { kind: "draft-edit-proposal", path, value, generationId: state.generationId, requiresServerPersistence: true };
}
