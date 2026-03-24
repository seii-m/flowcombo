/* =========================================================
   nodes.js
   ノード追加・編集・移動・pointerdown
========================================================= */

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

  // 種類ごとの初期位置
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
   ノード pointerdown
────────────────────────────── */

function onNodePointerDown(e) {
  const node = e.currentTarget;
  e.stopPropagation();

  if (mode === "view") return;

  /* 編集モード */
  if (mode === "edit") {
    clearNodeSelections();
    node.classList.add("selected-edit");
    startEdit(node);
    return;
  }

  /* 移動モード */
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

  /* 矢印モード */
  if (mode === "link") {
    clearNodeSelections();
    node.classList.add("selected-link");
    handleLink(node);

    // 2個目を選んだら解除
    if (linkStartNode === null) {
      clearNodeSelections();
    }
    return;
  }

  /* 削除モード */
  if (mode === "delete") {
    clearNodeSelections();
    node.classList.add("selected-delete");
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

  // 全選択
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
   PCドラッグ移動
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
   タッチ移動（キャンバスクリックで確定）
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
