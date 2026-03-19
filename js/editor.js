// SVG を canvas の最前面に配置する
const canvas = document.getElementById("canvas");

const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("id", "link-layer");
svg.style.position = "absolute";
svg.style.top = "0";
svg.style.left = "0";
svg.style.width = "100%";
svg.style.height = "100%";
svg.style.zIndex = "9999";

svg.innerHTML = `
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 Z" fill="#333" />
    </marker>
  </defs>
`;

canvas.appendChild(svg); // ← ノードより後に追加されるので最前面になる

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

  // ▼ ノードを押したときだけノード処理
  if (node) {
    // ノード選択
    if (selectedNode === node) {
      node.classList.remove("selected");
      selectedNode = null;
    } else {
      if (selectedNode) selectedNode.classList.remove("selected");
      selectedNode = node;
      node.classList.add("selected");
    }

    // ドラッグ開始
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

    tapTimer = Date.now();

    // リンク処理
    handleLinkStart(node);

    return; // ← ノード処理はここで終わり
  }

  // ▼ ノード以外（矢印 or 空白）はここでは何もしない
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

  // ▼ 矢印選択イベント
  line.addEventListener("pointerdown", (e) => {
    e.stopPropagation(); // ノード pointerdown と競合しない

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
    x1 = dx > 0 ? fx + fw : fx;
    y1 = cy1;
  } else {
    y1 = dy > 0 ? fy + fh : fy;
    x1 = cx1;
  }

  let x2, y2;
  if (Math.abs(dx) > Math.abs(dy)) {
    x2 = dx > 0 ? tx : tx + tw;
    y2 = cy2;
  } else {
    y2 = dy > 0 ? ty : ty + th;
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
    .forEach(link => link.line.remove());

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
