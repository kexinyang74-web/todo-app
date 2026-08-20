import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite 配置：react 插件负责编译 JSX，tailwindcss 插件负责处理样式
// （Tailwind v4 的新接法：直接作为 Vite 插件，不再需要 postcss 配置文件）
export default defineConfig({
  // GitHub Pages 子路径部署：base 必须与仓库名一致，否则静态资源 404 白屏
  base: "/todo-app/",
  plugins: [react(), tailwindcss()],
});
