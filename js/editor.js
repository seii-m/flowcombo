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

  // ★ 矢印の pointer-events 切り替え
  if (mode === "delete") {
    arrows.forEach(a => a.wrapper.classList.add("can-select"));
  } else {
    arrows.forEach(a => a.wrapper.classList.remove("can-select"));
  }
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

let currentScale = 1; // ★ 追加

function updateArrowPosition(arrow) {
  const from = arrow.fromNode;
  const to = arrow.toNode;

  if (!from || !to) return;

  const scale = currentScale || 1;

  const rectCanvas = canvas.getBoundingClientRect();
  const rectFrom = from.getBoundingClientRect();
  const rectTo = to.getBoundingClientRect();

  // ノード中心座標（画面座標）
  const fromCenterX = rectFrom.left + rectFrom.width / 2;
  const fromCenterY = rectFrom.top + rectFrom.height / 2;
  const toCenterX = rectTo.left + rectTo.width / 2;
  const toCenterY = rectTo.top + rectTo.height / 2;

  // ベクトル
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const len = Math.hypot(dx, dy);
  if (!len) return;

  const nx = dx / len;
  const ny = dy / len;

  // 外枠まで押し出す（縦中央から）
  const fromR = Math.min(rectFrom.width, rectFrom.height) / 2;
  const toR = Math.min(rectTo.width, rectTo.height) / 2;

  const startX = fromCenterX + nx * fromR;
  const startY = fromCenterY + ny * fromR;
  const endX = toCenterX - nx * toR;
  const endY = toCenterY - ny * toR;

  // canvas座標に変換（scale補正あり）
  const x1 = (startX - rectCanvas.left) / scale + canvas.scrollLeft;
  const y1 = (startY - rectCanvas.top) / scale + canvas.scrollTop;
  const x2 = (endX - rectCanvas.left) / scale + canvas.scrollLeft;
  const y2 = (endY - rectCanvas.top) / scale + canvas.scrollTop;

  // CSS矢印描画
  const dx2 = x2 - x1;
  const dy2 = y2 - y1;
  const length = Math.hypot(dx2, dy2);
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
  if (!confirm("フローを保存しますか？")) return;
  const data = {
    version: 1,
    title: titleInput.value || "無題のフロー",
    nodes: nodes.map(n => ({
      id: n.dataset.id,
      type: n.dataset.type,
      text: n.innerHTML,
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
    node.innerHTML = (n.text || "")
      .replace(/<div>/g, "<br>")
      .replace(/<\/div>/g, "");
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
   ツリー自動整列（横幅対応 完全版）
────────────────────────────── */

document.getElementById("align-btn").addEventListener("click", autoAlignTree);

function autoAlignTree() {
  const children = buildTree();
  const depth = computeDepths(children);

  // depth ごとにノードを集める
  const columns = new Map();
  nodes.forEach(n => {
    const d = depth.get(n) || 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(n);
  });

  /* ─────────────────────────────
     ① depth ごとの最大ノード幅を計算
  ────────────────────────────── */
  const colMaxWidth = new Map();
  columns.forEach((list, d) => {
    let maxW = 0;
    list.forEach(node => {
      const w = node.getBoundingClientRect().width;
      if (w > maxW) maxW = w;
    });
    colMaxWidth.set(d, maxW);
  });

  /* ─────────────────────────────
     ② depth ごとの X 座標を計算
        （最大幅の累積 + 余白）
  ────────────────────────────── */
  const colX = new Map();
  let acc = 40; // 左端
  const colGap = 60; // 列間余白

  const maxDepth = Math.max(...columns.keys());
  for (let d = 0; d <= maxDepth; d++) {
    colX.set(d, acc);
    acc += (colMaxWidth.get(d) || 0) + colGap;
  }

  /* ─────────────────────────────
     ③ 各列を兄弟グループ単位で縦整列
  ────────────────────────────── */
  const marginY = 20;

  columns.forEach((list, d) => {

    // ★ 兄弟グループ化
    const groups = [];
    const used = new Set();

    list.forEach(node => {
      if (used.has(node)) return;

      const parents = findParents(node);
      if (parents.length === 0) {
        groups.push([node]);
        used.add(node);
        return;
      }

      const p = parents[0];
      const siblings = children.get(p) || [];
      const group = siblings.filter(s => list.includes(s));

      group.forEach(s => used.add(s));
      groups.push(group);
    });

    // ★ 親の位置でグループをソート
    groups.sort((g1, g2) => {
      const p1 = findParents(g1[0])[0];
      const p2 = findParents(g2[0])[0];
      const y1 = p1 ? parseInt(p1.style.top) : 0;
      const y2 = p2 ? parseInt(p2.style.top) : 0;
      return y1 - y2;
    });

    // ★ グループごとに配置（高さ考慮）
    let currentY = 40;
    const x = colX.get(d);

    groups.forEach(group => {

      // 親より上に行かない補正
      const parent = findParents(group[0])[0];
      if (parent) {
        const parentY = parseInt(parent.style.top);
        if (currentY < parentY) currentY = parentY;
      }

      // グループ内のノードを配置
      group.forEach(node => {
        node.style.left = `${x}px`;
        node.style.top = `${currentY}px`;

        updateArrowsForNode(node);

        const h = node.getBoundingClientRect().height;
        currentY += h + marginY;
      });
    });
  });

  saveData();
}

function findParents(node) {
  return arrows
    .filter(a => a.toNode === node)
    .map(a => a.fromNode);
}

function computeDepths(children) {
  const depth = new Map();
  const roots = findRoots(children);

  const queue = [];
  roots.forEach(r => {
    depth.set(r, 0);
    queue.push(r);
  });

  while (queue.length > 0) {
    const node = queue.shift();
    const d = depth.get(node);

    const kids = children.get(node);
    kids.forEach(k => {
      if (!depth.has(k) || depth.get(k) < d + 1) {
        depth.set(k, d + 1);
        queue.push(k);
      }
    });
  }

  return depth;
}
      
function saveData() {
  const data = {
    version: 1,
    title: titleInput.value || "無題のフロー",
    nodes: nodes.map(n => ({
      id: n.dataset.id,
      type: n.dataset.type,
      text: n.innerHTML,
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

function getNodeEdgePoint(node, targetX, targetY) {
  const rect = node.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = targetX - cx;
  const dy = targetY - cy;

  const angle = Math.atan2(dy, dx);

  const radius = Math.min(rect.width, rect.height) / 2;

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}

function getRectEdgePoint(rect, tx, ty) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = tx - cx;
  const dy = ty - cy;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // どちらの辺に当たるか判定
  const scale = Math.min(
    (rect.width / 2) / absDx,
    (rect.height / 2) / absDy
  );

  return {
    x: cx + dx * scale,
    y: cy + dy * scale
  };
}

document.getElementById("save-image-btn").addEventListener("click", () => {
  if (!confirm("フローを画像として保存しますか？")) return;

  const target = document.getElementById("canvas");

  html2canvas(target, {
    backgroundColor: null, // ★ 背景透過
    scale: 2
  }).then(canvas => {

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h).data;

    let minX = w, minY = h, maxX = 0, maxY = 0;

    // ★ 描画されている部分を検出（透明以外）
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = imgData[idx + 3];

        if (a === 0) continue; // 完全透明 → 無視

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    // ★ 余白20px
    const pad = 20;

    const trimW = (maxX - minX + 1) + pad * 2;
    const trimH = (maxY - minY + 1) + pad * 2;

    const trimmed = document.createElement("canvas");
    trimmed.width = trimW;
    trimmed.height = trimH;

    const tctx = trimmed.getContext("2d");

    // ★ 透明背景のまま切り抜き
    tctx.drawImage(
      canvas,
      minX - pad,
      minY - pad,
      trimW,
      trimH,
      0,
      0,
      trimW,
      trimH
    );
    
    // ★ タイトル描画（黒字＋白枠＋背景帯）
    const title = titleInput.value || "FlowCombo";
    const fontSize = 32;
    const titlePad = 20;
    const titleHeight = fontSize + titlePad * 2;
    
    // finalCanvas = タイトル帯ぶん縦に伸ばす
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = trimmed.width;
    finalCanvas.height = trimmed.height + titleHeight;
    
    const fctx = finalCanvas.getContext("2d");
    fctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // ★ タイトル帯（背景を不透明にする）
    fctx.fillStyle = "rgba(255,255,255,1)"; // ← 白背景（透過なし）
    fctx.fillRect(0, 0, finalCanvas.width, titleHeight);
    
    // ★ タイトル文字（黒字＋白枠）
    fctx.font = `${fontSize}px sans-serif`;
    fctx.textAlign = "left";
    fctx.textBaseline = "top";
    
    // 縁取り（白）
    fctx.lineWidth = 4;
    fctx.strokeStyle = "white";
    fctx.strokeText(title, titlePad, titlePad);
    
    // 本文（黒）
    fctx.fillStyle = "black";
    fctx.fillText(title, titlePad, titlePad);
    
    // ★ 本体画像を下に描画
    fctx.drawImage(trimmed, 0, titleHeight);

    // ★ PNG 保存
    const url = finalCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = title + ".png";
    a.click();
  });
});



