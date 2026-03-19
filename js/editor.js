// ───────────────────────────────
// ノード追加ボタン
// ───────────────────────────────

document.getElementById("add-rect").onclick = () => createNode("rect");
document.getElementById("add-circle").onclick = () => createNode("circle");
document.getElementById("add-rounded").onclick = () => createNode("rounded");

// ───────────────────────────────
// ノード生成
// ───────────────────────────────

function createNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);
  node.style.left = "50px";
  node.style.top = "50px";

  // 役割ベースの初期テキスト
  if (type === "rect") node.textContent = "アクション";
  if (type === "circle") node.textContent = "開始";
  if (type === "rounded") node.textContent = "分岐";

  document.getElementById("canvas").appendChild(node);
}

// ───────────────────────────────
// ドラッグ & 長押し編集
// ───────────────────────────────

let dragTarget = null;
let offsetX = 0;
let offsetY = 0;
let longPressTimer = null;
let startX = 0;
let startY = 0;
let moved = false;
let tapTimer = null;

document.addEventListener("pointerdown", (e) => {
  const node = e.target.closest(".node");
  if (!node) return;

  // 編集中ならドラッグしない
  if (node.isContentEditable) return;

  dragTarget = node;
  offsetX = e.offsetX;
  offsetY = e.offsetY;

  startX = e.pageX;
  startY = e.pageY;
  moved = false;

  // ① 長押し編集
  longPressTimer = setTimeout(() => {
    if (!moved) startEdit(node);
  }, 500);

  // ② 短いタップ編集（200ms以内に pointerup が来たら編集）
  tapTimer = Date.now();
});

document.addEventListener("pointermove", (e) => {
  if (!dragTarget) return;

  const dx = e.pageX - startX;
  const dy = e.pageY - startY;

  // 3px以上動いたらドラッグ開始 → 長押しキャンセル
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    moved = true;
    clearTimeout(longPressTimer);
  }

  if (moved && !dragTarget.isContentEditable) {
    dragTarget.style.left = (e.pageX - offsetX) + "px";
    dragTarget.style.top = (e.pageY - offsetY) + "px";
  }
});

document.addEventListener("pointerup", (e) => {
  clearTimeout(longPressTimer);

  const node = e.target.closest(".node");

  // ③ 短いタップ編集（200ms以内で、ほぼ動いてない）
  if (node && !moved && Date.now() - tapTimer < 200) {
    startEdit(node);
  }

  dragTarget = null;

  // 編集終了（外をタップ）
  if (!e.target.isContentEditable) {
    document.querySelectorAll(".node[contenteditable='true']").forEach(n => {
      finishEdit(n);
    });
  }
});

function startEdit(node) {
  node.contentEditable = "true";
  node.focus();

  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function finishEdit(node) {
  node.contentEditable = "false";
  node.blur();
}

// ───────────────────────────────
// 編集開始 / 編集終了
// ───────────────────────────────

function startEdit(node) {
  node.contentEditable = "true";
  node.focus();

  // キャレットを末尾へ
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function finishEdit(node) {
  node.contentEditable = "false";
  node.blur();
}

// ───────────────────────────────
// 矢印リンク（最小テンプレ）
// ───────────────────────────────

let linkStartNode = null;

document.addEventListener("pointerdown", (e) => {
  const node = e.target.closest(".node");
  if (!node) return;

  // 編集中はリンク操作しない
  if (node.isContentEditable) return;

  // すでに開始ノードが選ばれている → 2つ目を選んだらリンク作成
  if (linkStartNode && linkStartNode !== node) {
    createLink(linkStartNode, node);
    linkStartNode = null;
    return;
  }

  // 1つ目のノードを選択
  linkStartNode = node;
});

function createLink(from, to) {
  const svg = document.getElementById("link-layer");

  const x1 = from.offsetLeft + from.offsetWidth / 2;
  const y1 = from.offsetTop + from.offsetHeight / 2;
  const x2 = to.offsetLeft + to.offsetWidth / 2;
  const y2 = to.offsetTop + to.offsetHeight / 2;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#333");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("marker-end", "url(#arrow)");

  svg.appendChild(line);
}


