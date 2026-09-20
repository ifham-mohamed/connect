import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", testTimeout: 20000 },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname.replace(
        /^\/([A-Za-z]:)/,
        "$1",
      ),
    },
  },
});
