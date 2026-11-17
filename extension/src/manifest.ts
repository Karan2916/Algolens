import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,

  name: "AlgoLens",

  version: "1.0.0",

  description: "Visualize algorithms directly from coding platforms.",

  permissions: [
    "storage",
    "tabs",
    "activeTab",
    "sidePanel",
  ],

  host_permissions: [
    "https://leetcode.com/*",
    "https://www.hackerrank.com/*",
  ],

  content_security_policy: {
    extension_pages:
      "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },

  action: {
    default_popup: "src/ui/popup/index.html",
  },

  side_panel: {
    default_path: "src/ui/sidepanel/index.html",
  },

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  content_scripts: [
    {
      matches: [
        "https://leetcode.com/*",
        "https://www.hackerrank.com/*",
      ],
      js: ["src/injected/adapter.iife.ts"],
      world: "MAIN",
      run_at: "document_idle",
    },
    {
      matches: [
        "https://leetcode.com/*",
        "https://www.hackerrank.com/*",
      ],
      js: ["src/content/index.ts"],
      run_at:"document_idle"
    },
  ],

  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },

  web_accessible_resources: [
    {
      resources: [
        "wasm/tree-sitter.wasm",
        "wasm/tree-sitter-cpp.wasm",
        "src/ui/sidepanel/index.html",
        "assets/*",
      ],
      matches: [
        "https://leetcode.com/*",
        "https://www.hackerrank.com/*",
      ],
    },
  ],
});