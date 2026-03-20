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

const titleInput = document.getElementById("flow-title");

titleInput.addEventListener("input", () => {
  saveData();
});

/* ─────────────────────────────
   モード切り替え（トグル式）
────────────────────────────── */

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    clearNodeSelections();
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
    saveData();
  });
});

function addNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);

  node.dataset.id = crypto.randomUUID();
  node.dataset.type = type;

  node.textContent =
    type === "start" ? "始動" :
    type === "action" ? "行動" :
    "確認";

  // ★ 種類ごとの完全固定位置
  let x = 40;
  let y =
    type === "start"  ? 40 :
    type === "action" ? 140 :
                        240;

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  canvas.appendChild(node);
  nodes.push(node);

  node.addEventListener("pointerdown", onNodePointerDown);

  ensureCanvasSize(x, y);
  saveData();
}

/* ─────────────────────────────
   ノード操作
────────────────────────────── */

let moveTarget = null;

function onNodePointerDown(e) {
  const node = e.currentTarget;
  e.stopPropagation();
   
  if (mode === "view") return;

  if (mode === "edit") {
    clearNodeSelections();
    node.classList.add("selected-edit");
    startEdit(node);
    return;
  }

  if (mode === "move") {
    clearNodeSelections();
    node.classList.add("selected-move");
  
    if (e.pointerType === "mouse") {
      startDragPC(node, e);
    } else {
      moveTarget = node;
    }
    return;
  }

  if (mode === "link") {
    clearNodeSelections();
    node.classList.add("selected-link");

    handleLink(node);

    // 2個目を選んだら選択解除
    if (linkStartNode === null) {
      clearNodeSelections();
    }
    return;
  }

  if (mode === "delete") {
    clearNodeSelections();
    node.classList.add("selected-delete");
    handleDeleteNode(node);
    return;
  }
}

function clearNodeSelections() {
  nodes.forEach(n => {
    n.classList.remove("selected-move", "selected-link", "selected-edit", "selected-delete");
  });
}

/* ─────────────────────────────
   移動モード
────────────────────────────── */

function startDragPC(node, e) {
  const rectCanvas = canvas.getBoundingClientRect();
  const rectNode = node.getBoundingClientRect();

  dragState = {
    node,
    offsetX: e.clientX - rectNode.left,
    offsetY: e.clientY - rectNode.top,
    canvasLeft: rectCanvas.left,
    canvasTop: rectCanvas.top
  };

  node.setPointerCapture(e.pointerId);
  node.addEventListener("pointermove", onDragMovePC);
  node.addEventListener("pointerup", onDragEndPC);
}

function onDragMovePC(e) {
  if (!dragState) return;

  const { node, offsetX, offsetY, canvasLeft, canvasTop } = dragState;

  const x = e.clientX - canvasLeft + canvas.scrollLeft - offsetX;
  const y = e.clientY - canvasTop + canvas.scrollTop - offsetY;

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  updateArrowsForNode(node);
  ensureCanvasSize(x, y);
}

function onDragEndPC(e) {
  const node = dragState.node;

  node.releasePointerCapture(e.pointerId);
  node.removeEventListener("pointermove", onDragMovePC);
  node.removeEventListener("pointerup", onDragEndPC);

  dragState = null;
  saveData();
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
  saveData();
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
  saveData();
}

function createArrow(fromNode, toNode) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("arrow");

  const line = document.createElement("div");
  line.classList.add("arrow-line");

  wrapper.appendChild(line);
  canvas.appendChild(wrapper);

  const arrow = { wrapper, line, fromNode, toNode };
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
  let cx1 = rectFrom.left + rectFrom.width / 2;
  let cy1 = rectFrom.top + rectFrom.height / 2;
  let cx2 = rectTo.left + rectTo.width / 2;
  let cy2 = rectTo.top + rectTo.height / 2;

  // ベクトル
  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // ノード外周まで押し出す
  const fromOffset = Math.min(rectFrom.width, rectFrom.height) / 2 + 4;
  const toOffset   = Math.min(rectTo.width, rectTo.height) / 2 + 4;

  let x1 = cx1 + nx * fromOffset;
  let y1 = cy1 + ny * fromOffset;
  let x2 = cx2 - nx * toOffset;
  let y2 = cy2 - ny * toOffset;

  // キャンバス座標へ
  x1 -= rectCanvas.left - canvas.scrollLeft;
  y1 -= rectCanvas.top - canvas.scrollTop;
  x2 -= rectCanvas.left - canvas.scrollLeft;
  y2 -= rectCanvas.top - canvas.scrollTop;

  // CSS 矢印の描画
  const dx2 = x2 - x1;
  const dy2 = y2 - y1;
  const length = Math.sqrt(dx2*dx2 + dy2*dy2);
  const angle = Math.atan2(dy2, dx2) * 180 / Math.PI;

  arrow.wrapper.style.left = `${x1}px`;
  arrow.wrapper.style.top = `${y1}px`;

  arrow.line.style.width = `${length}px`;
  arrow.line.style.transform = `rotate(${angle}deg)`;
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
    saveData();
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
    saveData();
  } else {
    clearDeleteSelection();
    deleteSelected = arrow;
    arrow.wrapper.classList.add("selected-delete");
  }
}

/* ─────────────────────────────
   キャンバスクリックでリセット
────────────────────────────── */

canvas.addEventListener("pointerdown", e => {
  if (mode === "move" && moveTarget && e.pointerType !== "mouse") {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;

    moveTarget.style.left = `${x}px`;
    moveTarget.style.top = `${y}px`;
    updateArrowsForNode(moveTarget);

    moveTarget = null;
  }
});

