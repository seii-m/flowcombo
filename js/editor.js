document.getElementById("add-rect").onclick = () => {
  console.log("四角を追加");
};

document.getElementById("add-circle").onclick = () => {
  console.log("丸を追加");
};

document.getElementById("add-diamond").onclick = () => {
  console.log("菱形を追加");
};

document.getElementById("export-json").onclick = () => {
  console.log("Export");
};

document.getElementById("import-json").onclick = () => {
  console.log("Import");
};

function createNode(type) {
  const node = document.createElement("div");
  node.classList.add("node", type);
  node.style.left = "50px";
  node.style.top = "50px";
  node.textContent = type; // とりあえず仮の文字

  document.getElementById("canvas").appendChild(node);
}

document.getElementById("add-rect").onclick = () => createNode("rect");
document.getElementById("add-circle").onclick = () => createNode("circle");
document.getElementById("add-diamond").onclick = () => createNode("diamond");


