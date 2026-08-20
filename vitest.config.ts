import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest 专用配置：复用 react 插件编译 JSX，测试跑在 jsdom 环境
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false, // 测试只关心逻辑与 DOM，不解析 Tailwind 样式
  },
});
