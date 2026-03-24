/* =========================================================
   dialog.js
   FlowCombo 共通 3択ダイアログ
========================================================= */

function showDialog(title, options) {
  const dialog = document.getElementById("fc-dialog");
  const titleEl = document.getElementById("fc-dialog-title");
  const btnArea = document.getElementById("fc-dialog-buttons");

  titleEl.textContent = title;
  btnArea.innerHTML = "";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      dialog.classList.add("hidden");
      opt.onClick();
    });
    btnArea.appendChild(btn);
  });

  dialog.classList.remove("hidden");
}
