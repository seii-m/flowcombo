/* =========================================================
   export-image.js
   PNG / PDF / キャンセル の 3択ダイアログ対応版
========================================================= */

document.getElementById("save-image-btn").addEventListener("click", () => {
  showDialog("画像として保存しますか？", [
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
   共通：キャンバスを PNG 化して返す
========================================================= */

function renderFlowAsCanvas() {
  const target = document.getElementById("canvas");

  return html2canvas(target, {
    backgroundColor: null,
    scale: 2
  }).then(canvas => {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h).data;

    let minX = w, minY = h, maxX = 0, maxY = 0;

    // 透明以外のピクセル領域を検出
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = imgData[idx + 3];
        if (a === 0) continue;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    // 余白 20px を追加してトリミング
    const pad = 20;
    const trimW = (maxX - minX + 1) + pad * 2;
    const trimH = (maxY - minY + 1) + pad * 2;

    const trimmed = document.createElement("canvas");
    trimmed.width = trimW;
    trimmed.height = trimH;

    const tctx = trimmed.getContext("2d");
    tctx.drawImage(
      canvas,
      minX - pad,
      minY - pad,
      trimW,
      trimH,
      0,
      0,
      trimW,
      trimH
    );

    // タイトル帯
    const title = titleInput.value || "FlowCombo";
    const fontSize = 32;
    const titlePad = 20;
    const titleHeight = fontSize + titlePad * 2;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = trimmed.width;
    finalCanvas.height = trimmed.height + titleHeight;

    const fctx = finalCanvas.getContext("2d");
    fctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // タイトル帯（白背景）
    fctx.fillStyle = "rgba(255,255,255,1)";
    fctx.fillRect(0, 0, finalCanvas.width, titleHeight);

    // タイトル文字（黒字＋白縁）
    fctx.font = `${fontSize}px sans-serif`;
    fctx.textAlign = "left";
    fctx.textBaseline = "top";

    fctx.lineWidth = 4;
    fctx.strokeStyle = "white";
    fctx.strokeText(title, titlePad, titlePad);

    fctx.fillStyle = "black";
    fctx.fillText(title, titlePad, titlePad);

    // 本体画像
    fctx.drawImage(trimmed, 0, titleHeight);

    return finalCanvas;
  });
}

/* =========================================================
   PNG 保存
========================================================= */

function saveAsPNG() {
  renderFlowAsCanvas().then(finalCanvas => {
    const title = titleInput.value || "FlowCombo";
    const url = finalCanvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = title + ".png";
    a.click();
  });
}

/* =========================================================
   PDF 保存（軽量化のみ）
========================================================= */

function saveAsPDF() {
  const target = document.getElementById("canvas");

  html2canvas(target, {
    backgroundColor: null,
    scale: 1   // ★ 軽量化：2 → 1 に変更
  }).then(canvas => {

    const title = titleInput.value || "FlowCombo";

    // ★ PNG → JPEG（軽量化の核心）
    const imgData = canvas.toDataURL("image/jpeg", 0.85);

    // A4 横向き（landscape）
    const pdf = new jspdf.jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const availableWidth = pageWidth - margin * 2;

    const ratio = canvas.height / canvas.width;
    const imgHeight = availableWidth * ratio;

    const x = margin;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "JPEG", x, y, availableWidth, imgHeight);
    pdf.save(title + ".pdf");
  });
}

