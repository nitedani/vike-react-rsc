// Serves the pre-rendered site like a static host: files from dist/client, no
// server. `prerender.noExtraDir` writes /todos as todos.html, which is what
// this server maps /todos to.
import { preview } from "vite";

const server = await preview({
  configFile: false,
  appType: "mpa",
  build: { outDir: "dist/client" },
  preview: { port: 3000, strictPort: true },
});
server.printUrls();
