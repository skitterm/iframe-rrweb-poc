# iframe-rrweb-poc

This is a proof of concept of using rrweb to snapshot iframe contents. Currently this **_only handles same-origin embedding_**; once that works we can expand this to cross-origin embedding.

## Details

**Parent** and **child** are served by **one Vite dev server** on **http://127.0.0.1:8080/** — parent at **`/parent/`**, child at **`/child/`** (same origin). The parent embeds the child in an iframe. The parent uses [`rrweb-snapshot`](https://www.npmjs.com/package/rrweb-snapshot) **`snapshot()`** / **`rebuild()`** (Take snapshot / Rebuild snapshot). The child only animates its background color.

We are using a forked copy of `rrweb-snapshot` -- specifically we have edited the `forks/rrweb-snapshot/es-rrweb-snapshot.js` file to include the `contentDocument` of the iFrame into the DOM snapshot. Currently we are not able to rebuild the DOM with this snapshot, but at least we are farther along the way to capturing the needed contents.

## Run

```bash
npm install
npm run dev
```
