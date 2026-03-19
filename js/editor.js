// ───────────────────────────────
// SVG を canvas の最前面に配置
// ───────────────────────────────
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

canvas.appendChild(svg);

// ───────────────────────────────
// ノード追加
// ───────────────────────────────
document.getElementById("add-rect").onclick = () => createNode("rect");
document.getElementById("add-circle").onclick = () => createNode("circle");
document.getElementById("add-rounded").onclick = () => createNode("rounded");

function createNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);
  node.style.left = "50px";
  node.style.top = "50px";

  if (type === "rect") node.textContent = "アクション";
  if (type === "circle") node.textContent = "開始";
  if (type === "rounded") node.textContent = "分岐";

  canvas.appendChild(node);
}

// ───────────────────────────────
// 状態管理
// ───────────────────────────────
let dragTarget = null;
let offsetX = 0;
let offsetY = 0;
let startX = 0;
let startY = 0;
let moved = false;
let tapTimer = null;

let longPressTimer = null; // { editTimer, deleteTimer }

let linkStartNode = null;
const links = [];
let selectedNode = null;
let selectedLink = null;

// ───────────────────────────────
// pointerdown
// ───────────────────────────────
document.addEventListener("pointerdown", (e) => {
  const node = e.target.closest(".node");

  // ▼ ノードを押した
  if (node) {
    // 選択
    if (selectedNode === node) {
      node.classList.remove("selected");
      selectedNode = null;
    } else {
      if (selectedNode) selectedNode.classList.remove("selected");
      selectedNode = node;
      node.classList.add("selected");
    }
  
    // ドラッグ準備
    dragTarget = node;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    startX = e.pageX;
    startY = e.pageY;
    moved = false;
    tapTimer = Date.now();
  
    // 編集タイマー（500ms）
    const editTimer = setTimeout(() => {
      if (!moved) startEdit(node);
    }, 500);
  
    // 削除タイマー（800ms）
    const deleteTimer = setTimeout(() => {
      if (!moved) {
        deleteNode(node);
        selectedNode = null;
      }
    }, 800);
  
    // タイマーをまとめて保持
    longPressTimer = { editTimer, deleteTimer };
  
    // リンク処理
    handleLinkStart(node);
  
    return;
  }
});

// ───────────────────────────────
// pointermove
// ───────────────────────────────
document.addEventListener("pointermove", (e) => {
  if (!dragTarget) return;

  const dx = e.pageX - startX;
  const dy = e.pageY - startY;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    moved = true;
    if (longPressTimer) {
      clearTimeout(longPressTimer.editTimer);
      clearTimeout(longPressTimer.deleteTimer);
    }
  }

  if (moved && !dragTarget.isContentEditable) {
    dragTarget.style.left = (e.pageX - offsetX) + "px";
    dragTarget.style.top = (e.pageY - offsetY) + "px";
    updateLinksForNode(dragTarget);
  }
});

// ───────────────────────────────
// pointerup
// ───────────────────────────────
document.addEventListener("pointerup", (e) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer.editTimer);
    clearTimeout(longPressTimer.deleteTimer);
  }
  longPressTimer = null;
  
  const node = e.target.closest(".node");

  // 短タップ編集
  if (node && !moved && Date.now() - tapTimer < 200) {
    startEdit(node);
  }

  dragTarget = null;

  // 編集終了
  if (!e.target.isContentEditable) {
    document.querySelectorAll(".node[contenteditable='true']").forEach(n => finishEdit(n));
  }
});

// ───────────────────────────────
// 編集
// ───────────────────────────────
function startEdit(node) {
  node.contentEditable = "true";
  node.focus();
}

function finishEdit(node) {
  node.contentEditable = "false";
  node.blur();
}

// ───────────────────────────────
// リンク作成
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
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#333");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("marker-end", "url(#arrow)");

  // ▼ 矢印短タップ選択＋長押し削除
  line.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    // 選択
    if (selectedLink === line) {
      line.classList.remove("selected");
      selectedLink = null;
    } else {
      if (selectedLink) selectedLink.classList.remove("selected");
      selectedLink = line;
      line.classList.add("selected");
    }

    // 長押し削除
    const timer = setTimeout(() => {
      deleteLink(line);
      selectedLink = null;
    }, 700);

    line.addEventListener("pointerup", () => clearTimeout(timer), { once: true });
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
// 削除
// ───────────────────────────────
function deleteNode(node) {
  links
    .filter(link => link.from === node || link.to === node)
    .forEach(link => link.line.remove());

  for (let i = links.length - 1; i >= 0; i--) {
    if (links[i].from === node || links[i].to === node) links.splice(i, 1);
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
