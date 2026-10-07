import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import { maePatches, maePatchesEsbuild } from "./scripts/mae-patches.mjs";

// https://astro.build/config
export default defineConfig({
  integrations: [
    preact({ include: ["**/preact/*"] }),
    react({ include: ["**/components/*", "**/pages/*"] }),
    tailwind(),
    mdx(),
    icon()
  ],
  vite: {
    // define: {
    //   global: 'window',
    // }
    // Annotation editor test: fixes for bugs in MAE (see the script)
    plugins: [maePatches()],
    optimizeDeps: {
      esbuildOptions: { plugins: [maePatchesEsbuild] },
    },
  },
});
