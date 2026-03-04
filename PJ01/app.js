const STORAGE_KEY = "mindforge_map_v1";
const PROJECTS_STORAGE_KEY = "mindforge_projects_v1";
const TEMPLATE_STORAGE_KEY = "mindforge_user_templates_v1";
const SUPABASE_CONFIG_KEY = "mindforge_supabase_config_v1";

const state = {
  canvasType: "grid",
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  mode: "select",
  connectFromNodeId: null,
  clipboard: null,
  pasteCount: 0,
  currentProjectId: null,
  projects: [],
  persistTimer: null,
  auth: {
    client: null,
    user: null,
    ready: false,
  },
};

const palette = [
  "#f6e8c3", "#ffd9c7", "#c7ebff", "#d7f7d1", "#fff0b3", "#ffd0ea", "#d5d6ff", "#fdd9a0",
  "#f97316", "#0ea5e9", "#22c55e", "#8b5cf6", "#ef4444", "#14b8a6", "#3b82f6", "#eab308",
  "#111827", "#334155", "#854d0e", "#9a3412",
];

const nodeLayer = document.getElementById("nodeLayer");
const edgeLayer = document.getElementById("edgeLayer");
const canvas = document.getElementById("canvas");

const addNodeBtn = document.getElementById("addNodeBtn");
const authStatus = document.getElementById("authStatus");
const configureBackendBtn = document.getElementById("configureBackendBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const projectSelect = document.getElementById("projectSelect");
const newProjectBtn = document.getElementById("newProjectBtn");
const renameProjectBtn = document.getElementById("renameProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");
const connectModeBtn = document.getElementById("connectModeBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const canvasTypeSelect = document.getElementById("canvasTypeSelect");
const templateGalleryBtn = document.getElementById("templateGalleryBtn");

const nodeTitleInput = document.getElementById("nodeTitleInput");
const nodeShapeSelect = document.getElementById("nodeShapeSelect");
const nodeFillInput = document.getElementById("nodeFillInput");
const nodeStrokeInput = document.getElementById("nodeStrokeInput");
const nodeTextColorInput = document.getElementById("nodeTextColorInput");
const nodeBorderWidthInput = document.getElementById("nodeBorderWidthInput");
const nodeIconInput = document.getElementById("nodeIconInput");
const nodePrioritySelect = document.getElementById("nodePrioritySelect");
const conditionalColorToggle = document.getElementById("conditionalColorToggle");
const nodeNoteInput = document.getElementById("nodeNoteInput");

const edgeLabelInput = document.getElementById("edgeLabelInput");
const edgeStyleSelect = document.getElementById("edgeStyleSelect");
const edgeWidthInput = document.getElementById("edgeWidthInput");
const edgeColorInput = document.getElementById("edgeColorInput");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportSvgBtn = document.getElementById("exportSvgBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const emailBtn = document.getElementById("emailBtn");
const importInput = document.getElementById("importInput");

const templateNameInput = document.getElementById("templateNameInput");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const templateDialog = document.getElementById("templateDialog");
const templateGrid = document.getElementById("templateGrid");
const closeTemplateDialogBtn = document.getElementById("closeTemplateDialogBtn");
const backendDialog = document.getElementById("backendDialog");
const supabaseUrlInput = document.getElementById("supabaseUrlInput");
const supabaseAnonKeyInput = document.getElementById("supabaseAnonKeyInput");
const saveBackendConfigBtn = document.getElementById("saveBackendConfigBtn");
const clearBackendConfigBtn = document.getElementById("clearBackendConfigBtn");
const closeBackendDialogBtn = document.getElementById("closeBackendDialogBtn");

const swatches = document.getElementById("swatches");
const marquee = document.createElement("div");
marquee.style.position = "absolute";
marquee.style.border = "1px dashed #0ea5e9";
marquee.style.background = "rgba(14, 165, 233, 0.12)";
marquee.style.pointerEvents = "none";
marquee.style.display = "none";
marquee.style.zIndex = "9";
canvas.appendChild(marquee);

function storageGet(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode / file restrictions)
  }
}

function loadSupabaseConfig() {
  const raw = storageGet(SUPABASE_CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.url || !parsed?.anonKey) return null;
    return { url: String(parsed.url), anonKey: String(parsed.anonKey) };
  } catch {
    return null;
  }
}

function saveSupabaseConfig(config) {
  storageSet(SUPABASE_CONFIG_KEY, JSON.stringify(config));
}

function clearSupabaseConfig() {
  try {
    window.localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } catch {
    // ignore
  }
}

function isRemoteMode() {
  return Boolean(state.auth.client && state.auth.user);
}

