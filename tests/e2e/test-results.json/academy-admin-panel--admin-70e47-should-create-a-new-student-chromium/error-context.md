# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Unexpected Application Error!" [level=2] [ref=e3]
  - heading "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder." [level=3] [ref=e4]
  - generic [ref=e5]: "Error: A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder. at http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-select.js?v=cc764453:3743:13 at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:11548:26) at updateForwardRef (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:14325:28) at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:15946:22) at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:19753:22) at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:19198:20) at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:19137:13) at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:19116:15) at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:18736:28) at performSyncWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/chunk-WERSD76P.js?v=cc764453:18879:28)"
  - paragraph [ref=e6]: 💿 Hey developer 👋
  - paragraph [ref=e7]:
    - text: You can provide a way better UX than this when your app throws errors by providing your own
    - code [ref=e8]: ErrorBoundary
    - text: or
    - code [ref=e9]: errorElement
    - text: prop on your route.
```