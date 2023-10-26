// vite.config.ts
import { defineConfig } from "file:///Users/cs217a/Codes/ndn-workspace/node_modules/.pnpm/vite@4.4.11/node_modules/vite/dist/node/index.js";
import solid from "file:///Users/cs217a/Codes/ndn-workspace/node_modules/.pnpm/vite-plugin-solid@2.7.1_solid-js@1.8.1_vite@4.4.11/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import suidPlugin from "file:///Users/cs217a/Codes/ndn-workspace/node_modules/.pnpm/@suid+vite-plugin@0.1.5_vite@4.4.11/node_modules/@suid/vite-plugin/index.mjs";
import pluginRewriteAll from "file:///Users/cs217a/Codes/ndn-workspace/node_modules/.pnpm/vite-plugin-rewrite-all@1.0.1_vite@4.4.11/node_modules/vite-plugin-rewrite-all/dist/index.mjs";
import { VitePWA } from "file:///Users/cs217a/Codes/ndn-workspace/node_modules/.pnpm/vite-plugin-pwa@0.16.5_vite@4.4.11_workbox-build@7.0.0_workbox-window@7.0.0/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    suidPlugin(),
    // devtools({
    //   autoname: true,
    // }),
    solid(),
    pluginRewriteAll(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false
      },
      includeAssets: ["ndn_app.png", "ndn.svg"],
      manifest: {
        "name": "NDN Workspace",
        "short_name": "NDN Workspace",
        "icons": [
          {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "/icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png"
          },
          {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ],
        "theme_color": "#ce93d8",
        "background_color": "#121212",
        "start_url": "/",
        "display": "standalone",
        "orientation": "portrait"
      }
    })
  ],
  appType: "spa",
  optimizeDeps: {
    // Solve the problem: Error: Unrecognized extension value in extension set ([object Object]).
    include: ["@codemirror/state", "@codemirror/view"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY3MyMTdhL0NvZGVzL25kbi13b3Jrc3BhY2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9jczIxN2EvQ29kZXMvbmRuLXdvcmtzcGFjZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvY3MyMTdhL0NvZGVzL25kbi13b3Jrc3BhY2Uvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHNvbGlkIGZyb20gJ3ZpdGUtcGx1Z2luLXNvbGlkJ1xuaW1wb3J0IHN1aWRQbHVnaW4gZnJvbSBcIkBzdWlkL3ZpdGUtcGx1Z2luXCJcbi8vIGltcG9ydCBkZXZ0b29scyBmcm9tICdzb2xpZC1kZXZ0b29scy92aXRlJ1xuaW1wb3J0IHBsdWdpblJld3JpdGVBbGwgZnJvbSAndml0ZS1wbHVnaW4tcmV3cml0ZS1hbGwnXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgc3VpZFBsdWdpbigpLFxuICAgIC8vIGRldnRvb2xzKHtcbiAgICAvLyAgIGF1dG9uYW1lOiB0cnVlLFxuICAgIC8vIH0pLFxuICAgIHNvbGlkKCksXG4gICAgcGx1Z2luUmV3cml0ZUFsbCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgaW5jbHVkZUFzc2V0czogWyduZG5fYXBwLnBuZycsICduZG4uc3ZnJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBcIm5hbWVcIjogXCJORE4gV29ya3NwYWNlXCIsXG4gICAgICAgIFwic2hvcnRfbmFtZVwiOiBcIk5ETiBXb3Jrc3BhY2VcIixcbiAgICAgICAgXCJpY29uc1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJzcmNcIjogXCIvaWNvbnMvaWNvbi0xOTJ4MTkyLnBuZ1wiLFxuICAgICAgICAgICAgXCJzaXplc1wiOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgXCJwdXJwb3NlXCI6IFwiYW55IG1hc2thYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwic3JjXCI6IFwiL2ljb25zL2ljb24tMzg0eDM4NC5wbmdcIixcbiAgICAgICAgICAgIFwic2l6ZXNcIjogXCIzODR4Mzg0XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJpbWFnZS9wbmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJzcmNcIjogXCIvaWNvbnMvaWNvbi01MTJ4NTEyLnBuZ1wiLFxuICAgICAgICAgICAgXCJzaXplc1wiOiBcIjUxMng1MTJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXG4gICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBcInRoZW1lX2NvbG9yXCI6IFwiI2NlOTNkOFwiLFxuICAgICAgICBcImJhY2tncm91bmRfY29sb3JcIjogXCIjMTIxMjEyXCIsXG4gICAgICAgIFwic3RhcnRfdXJsXCI6IFwiL1wiLFxuICAgICAgICBcImRpc3BsYXlcIjogXCJzdGFuZGFsb25lXCIsXG4gICAgICAgIFwib3JpZW50YXRpb25cIjogXCJwb3J0cmFpdFwiXG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgYXBwVHlwZTogJ3NwYScsXG4gIG9wdGltaXplRGVwczoge1xuICAgIC8vIFNvbHZlIHRoZSBwcm9ibGVtOiBFcnJvcjogVW5yZWNvZ25pemVkIGV4dGVuc2lvbiB2YWx1ZSBpbiBleHRlbnNpb24gc2V0IChbb2JqZWN0IE9iamVjdF0pLlxuICAgIGluY2x1ZGU6IFsnQGNvZGVtaXJyb3Ivc3RhdGUnLCAnQGNvZGVtaXJyb3IvdmlldyddLFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxUixTQUFTLG9CQUFvQjtBQUNsVCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxnQkFBZ0I7QUFFdkIsT0FBTyxzQkFBc0I7QUFDN0IsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlYLE1BQU07QUFBQSxJQUNOLGlCQUFpQjtBQUFBLElBQ2pCLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLFlBQVk7QUFBQSxRQUNWLFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxlQUFlLENBQUMsZUFBZSxTQUFTO0FBQUEsTUFDeEMsVUFBVTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUztBQUFBLFVBQ1A7QUFBQSxZQUNFLE9BQU87QUFBQSxZQUNQLFNBQVM7QUFBQSxZQUNULFFBQVE7QUFBQSxZQUNSLFdBQVc7QUFBQSxVQUNiO0FBQUEsVUFDQTtBQUFBLFlBQ0UsT0FBTztBQUFBLFlBQ1AsU0FBUztBQUFBLFlBQ1QsUUFBUTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsWUFDRSxPQUFPO0FBQUEsWUFDUCxTQUFTO0FBQUEsWUFDVCxRQUFRO0FBQUEsVUFDVjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLGVBQWU7QUFBQSxRQUNmLG9CQUFvQjtBQUFBLFFBQ3BCLGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxFQUNULGNBQWM7QUFBQTtBQUFBLElBRVosU0FBUyxDQUFDLHFCQUFxQixrQkFBa0I7QUFBQSxFQUNuRDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