function updateAuthUI() {
  if (isRemoteMode()) {
    authStatus.textContent = `Conectado: ${state.auth.user.email || "usuario"}`;
    loginBtn.disabled = true;
    logoutBtn.disabled = false;
  } else if (state.auth.client) {
    authStatus.textContent = "Supabase configurado (sin sesión)";
    loginBtn.disabled = false;
    logoutBtn.disabled = true;
  } else {
    authStatus.textContent = "Modo local";
    loginBtn.disabled = true;
    logoutBtn.disabled = true;
  }
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultNode(partial = {}) {
  return {
    id: uid("node"),
    title: "Nueva idea",
    x: 220,
    y: 120,
    w: 140,
    h: 64,
    shape: "rectangle",
    fill: "#f6e8c3",
    stroke: "#2d2d2d",
    textColor: "#1e1d1a",
    borderWidth: 2,
    note: "",
    icon: "",
    priority: "normal",
    conditionalColor: "off",
    level: 1,
    parentId: null,
    childCount: 0,
    ...partial,
  };
}

function defaultEdge(partial = {}) {
  return {
    id: uid("edge"),
    from: "",
    to: "",
    label: "",
    style: "solid",
    color: "#444444",
    width: 2,
    ...partial,
  };
}

function setShapeDimensions(node) {
  if (node.shape === "square") {
    node.w = 92;
    node.h = 92;
  } else if (node.shape === "circle") {
    node.w = 96;
    node.h = 96;
  } else if (node.shape === "line") {
    node.w = 150;
    node.h = 18;
  } else {
    node.w = 140;
    node.h = 64;
  }
}

function getSelectedNode() {
  syncPrimarySelection();
  return state.nodes.find((n) => n.id === state.selectedNodeId) || null;
}

function getSelectedEdge() {
  syncPrimarySelection();
  return state.edges.find((e) => e.id === state.selectedEdgeId) || null;
}

function getNodeById(id) {
  return state.nodes.find((n) => n.id === id) || null;
}

function syncPrimarySelection() {
  state.selectedNodeIds = state.selectedNodeIds.filter((id) => state.nodes.some((n) => n.id === id));
  state.selectedEdgeIds = state.selectedEdgeIds.filter((id) => state.edges.some((e) => e.id === id));
  state.selectedNodeId = state.selectedNodeIds.length === 1 ? state.selectedNodeIds[0] : null;
  state.selectedEdgeId = state.selectedEdgeIds.length === 1 ? state.selectedEdgeIds[0] : null;
}

function clearSelection() {
  state.selectedNodeIds = [];
  state.selectedEdgeIds = [];
  state.selectedNodeId = null;
  state.selectedEdgeId = null;
}

function setSingleNodeSelection(nodeId) {
  state.selectedNodeIds = nodeId ? [nodeId] : [];
  state.selectedEdgeIds = [];
  syncPrimarySelection();
}

function setSingleEdgeSelection(edgeId) {
  state.selectedEdgeIds = edgeId ? [edgeId] : [];
  state.selectedNodeIds = [];
  syncPrimarySelection();
}

function toggleNodeSelection(nodeId) {
  const has = state.selectedNodeIds.includes(nodeId);
  if (has) {
    state.selectedNodeIds = state.selectedNodeIds.filter((id) => id !== nodeId);
  } else {
    state.selectedNodeIds.push(nodeId);
  }
  state.selectedEdgeIds = [];
  syncPrimarySelection();
}

function isFormField(el) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

function isPrintableKey(event) {
  if (event.key.length !== 1) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return true;
}

function getChildrenOf(nodeId) {
  return state.edges
    .filter((edge) => edge.from === nodeId)
    .map((edge) => getNodeById(edge.to))
    .filter(Boolean);
}

function addChildNode(parentNodeId) {
  const parent = getNodeById(parentNodeId);
  if (!parent) return null;
  const existingChildren = getChildrenOf(parent.id);
  const childLevel = Number(parent.level || 1) + 1;
  const childShape = childLevel >= 3 ? "line" : "rectangle";

  const node = defaultNode({
    title: childLevel >= 3 ? "Subtarea" : "Nueva idea",
    x: parent.x + 210,
    y: parent.y + existingChildren.length * 90,
    shape: childShape,
    level: childLevel,
    parentId: parent.id,
  });
  setShapeDimensions(node);
  parent.childCount = (parent.childCount || 0) + 1;
  state.nodes.push(node);
  state.edges.push(defaultEdge({ from: parent.id, to: node.id, style: "solid" }));
  return node;
}

function startInlineNodeEdit(nodeId, container) {
  const node = getNodeById(nodeId);
  if (!node || !container) return;

  const titleEl = container.querySelector(".node-title");
  if (!(titleEl instanceof HTMLElement)) return;

  titleEl.contentEditable = "true";
  titleEl.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const commit = () => {
    node.title = titleEl.textContent?.trim() || "Nueva idea";
    titleEl.contentEditable = "false";
    titleEl.removeEventListener("blur", commit);
    titleEl.removeEventListener("keydown", onKeyDown);
    refreshInspector();
    render();
    persist();
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      titleEl.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      titleEl.textContent = node.title;
      titleEl.blur();
    }
  };

  titleEl.addEventListener("blur", commit);
  titleEl.addEventListener("keydown", onKeyDown);
}

function escapeXml(v) {
  return String(v)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split("\"").join("&quot;")
    .split("'").join("&#039;");
}

function getVisualFill(node) {
  if (node.conditionalColor !== "on") return node.fill;
  if (node.priority === "critical") return "#fca5a5";
  if (node.priority === "high") return "#fde68a";
  return node.fill;
}

function getCenter(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function getEdgeStrokeDash(style) {
  if (style === "dashed") return "8 6";
  if (style === "dotted") return "2 5";
  return "";
}

function renderSwatches() {
  swatches.innerHTML = "";
  palette.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.type = "button";
    btn.style.backgroundColor = color;
    btn.title = color;
    btn.addEventListener("click", () => {
      const node = getSelectedNode();
      const edge = getSelectedEdge();
      if (node) {
        node.fill = color;
        nodeFillInput.value = color;
      }
      if (edge) {
        edge.color = color;
        edgeColorInput.value = color;
      }
      render();
      persist();
    });
    swatches.appendChild(btn);
  });
}

