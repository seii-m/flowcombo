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

  if (type === "rect") node.textContent = "アクション";
  if (type === "circle") node.textContent = "開始";
  if (type === "rounded") node.textContent = "分岐";

  document.getElementById("canvas").appendChild(node);
}

// ───────────────────────────────
// ドラッグ & 編集（短タップ / 長押し）
// ───────────────────────────────

let dragTarget = null;
let offsetX = 0;
let offsetY = 0;
let longPressTimer = null;
let startX = 0;
let startY = 0;
let moved = false;
let tapTimer = null;

let linkStartNode = null;
const links = []; // { from, to, line }

let selectedNode = null;
let selectedLink = null;

document.addEventListener("pointerdown", (e) => {
  const node = e.target.closest(".node");

  // ▼ リンク線クリック時のために、line 選択は SVG 側でやる（後述）

  if (!node) return;

  // 編集中ならドラッグしない
  if (node.isContentEditable) return;

  // ノード選択トグル（シングルタップで十分にする）
  if (selectedNode === node) {
    node.classList.remove("selected");
    selectedNode = null;
  } else {
    if (selectedNode) selectedNode.classList.remove("selected");
    selectedNode = node;
    node.classList.add("selected");
  }

  dragTarget = node;
  offsetX = e.offsetX;
  offsetY = e.offsetY;

  startX = e.pageX;
  startY = e.pageY;
  moved = false;

  // 長押し編集
  longPressTimer = setTimeout(() => {
    if (!moved) startEdit(node);
  }, 500);

  // 短タップ編集
  tapTimer = Date.now();

  // リンク処理
  handleLinkStart(node);
});

document.addEventListener("pointermove", (e) => {
  if (!dragTarget) return;

  const dx = e.pageX - startX;
  const dy = e.pageY - startY;

  // 3px以上動いたらドラッグ開始
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    moved = true;
    clearTimeout(longPressTimer);
  }

  if (moved && !dragTarget.isContentEditable) {
    dragTarget.style.left = (e.pageX - offsetX) + "px";
    dragTarget.style.top = (e.pageY - offsetY) + "px";

    // リンク追従
    updateLinksForNode(dragTarget);
  }
});

document.addEventListener("pointerup", (e) => {
  clearTimeout(longPressTimer);

  const node = e.target.closest(".node");

  // 短タップ編集
  if (node && !moved && Date.now() - tapTimer < 200) {
    startEdit(node);
  }

  dragTarget = null;

  // 編集終了（外タップ）
  if (!e.target.isContentEditable) {
    document.querySelectorAll(".node[contenteditable='true']").forEach(n => {
      finishEdit(n);
    });
  }
});

// ───────────────────────────────
// 編集開始 / 編集終了
// ───────────────────────────────

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
// 矢印リンク管理
// ───────────────────────────────

function handleLinkStart(node) {
  if (node.isContentEditable) return;

  if (linkStartNode && linkStartNode !== node) {
    createLink(linkStartNode, node);
    linkStartNode = null;
    return;
  }

  linkStartNode = node;
}

function createLink(from, to) {
  const svg = document.getElementById("link-layer");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#333");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("marker-end", "url(#arrow)");

  // ▼ ここが重要：リンク選択イベントを line に付ける
  line.addEventListener("pointerdown", (e) => {
    e.stopPropagation(); // ノードの pointerdown と競合しないように

    if (selectedLink === line) {
      line.classList.remove("selected");
      selectedLink = null;
    } else {
      if (selectedLink) selectedLink.classList.remove("selected");
      selectedLink = line;
      line.classList.add("selected");
    }
  });

  svg.appendChild(line);

  links.push({ from, to, line });

  updateLinkPosition(from, to, line);
}

function updateLinkPosition(from, to, line) {
  const fx = from.offsetLeft;
  const fy = from.offsetTop;
  const fw = from.offsetWidth;
  const fh = from.offsetHeight;

  const tx = to.offsetLeft;
  const ty = to.offsetTop;
  const tw = to.offsetWidth;
  const th = to.offsetHeight;

  const cx1 = fx + fw / 2;
  const cy1 = fy + fh / 2;
  const cx2 = tx + tw / 2;
  const cy2 = ty + th / 2;

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;

  let x1, y1;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) x1 = fx + fw;
    else x1 = fx;
    y1 = cy1;
  } else {
    if (dy > 0) y1 = fy + fh;
    else y1 = fy;
    x1 = cx1;
  }

  let x2, y2;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) x2 = tx;
    else x2 = tx + tw;
    y2 = cy2;
  } else {
    if (dy > 0) y2 = ty;
    else y2 = ty + th;
    x2 = cx2;
  }

  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
}

function updateLinksForNode(node) {
  links.forEach(link => {
    if (link.from === node || link.to === node) {
      updateLinkPosition(link.from, link.to, link.line);
    }
  });
}

// ───────────────────────────────
// ノード / リンク削除（Deleteキー）
// ───────────────────────────────

document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete") return;

  if (selectedNode) {
    deleteNode(selectedNode);
    selectedNode = null;
    return;
  }

  if (selectedLink) {
    deleteLink(selectedLink);
    selectedLink = null;
    return;
  }
});

function deleteNode(node) {
  // 関連リンク削除
  links
    .filter(link => link.from === node || link.to === node)
    .forEach(link => {
      link.line.remove();
    });

  for (let i = links.length - 1; i >= 0; i--) {
    if (links[i].from === node || links[i].to === node) {
      links.splice(i, 1);
    }
  }

  node.remove();
}

function deleteLink(line) {
  line.remove();

  for (let i = links.length - 1; i >= 0; i--) {
    if (links[i].line === line) {
      links.splice(i, 1);
      break;
    }
  }
}
