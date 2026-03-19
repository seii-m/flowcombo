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

  if (type === "rect") node.textContent = "四角";
  if (type === "circle") node.textContent = "丸";
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

  // 長押しで編集開始（動かなかった場合のみ）
  longPressTimer = setTimeout(() => {
    if (!moved) startEdit(node);
  }, 500);
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
  dragTarget = null;

  // 編集終了（外をタップして指を離したとき）
  if (!e.target.isContentEditable) {
    document.querySelectorAll(".node[contenteditable='true']").forEach(n => {
      finishEdit(n);
    });
  }
});

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