function renderNodes() {
  nodeLayer.innerHTML = "";
  for (const node of state.nodes) {
    const el = document.createElement("div");
    el.className = `node ${node.shape}`;
    if (state.selectedNodeIds.includes(node.id)) el.classList.add("selected");
    if (state.mode === "connect" && node.id === state.connectFromNodeId) {
      el.classList.add("selected");
    }
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.w}px`;
    el.style.height = `${node.h}px`;
    el.style.backgroundColor = getVisualFill(node);
    el.style.borderColor = node.stroke;
    el.style.borderWidth = `${node.borderWidth}px`;
    el.style.color = node.textColor;

    const icon = document.createElement("span");
    icon.className = "node-icon";
    icon.textContent = node.icon || "";

    const title = document.createElement("span");
    title.className = "node-title";
    title.textContent = node.title;
    title.spellcheck = false;

    el.appendChild(icon);
    el.appendChild(title);

    if (node.note?.trim()) {
      const badge = document.createElement("span");
      badge.className = "note-badge";
      badge.textContent = "📝";
      badge.title = node.note;
      el.appendChild(badge);
    }

    el.addEventListener("mousedown", (event) => handleNodeMouseDown(event, node.id));
    el.addEventListener("click", (event) => handleNodeClick(event, node.id));
    el.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      setSingleNodeSelection(node.id);
      refreshInspector();
      startInlineNodeEdit(node.id, el);
    });

    nodeLayer.appendChild(el);
  }
}

function renderEdges() {
  const rect = canvas.getBoundingClientRect();
  edgeLayer.setAttribute("width", `${rect.width}`);
  edgeLayer.setAttribute("height", `${rect.height}`);
  edgeLayer.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  edgeLayer.innerHTML = "";

  for (const edge of state.edges) {
    const fromNode = getNodeById(edge.from);
    const toNode = getNodeById(edge.to);
    if (!fromNode || !toNode) continue;

    const from = getCenter(fromNode);
    const to = getCenter(toNode);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${from.x}`);
    line.setAttribute("y1", `${from.y}`);
    line.setAttribute("x2", `${to.x}`);
    line.setAttribute("y2", `${to.y}`);
    line.setAttribute("stroke", edge.color);
    line.setAttribute("stroke-width", `${edge.width}`);
    const dash = getEdgeStrokeDash(edge.style);
    if (dash) line.setAttribute("stroke-dasharray", dash);
    line.setAttribute("class", `edge${state.selectedEdgeIds.includes(edge.id) ? " selected" : ""}`);
    line.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.shiftKey) {
        const has = state.selectedEdgeIds.includes(edge.id);
        state.selectedEdgeIds = has ? state.selectedEdgeIds.filter((id) => id !== edge.id) : [...state.selectedEdgeIds, edge.id];
        state.selectedNodeIds = [];
        syncPrimarySelection();
      } else {
        setSingleEdgeSelection(edge.id);
      }
      refreshInspector();
      render();
    });

    edgeLayer.appendChild(line);

    if (edge.label?.trim()) {
      const tx = (from.x + to.x) / 2;
      const ty = (from.y + to.y) / 2 - 6;
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", `${tx}`);
      label.setAttribute("y", `${ty}`);
      label.setAttribute("class", "edge-label");
      label.setAttribute("text-anchor", "middle");
      label.textContent = edge.label;
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        if (event.shiftKey) {
          const has = state.selectedEdgeIds.includes(edge.id);
          state.selectedEdgeIds = has ? state.selectedEdgeIds.filter((id) => id !== edge.id) : [...state.selectedEdgeIds, edge.id];
          state.selectedNodeIds = [];
          syncPrimarySelection();
        } else {
          setSingleEdgeSelection(edge.id);
        }
        refreshInspector();
        render();
      });
      edgeLayer.appendChild(label);
    }
  }
}

function refreshInspector() {
  const node = getSelectedNode();
  const edge = getSelectedEdge();

  nodeTitleInput.value = node?.title ?? "";
  nodeShapeSelect.value = node?.shape ?? "rectangle";
  nodeFillInput.value = (node?.fill || "#f6e8c3").toLowerCase();
  nodeStrokeInput.value = (node?.stroke || "#2d2d2d").toLowerCase();
  nodeTextColorInput.value = (node?.textColor || "#111111").toLowerCase();
  nodeBorderWidthInput.value = String(node?.borderWidth ?? 2);
  nodeIconInput.value = node?.icon ?? "";
  nodePrioritySelect.value = node?.priority ?? "normal";
  conditionalColorToggle.value = node?.conditionalColor ?? "off";
  nodeNoteInput.value = node?.note ?? "";

  edgeLabelInput.value = edge?.label ?? "";
  edgeStyleSelect.value = edge?.style ?? "solid";
  edgeWidthInput.value = String(edge?.width ?? 2);
  edgeColorInput.value = (edge?.color || "#444444").toLowerCase();
}

function render() {
  syncPrimarySelection();
  canvas.classList.remove("canvas-grid", "canvas-dots", "canvas-plain");
  canvas.classList.add(`canvas-${state.canvasType}`);
  canvasTypeSelect.value = state.canvasType;
  connectModeBtn.classList.toggle("active", state.mode === "connect");

  renderEdges();
  renderNodes();
}

function serializeMap() {
  return {
    version: 1,
    canvasType: state.canvasType,
    nodes: state.nodes,
    edges: state.edges,
    updatedAt: new Date().toISOString(),
  };
}

