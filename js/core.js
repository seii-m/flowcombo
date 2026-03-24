/* =========================================================
   core.js
   FlowCombo の基礎：変数定義・初期化・共通処理
========================================================= */

// DOM 取得
const canvas = document.getElementById("canvas");
const modeButtons = document.querySelectorAll(".mode-btn");
const nodeButtons = document.querySelectorAll(".node-btn");
const importBtn = document.getElementById("import-btn");
const exportBtn = document.getElementById("export-btn");
const importArea = document.getElementById("import-area");
const titleInput = document.getElementById("flow-title");

// グローバル状態
let mode = "view";          // view / edit / move / link / delete
let nodes = [];             // ノード一覧
let arrows = [];            // 矢印一覧
let dragState = null;       // PCドラッグ用
let moveTarget = null;      // タッチ移動用
let linkStartNode = null;   // 矢印開始ノード
let deleteSelected = null;  // 削除対象

// タイトル変更 → 自動保存
titleInput.addEventListener("input", () => {
  saveData();
});

/* =========================================================
   共通：ノード選択解除
========================================================= */
function clearNodeSelections() {
  nodes.forEach(n => {
    n.classList.remove(
      "selected-move",
      "selected-link",
      "selected-edit",
      "selected-delete"
    );
  });
}

/* =========================================================
   共通：キャンバスサイズ拡張
========================================================= */
function ensureCanvasSize(x, y) {
  const margin = 500;
  if (x + margin > canvas.scrollWidth) {
    canvas.style.width = (x + margin) + "px";
  }
  if (y + margin > canvas.scrollHeight) {
    canvas.style.height = (y + margin) + "px";
  }
}

/* =========================================================
   共通：ノードに関連する矢印の更新
========================================================= */
function updateArrowsForNode(node) {
  arrows.forEach(arrow => {
    if (arrow.fromNode === node || arrow.toNode === node) {
      updateArrowPosition(arrow);
    }
  });
}

/* =========================================================
   初期ロード
========================================================= */
window.addEventListener("load", () => {
  loadData();

  // 初期スクロール位置（中央寄せ）
  canvas.scrollLeft = 1200;
  canvas.scrollTop = 1200;
});
