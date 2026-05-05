import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(dir, "public");
const localRrwebSnapshot = path.join(dir, "forks", "rrweb-snapshot");

/** Parent origin(s) allowed to read child resources with CORS (child dev server only). */
const PARENT_ORIGINS = new Set([
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

const CHILD_DEV_PORT = 8081;
const PARENT_DEV_PORT = 8080;

function childCorsPlugin() {
  return {
    name: "child-cors",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && PARENT_ORIGINS.has(origin)) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
        } else {
          res.setHeader("Access-Control-Allow-Origin", "*");
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

/** Vite `root` is `public/`, so watch the linked package under `forks/` for HMR. */
function watchLocalRrwebSnapshot() {
  return {
    name: "watch-local-rrweb-snapshot",
    configureServer(server) {
      server.watcher.add(localRrwebSnapshot);
    },
  };
}

/** Replaced in `parent/index.html` so the iframe matches dev mode (see package.json scripts). */
function childIframeSrcPlugin(iframeSrc) {
  const token = "__VITE_CHILD_IFRAME_SRC__";
  return {
    name: "inject-child-iframe-src",
    transformIndexHtml(html, ctx) {
      const filename = (ctx.filename ?? ctx.path ?? "").replace(/\\/g, "/");
      if (!filename.endsWith("parent/index.html")) return;
      if (!html.includes(token)) return;
      return html.replaceAll(token, iframeSrc);
    },
  };
}

export default defineConfig(({ mode }) => {
  const isSamePortMode = mode === "same-port";
  const serveRole = process.env.VITE_SERVE ?? "parent";
  const isChildServer = !isSamePortMode && serveRole === "child";
  const port = isSamePortMode
    ? PARENT_DEV_PORT
    : isChildServer
      ? CHILD_DEV_PORT
      : PARENT_DEV_PORT;
  const childIframeSrc = isSamePortMode
    ? "/child/"
    : `http://127.0.0.1:${CHILD_DEV_PORT}/child/`;

  return {
    root: publicDir,
    // Separate caches so two Vite processes (parent + child ports) do not race on deps pre-bundle.
    cacheDir: path.join(
      dir,
      "node_modules",
      ".vite",
      isChildServer ? "child" : "parent",
    ),
    resolve: {
      // Yarn `file:` can copy into node_modules; alias forces a single source under `forks/`.
      alias: {
        "rrweb-snapshot": localRrwebSnapshot,
      },
    },
    plugins: [
      watchLocalRrwebSnapshot(),
      childIframeSrcPlugin(childIframeSrc),
      ...(isChildServer ? [childCorsPlugin()] : []),
    ],
    optimizeDeps: {
      // Serve linked `file:` package as source; avoids stale pre-bundle while iterating.
      exclude: ["rrweb-snapshot"],
    },
    build: {
      rollupOptions: {
        input: {
          parent: path.join(publicDir, "parent/index.html"),
          child: path.join(publicDir, "child/index.html"),
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      hmr: true,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      },
      fs: {
        allow: [dir, path.join(dir, "node_modules"), localRrwebSnapshot],
      },
    },
  };
});
