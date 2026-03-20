const canvas = document.getElementById("canvas");
const modeButtons = document.querySelectorAll(".mode-btn");
const nodeButtons = document.querySelectorAll(".node-btn");
const importBtn = document.getElementById("import-btn");
const exportBtn = document.getElementById("export-btn");
const importArea = document.getElementById("import-area");

let mode = "view"; // view, edit, move, link, delete
let nodes = [];
let arrows = [];
let dragState = null;
let linkStartNode = null;
let deleteSelected = null;

/* ─────────────────────────────
   モード切り替え（トグル式）
────────────────────────────── */

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const newMode = btn.dataset.mode;

    // 同じボタンを押したら閲覧に戻す
    if (mode === newMode) {
      setMode("view");
    } else {
      setMode(newMode);
    }
  });
});

function setMode(newMode) {
  mode = newMode;

  modeButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  clearDeleteSelection();
  finishEditAll();
  linkStartNode = null;
}

/* ─────────────────────────────
   ノード追加
────────────────────────────── */

nodeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.nodeType;
    addNode(type);
  });
});

function addNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);

  node.textContent =
    type === "start" ? "始動" :
    type === "action" ? "行動" :
    "確認";

  // キャンバス中央に追加
  const rect = canvas.getBoundingClientRect();
  const x = rect.width / 2 - 50 + canvas.scrollLeft;
  const y = rect.height / 2 - 20 + canvas.scrollTop;

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  canvas.appendChild(node);
  nodes.push(node);

  node.addEventListener("pointerdown", onNodePointerDown);
}

/* ─────────────────────────────
   ノード操作
────────────────────────────── */

function onNodePointerDown(e) {
  const node = e.currentTarget;
  e.stopPropagation();

  if (mode === "view") return;

  if (mode === "edit") {
    startEdit(node);
    return;
  }

  if (mode === "move") {
    startMove(node, e);
    return;
  }

  if (mode === "link") {
    handleLink(node);
    return;
  }

  if (mode === "delete") {
    handleDeleteNode(node);
    return;
  }
}

/* ─────────────────────────────
   編集モード
────────────────────────────── */

function startEdit(node) {
  finishEditAll();
  node.contentEditable = "true";
  node.classList.add("editing");
  node.focus();

  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  node.addEventListener("blur", onNodeBlur);
}

function onNodeBlur(e) {
  const node = e.currentTarget;
  node.removeEventListener("blur", onNodeBlur);
  node.contentEditable = "false";
  node.classList.remove("editing");
}

function finishEditAll() {
  nodes.forEach(node => {
    if (node.isContentEditable) {
      node.contentEditable = "false";
      node.classList.remove("editing");
    }
  });
}

/* ─────────────────────────────
   移動モード
────────────────────────────── */

canvas.addEventListener("pointermove", e => {
  if (mode !== "move") return;
  if (!dragState) return;

  const { node, offsetX, offsetY } = dragState;
  const x = e.pageX - offsetX + canvas.scrollLeft;
  const y = e.pageY - offsetY + canvas.scrollTop;

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  updateArrowsForNode(node);
});

canvas.addEventListener("pointerup", () => {
  dragState = null;
});

function startMove(node, e) {
  const rect = node.getBoundingClientRect();
  dragState = {
    node,
    offsetX: e.pageX - rect.left,
    offsetY: e.pageY - rect.top
  };
}

/* ─────────────────────────────
   矢印モード
────────────────────────────── */

function handleLink(node) {
  if (!linkStartNode) {
    linkStartNode = node;
    return;
  }
  if (linkStartNode === node) {
    linkStartNode = null;
    return;
  }
  createArrow(linkStartNode, node);
  linkStartNode = null;
}

function createArrow(fromNode, toNode) {
  const svgNS = "http://www.w3.org/2000/svg";
  const wrapper = document.createElement("div");
  wrapper.classList.add("arrow");

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");

  const markerPath = document.createElementNS(svgNS, "path");
  markerPath.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
  markerPath.setAttribute("fill", "#616161");

  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const line = document.createElementNS(svgNS, "line");
  line.classList.add("arrow-line");
  svg.appendChild(line);

  wrapper.appendChild(svg);
  canvas.appendChild(wrapper);

  const arrow = { wrapper, svg, line, fromNode, toNode };
  arrows.push(arrow);

  updateArrowPosition(arrow);

  wrapper.addEventListener("pointerdown", e => {
    e.stopPropagation();
    if (mode === "delete") {
      handleDeleteArrow(arrow);
    }
  });
}

