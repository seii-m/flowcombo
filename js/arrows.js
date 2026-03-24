/* =========================================================
   arrows.js
   矢印生成・更新・リンクモード処理
========================================================= */

/* ─────────────────────────────
   リンクモード処理
────────────────────────────── */

function handleLink(node) {
  // 1個目のノード
  if (!linkStartNode) {
    linkStartNode = node;
    return;
  }

  // 同じノードを2回押した → キャンセル
  if (linkStartNode === node) {
    linkStartNode = null;
    return;
  }

  // 矢印作成
  createArrow(linkStartNode, node);

  linkStartNode = null;
  saveData();
}

/* ─────────────────────────────
   矢印生成
────────────────────────────── */

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

  // 削除モード時のクリック
  wrapper.addEventListener("pointerdown", e => {
    e.stopPropagation();
    if (mode === "delete") {
      handleDeleteArrow(arrow);
    }
  });
}

/* ─────────────────────────────
   矢印位置更新
────────────────────────────── */

let currentScale = 1; // ピンチズーム用

function updateArrowPosition(arrow) {
  const from = arrow.fromNode;
  const to = arrow.toNode;
  if (!from || !to) return;

  const scale = currentScale || 1;

  const rectCanvas = canvas.getBoundingClientRect();
  const rectFrom = from.getBoundingClientRect();
  const rectTo = to.getBoundingClientRect();

  // ノード中心
  const fromCX = rectFrom.left + rectFrom.width / 2;
  const fromCY = rectFrom.top + rectFrom.height / 2;
  const toCX   = rectTo.left + rectTo.width / 2;
  const toCY   = rectTo.top + rectTo.height / 2;

  // 方向
  const dx = toCX - fromCX;
  const dy = toCY - fromCY;

  /* ─────────────────────────────
     出発点（fromNode 側）
  ────────────────────────────── */
  let startX, startY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 横方向が強い → 左右から出す
    if (dx > 0) {
      startX = rectFrom.right;
      startY = rectFrom.top + rectFrom.height / 2;
    } else {
      startX = rectFrom.left;
      startY = rectFrom.top + rectFrom.height / 2;
    }
  } else {
    // 縦方向が強い → 上下から出す
    if (dy > 0) {
      startX = rectFrom.left + rectFrom.width / 2;
      startY = rectFrom.bottom;
    } else {
      startX = rectFrom.left + rectFrom.width / 2;
      startY = rectFrom.top;
    }
  }

  /* ─────────────────────────────
     終点（toNode 側）
  ────────────────────────────── */
  let endX, endY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      endX = rectTo.left;
      endY = rectTo.top + rectTo.height / 2;
    } else {
      endX = rectTo.right;
      endY = rectTo.top + rectTo.height / 2;
    }
  } else {
    if (dy > 0) {
      endX = rectTo.left + rectTo.width / 2;
      endY = rectTo.top;
    } else {
      endX = rectTo.left + rectTo.width / 2;
      endY = rectTo.bottom;
    }
  }

  /* ─────────────────────────────
     canvas 座標へ変換
  ────────────────────────────── */
  const x1 = (startX - rectCanvas.left) / scale + canvas.scrollLeft;
  const y1 = (startY - rectCanvas.top)  / scale + canvas.scrollTop;
  const x2 = (endX   - rectCanvas.left) / scale + canvas.scrollLeft;
  const y2 = (endY   - rectCanvas.top)  / scale + canvas.scrollTop;

  // CSS矢印描画
  const dx2 = x2 - x1;
  const dy2 = y2 - y1;
  const length = Math.hypot(dx2, dy2);
  const angle = Math.atan2(dy2, dx2) * 180 / Math.PI;

  arrow.wrapper.style.left = `${x1}px`;
  arrow.wrapper.style.top  = `${y1}px`;
  arrow.line.style.width   = `${length}px`;
  arrow.line.style.transform = `rotate(${angle}deg)`;
}

/* ─────────────────────────────
   角丸矩形のエッジ計算（未使用だが保持）
────────────────────────────── */

function getRoundedRectEdgePoint(rect, cx, cy, tx, ty, radius = 12) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy);
  const nx = dx / len;
  const ny = dy / len;

  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const innerW = hw - radius;
  const innerH = hh - radius;

  let t = Infinity;

  if (nx !== 0) {
    const tx1 = (-innerW) / nx;
    const tx2 = ( innerW) / nx;
    t = Math.min(tx1 > 0 ? tx1 : Infinity, tx2 > 0 ? tx2 : Infinity, t);
  }

  if (ny !== 0) {
    const ty1 = (-innerH) / ny;
    const ty2 = ( innerH) / ny;
    t = Math.min(ty1 > 0 ? ty1 : Infinity, ty2 > 0 ? ty2 : Infinity, t);
  }

  const px = cx + nx * t;
  const py = cy + ny * t;

  const dx2 = Math.abs(px - rect.left - hw);
  const dy2 = Math.abs(py - rect.top - hh);

  if (dx2 > innerW && dy2 > innerH) {
    const signX = Math.sign(nx);
    const signY = Math.sign(ny);
    const cx2 = rect.left + hw + signX * innerW;
    const cy2 = rect.top + hh + signY * innerH;

    const ex = cx2 - cx;
    const ey = cy2 - cy;
    const b = ex * nx + ey * ny;
    const c = ex * ex + ey * ey - radius * radius;
    const disc = b * b - c;
    const t2 = b - Math.sqrt(disc);

    return { x: cx + nx * t2, y: cy + ny * t2 };
  }

  return { x: px, y: py };
}
