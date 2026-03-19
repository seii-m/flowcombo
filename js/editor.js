// ───────────────────────────────
// ノード追加ボタン
// ───────────────────────────────

document.getElementById("add-rect").onclick = () => createNode("rect");
document.getElementById("add-circle").onclick = () => createNode("circle");
document.getElementById("add-rounded").onclick = () => createNode("rounded");

document.getElementById("export-json").onclick = () => {
  console.log("Export");
};

document.getElementById("import-json").onclick = () => {
  console.log("Import");
};

// ───────────────────────────────
// ノード生成
// ───────────────────────────────

function createNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);
  node.style.left = "50px";
  node.style.top = "50px";

  // とりあえず仮の文字
  if (type === "rect") node.textContent = "四角";
  if (type === "circle") node.textContent = "丸";
  if (type === "rounded") node.textContent = "分岐";

  document.getElementById("canvas").appendChild(node);
}

// ───────────────────────────────
// ドラッグ移動（スマホ対応）
// ───────────────────────────────

let dragTarget = null;
let offsetX = 0;
let offsetY = 0;

document.addEventListener("pointerdown", (e) => {
  if (e.target.classList.contains("node")) {
    dragTarget = e.target;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  }
});

document.addEventListener("pointermove", (e) => {
  if (dragTarget) {
    dragTarget.style.left = (e.pageX - offsetX) + "px";
    dragTarget.style.top = (e.pageY - offsetY) + "px";
  }
});

document.addEventListener("pointerup", () => {
  dragTarget = null;
});

// ───────────────────────────────
// テキスト編集（インライン編集）
// ───────────────────────────────

document.addEventListener("pointerdown", (e) => {
  // 既存のドラッグ処理
  if (e.target.classList.contains("node")) {
    // 編集中ならドラッグしない
    if (e.target.isContentEditable) return;

    dragTarget = e.target;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  }
});

// ノードをダブルタップ/ダブルクリックで編集開始
document.addEventListener("dblclick", (e) => {
  if (e.target.classList.contains("node")) {
    startEdit(e.target);
  }
});

// スマホ向け：長押しで編集開始
let longPressTimer = null;

document.addEventListener("pointerdown", (e) => {
  if (e.target.classList.contains("node")) {
    longPressTimer = setTimeout(() => {
      startEdit(e.target);
    }, 500); // 0.5秒長押しで編集
  }
});

document.addEventListener("pointerup", () => {
  clearTimeout(longPressTimer);
});

// 編集開始
function startEdit(node) {
  node.contentEditable = "true";
  node.focus();

  // キャレットを末尾に移動
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // 編集中はドラッグ禁止
  dragTarget = null;

  // Enterで確定
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit(node);
    }
  });
}

// 編集終了
function finishEdit(node) {
  node.contentEditable = "false";
  node.blur();
}