function updateArrowPosition(arrow) {
  const rectCanvas = canvas.getBoundingClientRect();
  const rectFrom = arrow.fromNode.getBoundingClientRect();
  const rectTo = arrow.toNode.getBoundingClientRect();

  // ノード中心
  let x1 = rectFrom.left + rectFrom.width / 2;
  let y1 = rectFrom.top + rectFrom.height / 2;
  let x2 = rectTo.left + rectTo.width / 2;
  let y2 = rectTo.top + rectTo.height / 2;

  // ノードの縁まで押し出す
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // ここで「どれくらい外に出すか」を調整（ノード半径っぽく）
  const fromOffset = Math.min(rectFrom.width, rectFrom.height) / 2;
  const toOffset   = Math.min(rectTo.width, rectTo.height) / 2;

  x1 += nx * fromOffset;
  y1 += ny * fromOffset;
  x2 -= nx * toOffset;
  y2 -= ny * toOffset;

  // キャンバス座標系に変換
  x1 -= rectCanvas.left - canvas.scrollLeft;
  y1 -= rectCanvas.top - canvas.scrollTop;
  x2 -= rectCanvas.left - canvas.scrollLeft;
  y2 -= rectCanvas.top - canvas.scrollTop;

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const width = Math.abs(x2 - x1) || 1;
  const height = Math.abs(y2 - y1) || 1;

  arrow.wrapper.style.left = `${minX}px`;
  arrow.wrapper.style.top = `${minY}px`;
  arrow.wrapper.style.width = `${width}px`;
  arrow.wrapper.style.height = `${height}px`;

  arrow.svg.setAttribute("width", width);
  arrow.svg.setAttribute("height", height);

  arrow.line.setAttribute("x1", x1 < x2 ? 0 : width);
  arrow.line.setAttribute("y1", y1 < y2 ? 0 : height);
  arrow.line.setAttribute("x2", x1 < x2 ? width : 0);
  arrow.line.setAttribute("y2", y1 < y2 ? height : 0);
}

function updateArrowsForNode(node) {
  arrows.forEach(arrow => {
    if (arrow.fromNode === node || arrow.toNode === node) {
      updateArrowPosition(arrow);
    }
  });
}

/* ─────────────────────────────
   削除モード
────────────────────────────── */

function clearDeleteSelection() {
  deleteSelected = null;
  nodes.forEach(n => n.classList.remove("selected-delete"));
  arrows.forEach(a => a.wrapper.classList.remove("selected-delete"));
}

function handleDeleteNode(node) {
  if (deleteSelected === node) {
    arrows = arrows.filter(a => {
      if (a.fromNode === node || a.toNode === node) {
        a.wrapper.remove();
        return false;
      }
      return true;
    });
    nodes = nodes.filter(n => n !== node);
    node.remove();
    deleteSelected = null;
  } else {
    clearDeleteSelection();
    deleteSelected = node;
    node.classList.add("selected-delete");
  }
}

function handleDeleteArrow(arrow) {
  if (deleteSelected === arrow) {
    arrow.wrapper.remove();
    arrows = arrows.filter(a => a !== arrow);
    deleteSelected = null;
  } else {
    clearDeleteSelection();
    deleteSelected = arrow;
    arrow.wrapper.classList.add("selected-delete");
  }
}

/* ─────────────────────────────
   キャンバスクリックでリセット
────────────────────────────── */

canvas.addEventListener("pointerdown", () => {
  if (mode === "link") linkStartNode = null;
  if (mode === "delete") clearDeleteSelection();
});

/* ─────────────────────────────
   JSON 保存 / 読込
────────────────────────────── */

exportBtn.addEventListener("click", () => {
  const data = {
    nodes: nodes.map(n => ({
      type: n.classList.contains("start") ? "start" :
            n.classList.contains("action") ? "action" : "check",
      text: n.textContent,
      left: n.style.left,
      top: n.style.top
    })),
    arrows: arrows.map(a => ({
      fromIndex: nodes.indexOf(a.fromNode),
      toIndex: nodes.indexOf(a.toNode)
    }))
  };
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard?.writeText(json).catch(() => {});
  importArea.value = json;
});

importBtn.addEventListener("click", () => {
  try {
    const data = JSON.parse(importArea.value);
    loadFromData(data);
  } catch (e) {
    alert("JSON の形式が不正です");
  }
});

function loadFromData(data) {
  nodes.forEach(n => n.remove());
  arrows.forEach(a => a.wrapper.remove());
  nodes = [];
  arrows = [];
  deleteSelected = null;
  linkStartNode = null;

  if (!data || !Array.isArray(data.nodes)) return;

  data.nodes.forEach(n => {
    const node = document.createElement("div");
    node.classList.add("node", n.type);
    node.textContent = n.text || "";
    node.style.left = n.left || "100px";
    node.style.top = n.top || "100px";
    canvas.appendChild(node);
    nodes.push(node);
    node.addEventListener("pointerdown", onNodePointerDown);
  });

  if (Array.isArray(data.arrows)) {
    data.arrows.forEach(a => {
      const fromNode = nodes[a.fromIndex];
      const toNode = nodes[a.toIndex];
      if (fromNode && toNode) {
        createArrow(fromNode, toNode);
      }
    });
  }
}
