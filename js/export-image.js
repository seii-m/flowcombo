/* =========================================================
   export-image.js
   PNG / PDF / キャンセル の 3択ダイアログ対応版
========================================================= */

document.getElementById("save-image-btn").addEventListener("click", () => {
  showDialog("保存形式を選択してください", [
    {
      label: "PNG で保存",
      onClick: () => saveAsPNG()
    },
    {
      label: "PDF で保存",
      onClick: () => saveAsPDF()
    },
    {
      label: "キャンセル",
      onClick: () => {}
    }
  ]);
});

/* =========================================================
   PNG 保存（従来の画像方式）
========================================================= */

function saveAsPNG() {
  const target = document.getElementById("canvas");

  html2canvas(target, {
    backgroundColor: null,
    scale: 2
  }).then(canvas => {
    const title = titleInput.value || "FlowCombo";
    const url = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = title + ".png";
    a.click();
  });
}

/* =========================================================
   PDF 保存（ベクター＋テキスト方式）
========================================================= */

function saveAsPDF() {
  const title = titleInput.value || "FlowCombo";

  const pdf = new jspdf.jsPDF({
    orientation: "landscape",
    unit: "px",
    format: "a4"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;

  /* タイトル帯 */
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 60, "F");

  pdf.setFontSize(28);
  pdf.text(title, margin, 40);

  /* ノード描画 */
  pdf.setFontSize(16);

  nodes.forEach(node => {
    const x = parseInt(node.style.left);
    const y = parseInt(node.style.top) + 80;

    const w = node.offsetWidth;
    const h = node.offsetHeight;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.2);
    pdf.rect(x, y, w, h);

    const lines = node.innerText.split("\n");
    let ty = y + 22;

    lines.forEach(line => {
      pdf.text(line, x + 10, ty);
      ty += 20;
    });
  });

  /* 矢印描画（SVG の line から座標を取得） */
  arrows.forEach(a => {
    const line = a.line;
    if (!line) return;

    const x1 = Number(line.getAttribute("x1"));
    const y1 = Number(line.getAttribute("y1")) + 80;
    const x2 = Number(line.getAttribute("x2"));
    const y2 = Number(line.getAttribute("y2")) + 80;

    // 座標が不正ならスキップ
    if (
      isNaN(x1) || isNaN(y1) ||
      isNaN(x2) || isNaN(y2)
    ) return;

    // 線
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.line(x1, y1, x2, y2);

    // 矢印（三角形）
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 10;

    const ax = x2 - size * Math.cos(angle - Math.PI / 6);
    const ay = y2 - size * Math.sin(angle - Math.PI / 6);

    const bx = x2 - size * Math.cos(angle + Math.PI / 6);
    const by = y2 - size * Math.sin(angle + Math.PI / 6);

    pdf.setFillColor(0, 0, 0);
    pdf.triangle(x2, y2, ax, ay, bx, by, "F");
  });

  pdf.save(title + ".pdf");
}

