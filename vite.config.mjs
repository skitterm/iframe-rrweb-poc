import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(dir, 'public');
const localRrwebSnapshot = path.join(dir, 'forks', 'rrweb-snapshot');

/** Vite `root` is `public/`, so watch the linked package under `forks/` for HMR. */
function watchLocalRrwebSnapshot() {
  return {
    name: 'watch-local-rrweb-snapshot',
    configureServer(server) {
      server.watcher.add(localRrwebSnapshot);
    },
  };
}

export default defineConfig({
  root: publicDir,
  cacheDir: path.join(dir, 'node_modules/.vite'),
  resolve: {
    // Yarn `file:` can copy into node_modules; alias forces a single source under `forks/`.
    alias: {
      'rrweb-snapshot': localRrwebSnapshot,
    },
  },
  plugins: [watchLocalRrwebSnapshot()],
  optimizeDeps: {
    // Serve linked `file:` package as source; avoids stale pre-bundle while iterating.
    exclude: ['rrweb-snapshot'],
  },
  build: {
    rollupOptions: {
      input: {
        parent: path.join(publicDir, 'parent/index.html'),
        child: path.join(publicDir, 'child/index.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8080,
    strictPort: true,
    hmr: true,
    watch: {
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
    fs: {
      allow: [dir, path.join(dir, 'node_modules'), localRrwebSnapshot],
    },
  },
});
