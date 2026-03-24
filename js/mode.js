/* =========================================================
   mode.js
   モード切替（view / edit / move / link / delete）
========================================================= */

// モードボタンのクリック
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    clearNodeSelections();

    const newMode = btn.dataset.mode;

    // 同じボタン → 閲覧に戻す
    if (mode === newMode) {
      setMode("view");
    } else {
      setMode(newMode);
    }
  });
});

/* =========================================================
   モード設定
========================================================= */
function setMode(newMode) {
  mode = newMode;

  // ボタンの active 切り替え
  modeButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  // 削除選択解除
  clearDeleteSelection();

  // 編集モード終了
  finishEditAll();

  // 矢印開始ノードリセット
  linkStartNode = null;

  // delete モード時だけ矢印を選択可能にする
  if (mode === "delete") {
    arrows.forEach(a => a.wrapper.classList.add("can-select"));
  } else {
    arrows.forEach(a => a.wrapper.classList.remove("can-select"));
  }
}

/* =========================================================
   削除選択解除（delete.js と連携）
========================================================= */
function clearDeleteSelection() {
  deleteSelected = null;

  nodes.forEach(n => n.classList.remove("selected-delete"));
  arrows.forEach(a => a.wrapper.classList.remove("selected-delete"));
}
