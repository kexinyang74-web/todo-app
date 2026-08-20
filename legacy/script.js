/* =========================================================
   待办事项应用 - 核心逻辑
   数据结构：一个数组，每条任务是 { id, text, done, priority }
   例如：[ { id: 1, text: "买牛奶", done: false, priority: "mid" } ]
   priority 优先级："high" 高 / "mid" 中 / "low" 低
   ========================================================= */

// ---------- 1. 获取页面元素 ----------
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("priority-select");
const list = document.getElementById("todo-list");
const statUndone = document.getElementById("stat-undone");
const statDone = document.getElementById("stat-done");
const emptyTip = document.getElementById("empty-tip");
const btnClearDone = document.getElementById("btn-clear-done");
const btnClearAll = document.getElementById("btn-clear-all");

// localStorage 的键名（相当于数据库的表名）
const STORAGE_KEY = "todo-list";

// ---------- 2. 数据的读取与保存 ----------

// 读取：页面打开时，从本地存储把数据取出来
// 为什么要 try/catch？万一存储的数据损坏，解析会报错，
// 报错时就返回空数组，页面仍能正常打开
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    // 兼容旧数据：优先级功能上线前保存的任务没有 priority 字段，
    // 这里统一补上默认值 "mid"，老用户的数据也能正常显示
    return data.map((t) => ({ priority: "mid", ...t }));
  } catch (e) {
    return [];
  }
}

// 保存：每次数据变化后，把数组转成 JSON 字符串存进去
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// 全局的任务数组，页面打开时加载一次
let todos = loadTodos();

// ---------- 3. 添加任务（带优先级） ----------
form.addEventListener("submit", (e) => {
  // 表单提交默认会刷新页面，这里我们用自己的 JS 逻辑处理，
  // 所以要先阻止默认行为
  e.preventDefault();

  const text = input.value.trim(); // trim() 去掉首尾空格

  // 输入为空（或全是空格）时不添加，直接把焦点还给输入框
  if (!text) {
    input.focus();
    return;
  }

  // 新任务对象：id 用当前时间戳，保证每条任务的编号不重复
  todos.push({
    id: Date.now(),
    text: text,
    done: false,
    priority: prioritySelect.value, // "high" / "mid" / "low"
  });

  input.value = "";               // 清空输入框，方便连续添加
  prioritySelect.value = "mid";    // 优先级重置为"中"，下次添加默认中
  input.focus();

  saveTodos();  // 存到本地
  render();     // 重新绘制列表
});

// ---------- 4. 清空已完成 ----------
// filter 只保留"未完成"的任务，已完成的就全部去掉了
btnClearDone.addEventListener("click", () => {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  render();
});

// ---------- 5. 全部清空（带确认） ----------
btnClearAll.addEventListener("click", () => {
  if (todos.length === 0) return; // 没有任务时什么都不做

  // confirm() 是浏览器自带的确认弹窗：
  // 点"确定"返回 true，点"取消"返回 false
  // \n 表示换行，弹窗里的文案分两行更好读
  const ok = confirm(`确定要清空全部 ${todos.length} 条任务吗？\n此操作无法撤销！`);
  if (ok) {
    todos = [];
    saveTodos();
    render();
  }
});

// ---------- 6. 编辑任务 ----------
// 思路：点击 ✏️ 后，把任务文字原地替换成一个输入框，
// 回车或点别处 = 保存，按 Esc = 放弃修改
function startEdit(todo, li, textSpan) {
  // 这个条目已经在编辑中时，不要重复进入
  if (li.querySelector(".edit-input")) return;

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = todo.text;   // 带出原来的文字
  editInput.maxLength = 100;

  // 用输入框替换掉原来的文字 span（原地编辑，不用弹窗）
  li.replaceChild(editInput, textSpan);
  editInput.focus();
  editInput.select();            // 全选文字，直接打字就能覆盖

  // 防重复标志：按回车保存后输入框被移除，会触发一次 blur，
  // 没有 finished 的话保存逻辑会跑两遍
  let finished = false;

  function finish(save) {
    if (finished) return;
    finished = true;

    const newText = editInput.value.trim();
    // 只有"确认保存 且 内容不为空"才真正改数据；
    // 按 Esc 取消、或把内容删空，都保留原来的文字
    if (save && newText) {
      todo.text = newText;
      saveTodos();
    }
    render(); // 重新渲染，恢复正常显示
  }

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);    // 回车 = 保存
    if (e.key === "Escape") finish(false);  // Esc  = 取消
  });

  editInput.addEventListener("blur", () => finish(true)); // 点别处 = 保存
}

