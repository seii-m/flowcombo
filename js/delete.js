/* =========================================================
   delete.js
   削除モード：ノード削除・矢印削除
========================================================= */

/* ─────────────────────────────
   ノード削除
────────────────────────────── */

function handleDeleteNode(node) {
  // 2回目のクリック → 削除確定
  if (deleteSelected === node) {

    // ノードに紐づく矢印を削除
    arrows = arrows.filter(a => {
      if (a.fromNode === node || a.toNode === node) {
        a.wrapper.remove();
        return false;
      }
      return true;
    });

    // ノード削除
    nodes = nodes.filter(n => n !== node);
    node.remove();

    deleteSelected = null;
    saveData();
    return;
  }

  // 1回目のクリック → 選択状態にする
  clearDeleteSelection();
  deleteSelected = node;
  node.classList.add("selected-delete");
}

/* ─────────────────────────────
   矢印削除
────────────────────────────── */

function handleDeleteArrow(arrow) {
  // 2回目のクリック → 削除確定
  if (deleteSelected === arrow) {
    arrow.wrapper.remove();
    arrows = arrows.filter(a => a !== arrow);
    deleteSelected = null;
    saveData();
    return;
  }

  // 1回目のクリック → 選択状態にする
  clearDeleteSelection();
  deleteSelected = arrow;
  arrow.wrapper.classList.add("selected-delete");
}
