import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";

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
  },
});
