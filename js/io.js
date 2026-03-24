/* =========================================================
   io.js
   JSON 保存・読込・localStorage・ファイル入出力
========================================================= */

/* ─────────────────────────────
   保存ボタン（JSONファイル or テキスト欄）
────────────────────────────── */

exportBtn.addEventListener("click", () => {
  showDialog("フローを出力しますか？", [
    {
      label: "JSON ファイルとして保存",
      onClick: () => saveAsJSONFile()
    },
    {
      label: "テキスト欄へ出力",
      onClick: () => saveToTextArea()
    },
    {
      label: "キャンセル",
      onClick: () => {}
    }
  ]);
});

/* JSON ファイルとして保存 */
function saveAsJSONFile() {
  const data = collectFlowData();
  const json = JSON.stringify(data, null, 2);

  // クリップボードコピー（可能なら）
  navigator.clipboard?.writeText(json).catch(() => {});

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = (titleInput.value || "flowcombo") + ".json";
  a.click();

  URL.revokeObjectURL(url);
}

/* テキスト欄へ出力 */
function saveToTextArea() {
  const data = collectFlowData();
  importArea.value = JSON.stringify(data, null, 2);

  // クリップボードコピー（可能なら）
  navigator.clipboard?.writeText(importArea.value).catch(() => {});
}

/* FlowCombo のデータをまとめる共通関数 */
function collectFlowData() {
  return {
    version: 1,
    title: titleInput.value || "無題のフロー",
    nodes: nodes.map(n => ({
      id: n.dataset.id,
      type: n.dataset.type,
      text: n.innerHTML,
      left: n.style.left,
      top: n.style.top
    })),
    arrows: arrows.map(a => ({
      from: a.fromNode.dataset.id,
      to: a.toNode.dataset.id
    }))
  };
}

/* ─────────────────────────────
   読込ボタン（JSONファイル or テキスト欄）
────────────────────────────── */

importBtn.addEventListener("click", () => {
  showDialog("どこから読み込みますか？", [
    {
      label: "JSON ファイルを読み込む",
      onClick: () => document.getElementById("file-input").click()
    },
    {
      label: "テキスト欄から読み込む",
      onClick: () => loadFromTextArea()
    },
    {
      label: "キャンセル",
      onClick: () => {}
    }
  ]);
});

/* テキスト欄から読み込む */
function loadFromTextArea() {
  const text = importArea.value.trim();
  if (!text) {
    alert("テキスト欄が空です");
    return;
  }
  try {
    const data = JSON.parse(text);
    loadFromData(data);
  } catch {
    alert("JSON の形式が不正です");
  }
}

/* ファイル読込 */
document.getElementById("file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadFromData(data);
    } catch {
      alert("JSON の形式が不正です");
    }
  };
  reader.readAsText(file);
});

/* ─────────────────────────────
   JSON → FlowCombo へ反映
────────────────────────────── */

function loadFromData(data) {
  // 既存削除
  nodes.forEach(n => n.remove());
  arrows.forEach(a => a.wrapper.remove());
  nodes = [];
  arrows = [];
  deleteSelected = null;
  linkStartNode = null;

  titleInput.value = data.title || "無題のフロー";

  if (!data || !Array.isArray(data.nodes)) return;

  const nodeMap = new Map();

  // ノード復元
  data.nodes.forEach(n => {
    const node = document.createElement("div");
    node.dataset.id = n.id;
    node.dataset.type = n.type;
    node.classList.add("node", n.type);

    node.innerHTML = (n.text || "")
      .replace(/<div>/g, "<br>")
      .replace(/<\/div>/g, "");

    node.style.left = n.left || "100px";
    node.style.top = n.top || "100px";

    canvas.appendChild(node);
    nodes.push(node);

    node.addEventListener("pointerdown", onNodePointerDown);
    nodeMap.set(n.id, node);
  });

  // 矢印復元
  data.arrows.forEach(a => {
    const fromNode = nodeMap.get(a.from);
    const toNode = nodeMap.get(a.to);
    if (fromNode && toNode) createArrow(fromNode, toNode);
  });

  saveData();
}

/* ─────────────────────────────
   localStorage 保存
────────────────────────────── */

function saveData() {
  const data = collectFlowData();
  localStorage.setItem("flowcombo-data", JSON.stringify(data));
}

/* ─────────────────────────────
   localStorage 読込
────────────────────────────── */

function loadData() {
  const json = localStorage.getItem("flowcombo-data");
  if (!json) return;

  try {
    const data = JSON.parse(json);

    if (!data.version || data.version < 1) {
      console.warn("古いバージョンのデータを検出。必要なら変換処理を追加できます。");
    }

    loadFromData(data);
  } catch (e) {
    console.error("自動保存データの読み込みに失敗:", e);
  }
}

/* バージョン変換（必要なら拡張） */
function migrateData(data) {
  return data;
}
