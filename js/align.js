/* =========================================================
   align.js
   ツリー自動整列（横幅対応・兄弟グループ対応）
========================================================= */

document.getElementById("align-btn").addEventListener("click", autoAlignTree);

/* ─────────────────────────────
   ツリー構築
────────────────────────────── */

function buildTree() {
  const children = new Map();
  nodes.forEach(n => children.set(n, []));

  arrows.forEach(a => {
    children.get(a.fromNode).push(a.toNode);
  });

  return children;
}

function findParents(node) {
  return arrows
    .filter(a => a.toNode === node)
    .map(a => a.fromNode);
}

function findRoots(children) {
  const allChildren = new Set();
  children.forEach(list => list.forEach(c => allChildren.add(c)));
  return nodes.filter(n => !allChildren.has(n));
}

/* ─────────────────────────────
   深さ計算
────────────────────────────── */

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

/* ─────────────────────────────
   自動整列本体
────────────────────────────── */

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

  /* ① depth ごとの最大幅 */
  const colMaxWidth = new Map();
  columns.forEach((list, d) => {
    let maxW = 0;
    list.forEach(node => {
      const w = node.getBoundingClientRect().width;
      if (w > maxW) maxW = w;
    });
    colMaxWidth.set(d, maxW);
  });

  /* ② depth ごとの X 座標 */
  const colX = new Map();
  let acc = 40;
  const colGap = 60;

  const maxDepth = Math.max(...columns.keys());
  for (let d = 0; d <= maxDepth; d++) {
    colX.set(d, acc);
    acc += (colMaxWidth.get(d) || 0) + colGap;
  }

  /* ③ 各列を兄弟グループ単位で縦整列 */
  const marginY = 20;

  columns.forEach((list, d) => {
    const groups = [];
    const used = new Set();

    // 兄弟グループ化
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

    // 親の位置でソート
    groups.sort((g1, g2) => {
      const p1 = findParents(g1[0])[0];
      const p2 = findParents(g2[0])[0];
      const y1 = p1 ? parseInt(p1.style.top) : 0;
      const y2 = p2 ? parseInt(p2.style.top) : 0;
      return y1 - y2;
    });

    // グループごとに配置
    let currentY = 40;
    const x = colX.get(d);

    groups.forEach(group => {
      const parent = findParents(group[0])[0];
      if (parent) {
        const parentY = parseInt(parent.style.top);
        if (currentY < parentY) currentY = parentY;
      }

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
