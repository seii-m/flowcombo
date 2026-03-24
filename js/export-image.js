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
   PDF 保存（PNG → PDF の軽量版）
========================================================= */

function saveAsPDF() {
  const title = titleInput.value || "FlowCombo";
  const target = document.getElementById("canvas");

  // ガイドテキストがあるなら一時的に非表示
  const guide = document.getElementById("fc-guide");
  const guideWasVisible = guide && guide.style.display !== "none";
  if (guide) guide.style.display = "none";

  html2canvas(target, {
    backgroundColor: null,
    scale: 1   // ★ 軽量化：2 → 1
  }).then(canvas => {

    // ガイドを元に戻す
    if (guide && guideWasVisible) guide.style.display = "block";

    // JPEG に変換（PNG より軽い）
    const imgData = canvas.toDataURL("image/jpeg", 0.85);

    // A4 横向き PDF（px）
    const pdf = new jspdf.jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 40;
    const availableWidth = pageWidth - margin * 2;

    const ratio = canvas.height / canvas.width;
    const imgHeight = availableWidth * ratio;

    const x = margin;
    const y = (pageHeight - imgHeight) / 2;

    // タイトル帯
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 60, "F");

    pdf.setFontSize(28);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, margin, 40);

    // 画像貼り付け
    pdf.addImage(imgData, "JPEG", x, y + 20, availableWidth, imgHeight);

    pdf.save(title + ".pdf");
  });
}


