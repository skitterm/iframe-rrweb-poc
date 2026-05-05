# iframe-rrweb-poc

Proof of concept: **parent** and **child** are served by **one Vite dev server** on **http://127.0.0.1:8080/** — parent at **`/parent/`**, child at **`/child/`** (same origin). The parent embeds the child in an iframe. The parent uses [`rrweb-snapshot`](https://www.npmjs.com/package/rrweb-snapshot) **`snapshot()`** / **`rebuild()`** (Take snapshot / Rebuild snapshot). The child only animates its background color.

With same-origin embedding, **`snapshot(document)`** on the parent can include the iframe’s **document** subtree (not opaque like cross-origin).

## Requirements

- Node.js 18+
- npm

## Run

```bash
npm install
npm run dev
```

Open the parent: **http://127.0.0.1:8080/parent/** or **http://localhost:8080/parent/**. The iframe loads **`/child/`** on the same host and port.

Use **Vite** (`npm run dev`); do not open HTML as `file://`.

If you see **`504 (Outdated Optimize Dep)`**, stop the server, run `rm -rf node_modules/.vite`, then `npm run dev` again.

## Stack

- JavaScript (ES modules)
- Vite 6
- `rrweb-snapshot` 2.0 alpha
# iframe-rrweb-poc