function getLocalProjectList() {
  const raw = storageGet(PROJECTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalProjectList(projects) {
  storageSet(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function renderProjectOptions() {
  projectSelect.innerHTML = "";
  for (const project of state.projects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  }
  if (state.currentProjectId) {
    projectSelect.value = state.currentProjectId;
  }
}

function loadMapIntoState(mapData) {
  state.canvasType = mapData.canvasType || "grid";
  state.nodes = (mapData.nodes || []).map((n) => defaultNode(n));
  state.edges = (mapData.edges || []).map((e) => defaultEdge(e));
  clearSelection();
  state.mode = "select";
  state.connectFromNodeId = null;
  state.pasteCount = 0;
}

function persist() {
  if (!state.currentProjectId) return;
  const idx = state.projects.findIndex((p) => p.id === state.currentProjectId);
  if (idx < 0) return;
  state.projects[idx].map = serializeMap();
  state.projects[idx].updatedAt = new Date().toISOString();

  if (!isRemoteMode()) {
    saveLocalProjectList(state.projects);
    return;
  }

  if (String(state.projects[idx].id).startsWith("project_")) {
    saveLocalProjectList(state.projects);
    return;
  }

  if (state.persistTimer) window.clearTimeout(state.persistTimer);
  state.persistTimer = window.setTimeout(() => {
    const project = state.projects[idx];
    if (!project || !state.auth.client || !state.auth.user) return;
    void state.auth.client
      .from("maps")
      .update({
        name: project.name,
        data: project.map,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("user_id", state.auth.user.id);
  }, 250);
}

async function initializeProjects() {
  let projects = [];

  if (isRemoteMode()) {
    const { data, error } = await state.auth.client
      .from("maps")
      .select("id,name,data,created_at,updated_at")
      .eq("user_id", state.auth.user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) {
      projects = data.map((row) => ({
        id: row.id,
        name: row.name,
        map: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
  } else {
    projects = getLocalProjectList();
  }

  if (!projects.length) {
    const seed = (() => {
      const legacyRaw = storageGet(STORAGE_KEY);
      if (!legacyRaw) return initialMapData();
      try {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
      } catch {
        // ignore
      }
      return initialMapData();
    })();

    if (isRemoteMode()) {
      const { data } = await state.auth.client
        .from("maps")
        .insert({
          user_id: state.auth.user.id,
          name: "Mapa 1",
          data: seed,
        })
        .select("id,name,data,created_at,updated_at")
        .single();
      if (data) {
        projects.push({
          id: data.id,
          name: data.name,
          map: data.data,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    }

    if (!projects.length) {
      projects.push({
        id: uid("project"),
        name: "Mapa 1",
        map: seed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  state.projects = projects;
  saveLocalProjectList(state.projects);
  state.currentProjectId = projects[0].id;
  loadMapIntoState(projects[0].map);
  renderProjectOptions();
}

function resetToTemplate(tpl) {
  state.canvasType = tpl.canvasType || "grid";
  const idMap = new Map();
  state.nodes = tpl.nodes.map((n) => {
    const newId = uid("node");
    idMap.set(n.id, newId);
    return defaultNode({ ...n, id: newId });
  });

  // Remap ids for connections when cloning template
  state.edges = tpl.edges
    .map((e) => {
      const newFrom = idMap.get(e.from);
      const newTo = idMap.get(e.to);
      if (!newFrom || !newTo) return null;
      return defaultEdge({
        ...e,
        id: uid("edge"),
        from: newFrom,
        to: newTo,
      });
    })
    .filter(Boolean);

  clearSelection();
  state.connectFromNodeId = null;
  state.mode = "select";
  state.pasteCount = 0;
  refreshInspector();
  render();
  persist();
}

function initialMapData() {
  const center = defaultNode({
    id: "seed_center",
    title: "Idea central",
    x: 340,
    y: 220,
    fill: "#ffd9c7",
    icon: "🧠",
  });

  const branch1 = defaultNode({ id: "seed_1", title: "Tema A", x: 120, y: 100, fill: "#c7ebff" });
  const branch2 = defaultNode({ id: "seed_2", title: "Tema B", x: 550, y: 95, fill: "#d7f7d1" });
  const branch3 = defaultNode({ id: "seed_3", title: "Tema C", x: 560, y: 350, fill: "#fff0b3" });

  return {
    canvasType: "grid",
    nodes: [center, branch1, branch2, branch3],
    edges: [
      defaultEdge({ id: "seed_e1", from: "seed_center", to: "seed_1", label: "inspira", style: "dashed" }),
      defaultEdge({ id: "seed_e2", from: "seed_center", to: "seed_2", label: "prioriza" }),
      defaultEdge({ id: "seed_e3", from: "seed_center", to: "seed_3", label: "impacta", style: "dotted" }),
    ],
  };
}

let drag = null;
let marqueeDrag = null;
let suppressClickUntil = 0;

function handleNodeMouseDown(event, nodeId) {
  if (event.button !== 0 || state.mode === "connect") return;
  const node = getNodeById(nodeId);
  if (!node) return;

  if (!state.selectedNodeIds.includes(nodeId) && !event.shiftKey) {
    setSingleNodeSelection(nodeId);
    refreshInspector();
    render();
  } else if (event.shiftKey) {
    toggleNodeSelection(nodeId);
    refreshInspector();
    render();
  }

  const moveNodeIds = state.selectedNodeIds.includes(nodeId) ? [...state.selectedNodeIds] : [nodeId];
  const originalPositions = new Map();
  for (const id of moveNodeIds) {
    const current = getNodeById(id);
    if (current) originalPositions.set(id, { x: current.x, y: current.y });
  }

  drag = {
    nodeIds: moveNodeIds,
    startX: event.clientX,
    startY: event.clientY,
    originalPositions,
    moved: false,
  };

  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd, { once: true });
}

function onDragMove(event) {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;

  for (const nodeId of drag.nodeIds) {
    const node = getNodeById(nodeId);
    const original = drag.originalPositions.get(nodeId);
    if (!node || !original) continue;
    node.x = Math.max(8, original.x + dx);
    node.y = Math.max(8, original.y + dy);
  }
  render();
}

function onDragEnd() {
  document.removeEventListener("mousemove", onDragMove);
  if (drag?.moved) {
    suppressClickUntil = Date.now() + 120;
  }
  drag = null;
  persist();
}

function handleNodeClick(event, nodeId) {
  event.stopPropagation();
  if (Date.now() < suppressClickUntil) return;

  if (state.mode === "connect") {
    if (!state.connectFromNodeId) {
      state.connectFromNodeId = nodeId;
    } else if (state.connectFromNodeId !== nodeId) {
      const exists = state.edges.some(
        (e) => (e.from === state.connectFromNodeId && e.to === nodeId) || (e.from === nodeId && e.to === state.connectFromNodeId),
      );
      if (!exists) {
        state.edges.push(defaultEdge({ from: state.connectFromNodeId, to: nodeId, style: "dashed" }));
      }
      state.connectFromNodeId = null;
      persist();
    }
    render();
    return;
  }

  if (event.shiftKey) {
    toggleNodeSelection(nodeId);
  } else {
    setSingleNodeSelection(nodeId);
  }
  refreshInspector();
  render();
}

function addNode() {
  const rect = canvas.getBoundingClientRect();
  const node = defaultNode({
    x: Math.round(rect.width / 2 - 70 + (Math.random() * 80 - 40)),
    y: Math.round(rect.height / 2 - 30 + (Math.random() * 80 - 40)),
  });
  state.nodes.push(node);
  state.pasteCount = 0;
  setSingleNodeSelection(node.id);
  refreshInspector();
  render();
  persist();
}

function deleteSelected() {
  if (!state.selectedNodeIds.length && !state.selectedEdgeIds.length) return;

  const selectedNodeSet = new Set(state.selectedNodeIds);
  const selectedEdgeSet = new Set(state.selectedEdgeIds);
  state.nodes = state.nodes.filter((n) => !selectedNodeSet.has(n.id));
  state.edges = state.edges.filter((e) => {
    if (selectedEdgeSet.has(e.id)) return false;
    if (selectedNodeSet.has(e.from)) return false;
    if (selectedNodeSet.has(e.to)) return false;
    return true;
  });
  clearSelection();

  refreshInspector();
  render();
  persist();
}

function switchProject(projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return;
  state.currentProjectId = project.id;
  loadMapIntoState(project.map || initialMapData());
  renderProjectOptions();
  refreshInspector();
  render();
}

async function createProject() {
  const name = prompt("Nombre del nuevo mapa:", `Mapa ${state.projects.length + 1}`)?.trim();
  if (!name) return;
  let project = null;
  const map = initialMapData();

  if (isRemoteMode()) {
    const { data, error } = await state.auth.client
      .from("maps")
      .insert({
        user_id: state.auth.user.id,
        name,
        data: map,
      })
      .select("id,name,data,created_at,updated_at")
      .single();
    if (error || !data) {
      alert("No se pudo crear el mapa en Supabase.");
      return;
    }
    project = {
      id: data.id,
      name: data.name,
      map: data.data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else {
    project = {
      id: uid("project"),
      name,
      map,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  state.projects.push(project);
  if (!isRemoteMode()) saveLocalProjectList(state.projects);
  switchProject(project.id);
  persist();
}

async function renameProject() {
  if (!state.currentProjectId) return;
  const idx = state.projects.findIndex((p) => p.id === state.currentProjectId);
  if (idx < 0) return;
  const name = prompt("Nuevo nombre del mapa:", state.projects[idx].name)?.trim();
  if (!name) return;
  state.projects[idx].name = name;
  state.projects[idx].updatedAt = new Date().toISOString();
  if (isRemoteMode()) {
    await state.auth.client
      .from("maps")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", state.projects[idx].id)
      .eq("user_id", state.auth.user.id);
  } else {
    saveLocalProjectList(state.projects);
  }
  renderProjectOptions();
  persist();
}

async function deleteProject() {
  if (state.projects.length <= 1) {
    alert("Debe existir al menos un mapa.");
    return;
  }
  const current = state.projects.find((p) => p.id === state.currentProjectId);
  if (!current) return;
  const ok = confirm(`Eliminar mapa \"${current.name}\"?`);
  if (!ok) return;

  if (isRemoteMode()) {
    await state.auth.client.from("maps").delete().eq("id", current.id).eq("user_id", state.auth.user.id);
  }

  state.projects = state.projects.filter((p) => p.id !== current.id);
  if (!isRemoteMode()) saveLocalProjectList(state.projects);
  switchProject(state.projects[0].id);
}

function selectNodesInRect(rect, additive = false, baseSelection = []) {
  const selected = [];
  for (const node of state.nodes) {
    const intersects = !(
      node.x + node.w < rect.x ||
      node.x > rect.x + rect.w ||
      node.y + node.h < rect.y ||
      node.y > rect.y + rect.h
    );
    if (intersects) selected.push(node.id);
  }

  if (additive) {
    const merged = new Set([...baseSelection, ...selected]);
    state.selectedNodeIds = Array.from(merged);
  } else {
    state.selectedNodeIds = selected;
  }
  state.selectedEdgeIds = [];
  syncPrimarySelection();
}

function startMarqueeSelection(event) {
  if (event.button !== 0 || state.mode === "connect") return;
  const target = event.target;
  if (target !== canvas && target !== nodeLayer && target !== edgeLayer && target !== marquee) return;

  const rect = canvas.getBoundingClientRect();
  const startX = event.clientX - rect.left;
  const startY = event.clientY - rect.top;
  marqueeDrag = {
    startX,
    startY,
    additive: event.shiftKey,
    baseSelection: [...state.selectedNodeIds],
    moved: false,
  };

  marquee.style.display = "block";
  marquee.style.left = `${startX}px`;
  marquee.style.top = `${startY}px`;
  marquee.style.width = "0px";
  marquee.style.height = "0px";

  const onMove = (moveEvent) => {
    if (!marqueeDrag) return;
    const x = moveEvent.clientX - rect.left;
    const y = moveEvent.clientY - rect.top;
    const left = Math.max(0, Math.min(marqueeDrag.startX, x));
    const top = Math.max(0, Math.min(marqueeDrag.startY, y));
    const w = Math.abs(x - marqueeDrag.startX);
    const h = Math.abs(y - marqueeDrag.startY);
    if (w > 2 || h > 2) marqueeDrag.moved = true;

    marquee.style.left = `${left}px`;
    marquee.style.top = `${top}px`;
    marquee.style.width = `${w}px`;
    marquee.style.height = `${h}px`;

    selectNodesInRect({ x: left, y: top, w, h }, marqueeDrag.additive, marqueeDrag.baseSelection);
    refreshInspector();
    render();
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    if (marqueeDrag?.moved) suppressClickUntil = Date.now() + 120;
    marquee.style.display = "none";
    marqueeDrag = null;
    persist();
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp, { once: true });
}

function copySelection() {
  let nodeIds = [...state.selectedNodeIds];
  if (!nodeIds.length && state.selectedEdgeIds.length) {
    const endpointIds = new Set();
    for (const edge of state.edges) {
      if (!state.selectedEdgeIds.includes(edge.id)) continue;
      endpointIds.add(edge.from);
      endpointIds.add(edge.to);
    }
    nodeIds = Array.from(endpointIds);
  }
  if (!nodeIds.length) return;

  const nodeSet = new Set(nodeIds);
  const nodes = state.nodes.filter((n) => nodeSet.has(n.id)).map((n) => ({ ...n }));
  const edges = state.edges
    .filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to))
    .map((e) => ({ ...e }));

  state.clipboard = { nodes, edges };
  state.pasteCount = 0;
}

function pasteClipboard() {
  if (!state.clipboard || !state.clipboard.nodes.length) return;
  state.pasteCount += 1;
  const offset = state.pasteCount * 24;
  const idMap = new Map();

  const newNodes = state.clipboard.nodes.map((n) => {
    const newId = uid("node");
    idMap.set(n.id, newId);
    return defaultNode({
      ...n,
      id: newId,
      x: n.x + offset,
      y: n.y + offset,
    });
  });

  const newEdges = state.clipboard.edges
    .map((e) => {
      const from = idMap.get(e.from);
      const to = idMap.get(e.to);
      if (!from || !to) return null;
      return defaultEdge({ ...e, id: uid("edge"), from, to });
    })
    .filter(Boolean);

  state.nodes.push(...newNodes);
  state.edges.push(...newEdges);
  state.selectedNodeIds = newNodes.map((n) => n.id);
  state.selectedEdgeIds = [];
  syncPrimarySelection();
  refreshInspector();
  render();
  persist();
}

function handleKeydown(event) {
  if (isFormField(event.target)) return;
  const key = event.key.toLowerCase();
  const withMeta = event.metaKey || event.ctrlKey;

  if (key === "enter") {
    event.preventDefault();
    const selectedNode = getSelectedNode();
    if (selectedNode) {
      const child = addChildNode(selectedNode.id);
      if (child) {
        setSingleNodeSelection(child.id);
        refreshInspector();
        render();
        persist();
      }
    }
    return;
  }

  if (key === "delete") {
    event.preventDefault();
    deleteSelected();
    return;
  }

  if (key === "backspace" && !withMeta && !event.altKey) {
    const selectedNode = getSelectedNode();
    if (selectedNode && !state.selectedEdgeIds.length) {
      event.preventDefault();
      selectedNode.title = selectedNode.title.slice(0, -1);
      refreshInspector();
      render();
      persist();
      return;
    }
  }

  if (withMeta && key === "c") {
    event.preventDefault();
    copySelection();
    return;
  }

  if (withMeta && key === "v") {
    event.preventDefault();
    pasteClipboard();
    return;
  }

  if (withMeta && key === "a") {
    event.preventDefault();
    state.selectedNodeIds = state.nodes.map((n) => n.id);
    state.selectedEdgeIds = [];
    syncPrimarySelection();
    refreshInspector();
    render();
    return;
  }

  if (isPrintableKey(event)) {
    const selectedNode = getSelectedNode();
    if (selectedNode && !state.selectedEdgeIds.length) {
      event.preventDefault();
      selectedNode.title = `${selectedNode.title || ""}${event.key}`;
      refreshInspector();
      render();
      persist();
    }
  }
}

function buildTemplateCatalog() {
  const projectTpl = {
    id: "tpl_project",
    name: "Planificación de Proyecto",
    description: "Objetivo, entregables, riesgos y responsables.",
    canvasType: "grid",
    nodes: [
      defaultNode({ id: "a", title: "Proyecto", x: 330, y: 210, fill: "#ffd9c7", icon: "📌" }),
      defaultNode({ id: "b", title: "Entregables", x: 80, y: 110, fill: "#c7ebff" }),
      defaultNode({ id: "c", title: "Cronograma", x: 580, y: 110, fill: "#d7f7d1" }),
      defaultNode({ id: "d", title: "Riesgos", x: 80, y: 330, fill: "#fff0b3", priority: "high" }),
      defaultNode({ id: "e", title: "Stakeholders", x: 580, y: 330, fill: "#ffd0ea" }),
    ],
    edges: [
      defaultEdge({ id: "ab", from: "a", to: "b", label: "define" }),
      defaultEdge({ id: "ac", from: "a", to: "c", label: "calendariza" }),
      defaultEdge({ id: "ad", from: "a", to: "d", style: "dashed", label: "mitiga" }),
      defaultEdge({ id: "ae", from: "a", to: "e", label: "coordina" }),
    ],
  };

  const brainstormTpl = {
    id: "tpl_brainstorm",
    name: "Lluvia de Ideas",
    description: "Explora líneas de ideas por tema, impacto y factibilidad.",
    canvasType: "dots",
    nodes: [
      defaultNode({ id: "a", title: "Reto", x: 330, y: 210, fill: "#fdd9a0", icon: "💡" }),
      defaultNode({ id: "b", title: "Ideas rápidas", x: 120, y: 80, fill: "#d5d6ff", shape: "circle" }),
      defaultNode({ id: "c", title: "Ideas disruptivas", x: 560, y: 80, fill: "#ffd0ea", shape: "circle" }),
      defaultNode({ id: "d", title: "Validación", x: 120, y: 340, fill: "#d7f7d1" }),
      defaultNode({ id: "e", title: "Próximos pasos", x: 560, y: 340, fill: "#c7ebff" }),
    ],
    edges: [
      defaultEdge({ id: "ab", from: "a", to: "b", style: "dashed", label: "explora" }),
      defaultEdge({ id: "ac", from: "a", to: "c", style: "dashed", label: "rompe reglas" }),
      defaultEdge({ id: "bd", from: "b", to: "d", label: "filtra" }),
      defaultEdge({ id: "ce", from: "c", to: "e", label: "prototipa" }),
    ],
  };

  const swotTpl = {
    id: "tpl_swot",
    name: "Análisis FODA",
    description: "Fortalezas, Oportunidades, Debilidades y Amenazas.",
    canvasType: "plain",
    nodes: [
      defaultNode({ id: "a", title: "Estrategia", x: 330, y: 210, fill: "#ffd9c7", icon: "🧭" }),
      defaultNode({ id: "b", title: "Fortalezas", x: 120, y: 90, fill: "#d7f7d1", shape: "square" }),
      defaultNode({ id: "c", title: "Debilidades", x: 560, y: 90, fill: "#fca5a5", shape: "square", priority: "high" }),
      defaultNode({ id: "d", title: "Oportunidades", x: 120, y: 330, fill: "#c7ebff", shape: "square" }),
      defaultNode({ id: "e", title: "Amenazas", x: 560, y: 330, fill: "#fde68a", shape: "square", priority: "high" }),
    ],
    edges: [
      defaultEdge({ id: "ab", from: "a", to: "b", label: "apalancar" }),
      defaultEdge({ id: "ac", from: "a", to: "c", style: "dotted", label: "reducir" }),
      defaultEdge({ id: "ad", from: "a", to: "d", label: "capturar" }),
      defaultEdge({ id: "ae", from: "a", to: "e", style: "dashed", label: "anticipar" }),
    ],
  };

  const userTemplates = JSON.parse(storageGet(TEMPLATE_STORAGE_KEY, "[]") || "[]");
  return [projectTpl, brainstormTpl, swotTpl, ...userTemplates];
}

function openTemplateGallery() {
  const templates = buildTemplateCatalog();
  templateGrid.innerHTML = "";

  templates.forEach((tpl) => {
    const card = document.createElement("article");
    card.className = "template-card";
    card.innerHTML = `
      <h4>${escapeXml(tpl.name)}</h4>
      <p>${escapeXml(tpl.description || "Plantilla personalizada")}</p>
      <button class="btn" type="button">Usar</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      resetToTemplate(tpl);
      templateDialog.close();
    });
    templateGrid.appendChild(card);
  });

  templateDialog.showModal();
}

function saveUserTemplate() {
  const name = templateNameInput.value.trim();
  if (!name) {
    alert("Escribe un nombre para la plantilla.");
    return;
  }

  const template = {
    id: uid("tpl_user"),
    name,
    description: "Plantilla guardada por usuario.",
    canvasType: state.canvasType,
    nodes: state.nodes.map((n) => ({ ...n })),
    edges: state.edges.map((e) => ({ ...e })),
  };

  const current = JSON.parse(storageGet(TEMPLATE_STORAGE_KEY, "[]") || "[]");
  current.push(template);
  storageSet(TEMPLATE_STORAGE_KEY, JSON.stringify(current));

  templateNameInput.value = "";
  alert("Plantilla guardada en este navegador.");
}

function downloadText(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function mapToCsv() {
  const header = ["id", "title", "shape", "x", "y", "priority", "note"];
  const rows = state.nodes.map((n) => [n.id, n.title, n.shape, n.x, n.y, n.priority, n.note]);
  const esc = (val) => `"${String(val ?? "").split("\"").join("\"\"")}"`;
  return [header, ...rows].map((row) => row.map(esc).join(",")).join("\n");
}

function mapToMarkdown() {
  const lines = ["# Mapa Mental", "", `Actualizado: ${new Date().toLocaleString()}`, "", "## Nodos"];
  for (const n of state.nodes) {
    lines.push(`- ${n.icon ? `${n.icon} ` : ""}**${n.title}** (${n.shape}, prioridad: ${n.priority})`);
    if (n.note?.trim()) lines.push(`  Nota: ${n.note}`);
  }
  lines.push("", "## Conexiones");
  for (const e of state.edges) {
    const from = getNodeById(e.from)?.title || e.from;
    const to = getNodeById(e.to)?.title || e.to;
    lines.push(`- ${from} -> ${to} [${e.style}] ${e.label ? `- ${e.label}` : ""}`);
  }
  return lines.join("\n");
}

function mapToSvgMarkup() {
  const width = canvas.clientWidth || 1200;
  const height = canvas.clientHeight || 700;
  const backgroundPattern =
    state.canvasType === "grid"
      ? '<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#ece6da" stroke-width="1"/></pattern>'
      : state.canvasType === "dots"
        ? '<pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#ddd3c1"/></pattern>'
        : "";

  const edgeLines = state.edges
    .map((e) => {
      const from = getNodeById(e.from);
      const to = getNodeById(e.to);
      if (!from || !to) return "";
      const c1 = getCenter(from);
      const c2 = getCenter(to);
      const dash = getEdgeStrokeDash(e.style);
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
      return `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${escapeXml(e.color)}" stroke-width="${e.width}"${dashAttr} />`;
    })
    .join("\n");

  const edgeLabels = state.edges
    .map((e) => {
      if (!e.label?.trim()) return "";
      const from = getNodeById(e.from);
      const to = getNodeById(e.to);
      if (!from || !to) return "";
      const c1 = getCenter(from);
      const c2 = getCenter(to);
      return `<text x="${(c1.x + c2.x) / 2}" y="${(c1.y + c2.y) / 2 - 6}" text-anchor="middle" font-size="12" fill="#3d342c">${escapeXml(e.label)}</text>`;
    })
    .join("\n");

  const nodeShapes = state.nodes
    .map((n) => {
      const fill = escapeXml(getVisualFill(n));
      const stroke = escapeXml(n.stroke);
      const textColor = escapeXml(n.textColor);
      const title = escapeXml(`${n.icon ? `${n.icon} ` : ""}${n.title}`);

      if (n.shape === "circle") {
        const r = Math.min(n.w, n.h) / 2;
        return `
<circle cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${n.borderWidth}" />
<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 4}" text-anchor="middle" font-size="13" fill="${textColor}">${title}</text>`;
      }

      if (n.shape === "line") {
        return `
<line x1="${n.x}" y1="${n.y + 10}" x2="${n.x + n.w}" y2="${n.y + 10}" stroke="${stroke}" stroke-width="${n.borderWidth}" />
<text x="${n.x}" y="${n.y + 30}" font-size="13" fill="${textColor}">${title}</text>`;
      }

      const rx = n.shape === "square" ? 6 : 12;
      return `
<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${n.borderWidth}" />
<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 4}" text-anchor="middle" font-size="13" fill="${textColor}">${title}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${backgroundPattern}</defs>
  <rect width="100%" height="100%" fill="#fffef8" ${backgroundPattern ? 'style="fill:url(#grid)"' : ""} />
  ${edgeLines}
  ${edgeLabels}
  ${nodeShapes}
</svg>`;
}

function exportPdf() {
  const svg = mapToSvgMarkup();
  const printWindow = window.open("", "_blank", "width=1200,height=850");
  if (!printWindow) {
    alert("No se pudo abrir ventana de impresión. Revisa bloqueo de popups.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Mapa Mental PDF</title>
        <style>
          html, body { margin: 0; padding: 0; }
          svg { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>${svg}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function emailMap() {
  const subject = encodeURIComponent("Mapa mental para revisión");
  const body = encodeURIComponent(
    `Te comparto un resumen del mapa mental.\n\nNodos: ${state.nodes.length}\nConexiones: ${state.edges.length}\n\nExporta/adjunta el JSON generado por la app para compartir editable.`,
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        alert("Formato inválido. Se esperaba { nodes: [], edges: [] }.");
        return;
      }
      state.canvasType = parsed.canvasType || "grid";
      state.nodes = parsed.nodes.map((n) => defaultNode(n));
      state.edges = parsed.edges.map((e) => defaultEdge(e));
      clearSelection();
      state.mode = "select";
      state.connectFromNodeId = null;
      state.pasteCount = 0;
      refreshInspector();
      render();
      persist();
    } catch {
      alert("No se pudo leer el JSON.");
    }
  };
  reader.readAsText(file);
}

async function initializeAuth() {
  const config = loadSupabaseConfig();
  if (!config || !window.supabase?.createClient) {
    updateAuthUI();
    return;
  }

  state.auth.client = window.supabase.createClient(config.url, config.anonKey);
  const { data } = await state.auth.client.auth.getSession();
  state.auth.user = data.session?.user || null;
  state.auth.ready = true;
  updateAuthUI();

  state.auth.client.auth.onAuthStateChange((_event, session) => {
    state.auth.user = session?.user || null;
    updateAuthUI();
    void initializeProjects().then(() => {
      refreshInspector();
      render();
    });
  });
}

async function loginSupabase() {
  if (!state.auth.client) return;
  const email = prompt("Email:");
  if (!email) return;
  const password = prompt("Password (mínimo 6 caracteres):");
  if (!password) return;

  const signIn = await state.auth.client.auth.signInWithPassword({ email, password });
  if (!signIn.error) return;

  const signUp = await state.auth.client.auth.signUp({ email, password });
  if (signUp.error) {
    alert(`No se pudo iniciar sesión: ${signIn.error.message}`);
    return;
  }
  alert("Cuenta creada. Revisa tu correo si Supabase requiere confirmación.");
}

async function logoutSupabase() {
  if (!state.auth.client) return;
  await state.auth.client.auth.signOut();
}

function bindEvents() {
  configureBackendBtn.addEventListener("click", () => {
    const cfg = loadSupabaseConfig();
    supabaseUrlInput.value = cfg?.url || "";
    supabaseAnonKeyInput.value = cfg?.anonKey || "";
    backendDialog.showModal();
  });
  closeBackendDialogBtn.addEventListener("click", () => backendDialog.close());
  saveBackendConfigBtn.addEventListener("click", async () => {
    const url = supabaseUrlInput.value.trim();
    const anonKey = supabaseAnonKeyInput.value.trim();
    if (!url || !anonKey) {
      alert("Debes completar URL y Anon Key.");
      return;
    }
    saveSupabaseConfig({ url, anonKey });
    backendDialog.close();
    window.location.reload();
  });
  clearBackendConfigBtn.addEventListener("click", () => {
    clearSupabaseConfig();
    backendDialog.close();
    window.location.reload();
  });

  loginBtn.addEventListener("click", () => {
    void loginSupabase();
  });
  logoutBtn.addEventListener("click", () => {
    void logoutSupabase();
  });

  projectSelect.addEventListener("change", (e) => {
    const id = String(e.target.value || "");
    if (id) switchProject(id);
  });
  newProjectBtn.addEventListener("click", () => { void createProject(); });
  renameProjectBtn.addEventListener("click", () => { void renameProject(); });
  deleteProjectBtn.addEventListener("click", () => { void deleteProject(); });

  addNodeBtn.addEventListener("click", addNode);

  connectModeBtn.addEventListener("click", () => {
    state.mode = state.mode === "connect" ? "select" : "connect";
    state.connectFromNodeId = null;
    render();
  });

  deleteSelectedBtn.addEventListener("click", deleteSelected);
  canvas.addEventListener("mousedown", startMarqueeSelection);

  canvas.addEventListener("click", () => {
    if (Date.now() < suppressClickUntil) return;
    clearSelection();
    state.connectFromNodeId = null;
    refreshInspector();
    render();
  });

  canvasTypeSelect.addEventListener("change", (e) => {
    state.canvasType = e.target.value;
    render();
    persist();
  });

  nodeTitleInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.title = e.target.value;
    render();
    persist();
  });

  nodeShapeSelect.addEventListener("change", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.shape = e.target.value;
    setShapeDimensions(n);
    render();
    persist();
  });

  nodeFillInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.fill = e.target.value;
    render();
    persist();
  });

  nodeStrokeInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.stroke = e.target.value;
    render();
    persist();
  });

  nodeTextColorInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.textColor = e.target.value;
    render();
    persist();
  });

  nodeBorderWidthInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.borderWidth = Number(e.target.value);
    render();
    persist();
  });

  nodeIconInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.icon = e.target.value;
    render();
    persist();
  });

  nodePrioritySelect.addEventListener("change", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.priority = e.target.value;
    render();
    persist();
  });

  conditionalColorToggle.addEventListener("change", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.conditionalColor = e.target.value;
    render();
    persist();
  });

  nodeNoteInput.addEventListener("input", (e) => {
    const n = getSelectedNode();
    if (!n) return;
    n.note = e.target.value;
    render();
    persist();
  });

  edgeLabelInput.addEventListener("input", (e) => {
    const ed = getSelectedEdge();
    if (!ed) return;
    ed.label = e.target.value;
    render();
    persist();
  });

  edgeStyleSelect.addEventListener("change", (e) => {
    const ed = getSelectedEdge();
    if (!ed) return;
    ed.style = e.target.value;
    render();
    persist();
  });

  edgeWidthInput.addEventListener("input", (e) => {
    const ed = getSelectedEdge();
    if (!ed) return;
    ed.width = Number(e.target.value);
    render();
    persist();
  });

  edgeColorInput.addEventListener("input", (e) => {
    const ed = getSelectedEdge();
    if (!ed) return;
    ed.color = e.target.value;
    render();
    persist();
  });

  exportJsonBtn.addEventListener("click", () => {
    downloadText("mind-map.json", JSON.stringify(serializeMap(), null, 2), "application/json;charset=utf-8");
  });

  exportSvgBtn.addEventListener("click", () => {
    downloadText("mind-map.svg", mapToSvgMarkup(), "image/svg+xml;charset=utf-8");
  });

  exportCsvBtn.addEventListener("click", () => {
    downloadText("mind-map-nodes.csv", mapToCsv(), "text/csv;charset=utf-8");
  });

  exportMdBtn.addEventListener("click", () => {
    downloadText("mind-map.md", mapToMarkdown(), "text/markdown;charset=utf-8");
  });

  exportPdfBtn.addEventListener("click", exportPdf);
  emailBtn.addEventListener("click", emailMap);

  importInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
    e.target.value = "";
  });

  templateGalleryBtn.addEventListener("click", openTemplateGallery);
  closeTemplateDialogBtn.addEventListener("click", () => templateDialog.close());

  saveTemplateBtn.addEventListener("click", saveUserTemplate);

  window.addEventListener("resize", render);
  document.addEventListener("keydown", handleKeydown);
}

async function init() {
  await initializeAuth();
  await initializeProjects();
  renderSwatches();
  bindEvents();
  refreshInspector();
  render();
  persist();
}

void init();
