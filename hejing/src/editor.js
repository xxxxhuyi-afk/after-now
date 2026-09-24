const KEY = "after-now-hejing-references";
const defaults = [
  { title: "挑高前厅", detail: "木饰面 · 格栅 · 周边灯带" },
  { title: "拱形展廊", detail: "深灰骨架 · 连续拱肋 · 发光面" },
  { title: "内嵌展龛", detail: "白色凹室 · 悬挂杆 · 独立展台" },
];
const refs = [...document.querySelectorAll(".ref")];
const saved = JSON.parse(localStorage.getItem(KEY) || "null") || defaults;
const save = () => localStorage.setItem(KEY, JSON.stringify(saved));
refs.forEach((card, index) => {
  const data = saved[index] || defaults[index];
  const text = card.querySelector("div");
  const title = card.querySelector("h2");
  const detail = card.querySelector("p");
  title.textContent = data.title;
  detail.textContent = data.detail;
  const edit = document.createElement("button");
  edit.className = "ref-edit";
  edit.type = "button";
  edit.textContent = "编辑来源";
  text.append(edit);
  const panel = document.createElement("div");
  panel.className = "ref-editor";
  panel.hidden = true;
  panel.innerHTML = `<label>名称<input value=""></label><label>说明<input value=""></label><label class="upload">替换图片<input type="file" accept="image/*"></label><button type="button">保存来源</button>`;
  card.append(panel);
  const inputs = panel.querySelectorAll("input");
  inputs[0].value = data.title; inputs[1].value = data.detail;
  edit.onclick = () => { panel.hidden = !panel.hidden; };
  panel.querySelector("button").onclick = () => {
    data.title = inputs[0].value.trim() || defaults[index].title;
    data.detail = inputs[1].value.trim() || defaults[index].detail;
    title.textContent = data.title; detail.textContent = data.detail;
    const file = inputs[2].files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = () => { card.querySelector("img").src = reader.result; data.image = reader.result; save(); }; reader.readAsDataURL(file); } else save();
    panel.hidden = true;
  };
  if (data.image) card.querySelector("img").src = data.image;
});