/* ─────────────────────────────
   JSON 保存 / 読込
────────────────────────────── */
        
exportBtn.addEventListener("click", () => {
  if (!confirm("現在のフローを保存しますか？")) return;
  const data = {
    version: 1,
    title: titleInput.value || "無題のフロー",
    nodes: nodes.map(n => ({
      id: n.dataset.id,
      type: n.dataset.type,
      text: n.textContent,
      left: n.style.left,
      top: n.style.top
    })),
    arrows: arrows.map(a => ({
      from: a.fromNode.dataset.id,
      to: a.toNode.dataset.id
    }))
  };

  const json = JSON.stringify(data, null, 2);

  // クリップボードコピー（従来機能）
  navigator.clipboard?.writeText(json).catch(() => {});
  importArea.value = json;

  // ★ ファイル保存（スマホ対応）
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = (titleInput.value || "flowcombo") + ".json";
  a.click();

  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadFromData(data);
    } catch {
      alert("JSON の形式が不正です");
    }
  };
  reader.readAsText(file);
});

function loadFromData(data) {
  nodes.forEach(n => n.remove());
  arrows.forEach(a => a.wrapper.remove());
  nodes = [];
  arrows = [];
  deleteSelected = null;
  linkStartNode = null;

  titleInput.value = data.title || "無題のフロー";
  
  if (!data || !Array.isArray(data.nodes)) return;

  const nodeMap = new Map();
  
  data.nodes.forEach(n => {
    const node = document.createElement("div");
    node.dataset.id = n.id;
    node.dataset.type = n.type;
    node.classList.add("node", n.type);
    node.textContent = n.text || "";
    node.style.left = n.left || "100px";
    node.style.top = n.top || "100px";
    canvas.appendChild(node);
    nodes.push(node);
    node.addEventListener("pointerdown", onNodePointerDown);
    nodeMap.set(n.id, node);
  });
  
  data.arrows.forEach(a => {
    const fromNode = nodeMap.get(a.from);
    const toNode = nodeMap.get(a.to);
    if (fromNode && toNode) createArrow(fromNode, toNode);
  });
  saveData();
}

/* ─────────────────────────────
   ツリー構造の構築
────────────────────────────── */

function buildTree() {
  const children = new Map();
  nodes.forEach(n => children.set(n, []));

  arrows.forEach(a => {
    children.get(a.fromNode).push(a.toNode);
  });

  return children;
}

function findRoots(children) {
  const allChildren = new Set();
  children.forEach(list => list.forEach(c => allChildren.add(c)));
  return nodes.filter(n => !allChildren.has(n));
}

/* ─────────────────────────────
   ツリー自動整列
────────────────────────────── */

document.getElementById("align-btn").addEventListener("click", autoAlignTree);

function autoAlignTree() {
  const children = buildTree();
  const roots = findRoots(children);

  let startX = 40;  // 左上基準
  let startY = 40;

  roots.forEach(root => {
    layoutSubtreeHorizontal(root, startX, startY, children);
    startX += 140; // ★ 横間隔をさらに狭く
  });
}

function layoutSubtreeHorizontal(node, x, y, children) {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  updateArrowsForNode(node);
  ensureCanvasSize(x, y);

  const kids = children.get(node);
  if (!kids || kids.length === 0) return;

  let childY = y; // 親の位置から下に積む

  kids.forEach(child => {
    layoutSubtreeHorizontal(child, x + 140, childY, children); // ★ 横140
    childY += 70; // ★ 縦70
  });
}

function saveData() {
  const data = {
    version: 1,
    title: titleInput.value || "無題のフロー",
    nodes: nodes.map(n => ({
      id: n.dataset.id,
      type: n.dataset.type,
      text: n.textContent,
      left: n.style.left,
      top: n.style.top
    })),
    arrows: arrows.map(a => ({
      from: a.fromNode.dataset.id,
      to: a.toNode.dataset.id
    }))
  };

  localStorage.setItem("flowcombo-data", JSON.stringify(data));
}

function loadData() {
  const json = localStorage.getItem("flowcombo-data");
  if (!json) return;

  try {
    const data = JSON.parse(json);

    // ★ バージョンチェック
    if (!data.version || data.version < 1) {
      console.warn("古いバージョンのデータを検出。必要なら変換処理を追加できます。");
    }

    loadFromData(data);
  } catch (e) {
    console.error("自動保存データの読み込みに失敗:", e);
  }
}

function migrateData(data) {
  // 例: version 0 → 1 の変換処理を書く
  return data;
}

window.addEventListener("load", loadData);
window.addEventListener("load", () => {
  canvas.scrollLeft = 1200;
  canvas.scrollTop = 1200;
});


function ensureCanvasSize(x, y) {
  const margin = 500; // 余裕
  if (x + margin > canvas.scrollWidth) {
    canvas.style.width = (x + margin) + "px";
  }
  if (y + margin > canvas.scrollHeight) {
    canvas.style.height = (y + margin) + "px";
  }
}

let scale = 1;
let lastDistance = null;

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 2) {
    e.preventDefault();

    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);

    if (lastDistance !== null) {
      const delta = dist - lastDistance;
      scale += delta * 0.002;
      scale = Math.min(Math.max(scale, 0.3), 2.5); // 最小0.3〜最大2.5倍
      canvas.style.transform = `scale(${scale})`;
    }

    lastDistance = dist;
  }
});

canvas.addEventListener("touchend", () => {
  lastDistance = null;
});

function createArrowElement() {
  const arrow = document.createElement("div");
  arrow.classList.add("arrow");

  const line = document.createElement("div");
  line.classList.add("arrow-line");

  arrow.appendChild(line);
  canvas.appendChild(arrow);

  return arrow;
}