// ---------- 7. 渲染：把数组画到页面上 ----------
function render() {
  // 先清空列表，再逐条生成（简单直接，数据量小时性能完全没问题）
  list.innerHTML = "";

  // 优先级 → 标签文字 的对照表
  const badgeText = { high: "高", mid: "中", low: "低" };

  todos.forEach((todo) => {
    // 创建一条任务的 DOM 结构：
    // <li class="todo-item [done]">
    //   <label><input type="checkbox"><span class="custom-checkbox"></span></label>
    //   <span class="badge badge-*">高/中/低</span>
    //   <span class="todo-text">任务内容</span>
    //   <button class="btn-edit">✏️</button>
    //   <button class="btn-delete">×</button>
    // </li>
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");

    // --- 复选框部分 ---
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;

    const customBox = document.createElement("span");
    customBox.className = "custom-checkbox";

    label.appendChild(checkbox);
    label.appendChild(customBox);

    // --- 优先级标签 ---
    // 拼出 "badge badge-high" 这样的类名，CSS 里三种颜色各写一条规则
    const badge = document.createElement("span");
    badge.className = "badge badge-" + todo.priority;
    badge.textContent = badgeText[todo.priority];

    // --- 文字部分 ---
    // 用 textContent 而不是 innerHTML 写入内容，
    // 浏览器会把它当纯文字处理，输入 <script> 之类的代码也不会被执行（防 XSS 注入）
    const textSpan = document.createElement("span");
    textSpan.className = "todo-text";
    textSpan.textContent = todo.text;

    // --- 编辑按钮 ---
    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "✏️";
    editBtn.title = "编辑任务";
    editBtn.addEventListener("click", () => startEdit(todo, li, textSpan));

    // --- 删除按钮 ---
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.textContent = "×";
    deleteBtn.title = "删除该任务";

    // --- 组装并加入列表 ---
    li.appendChild(label);
    li.appendChild(badge);
    li.appendChild(textSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    // ---------- 8. 绑定这条任务的事件 ----------

    // 点击复选框：切换完成状态
    checkbox.addEventListener("change", () => {
      // 找到数组里对应的任务，把 done 取反（true 变 false，false 变 true）
      const task = todos.find((t) => t.id === todo.id);
      task.done = checkbox.checked;
      saveTodos();
      render();
    });

    // 点击文字也能切换（小便利，和复选框效果一样）
    textSpan.addEventListener("click", () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change")); // 手动触发上面的 change 逻辑，避免代码重复
    });

    // 点击删除按钮：从数组里过滤掉这条任务
    deleteBtn.addEventListener("click", () => {
      // filter 会保留"回调返回 true"的元素，
      // 也就是保留所有 id 不等于当前任务的任务 → 相当于删掉了它
      todos = todos.filter((t) => t.id !== todo.id);
      saveTodos();
      render();
    });
  });

  // ---------- 9. 更新统计数字、按钮状态和提示 ----------
  const doneCount = todos.filter((t) => t.done).length;
  const undoneCount = todos.length - doneCount;

  statDone.textContent = `已完成 ${doneCount} 项`;
  statUndone.textContent = `未完成 ${undoneCount} 项`;

  // 没有可操作对象时，两个清空按钮都置灰不可点
  btnClearDone.disabled = doneCount === 0;
  btnClearAll.disabled = todos.length === 0;

  // 友好提示：分三种情况显示不同文案
  if (todos.length === 0) {
    emptyTip.textContent = "暂无任务，添加一条试试吧 ✨";
    emptyTip.classList.remove("hidden");
  } else if (undoneCount === 0) {
    emptyTip.textContent = "🎉 太棒了，所有任务都完成了！";
    emptyTip.classList.remove("hidden");
  } else {
    emptyTip.classList.add("hidden");
  }
}

// 页面打开时先渲染一次（把 localStorage 里存的任务显示出来）
render();
