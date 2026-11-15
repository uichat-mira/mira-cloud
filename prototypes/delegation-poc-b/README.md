# POC-B real browser check

Requires macOS Chrome DevTools remote debugging on 127.0.0.1:9222 and the Mira Cloud Vite Web app on 127.0.0.1:5173. Use Node 24.

From repository root:

    pnpm --filter @mira-cloud/web dev
    NODE_USE_ENV_PROXY=0 node prototypes/delegation-poc-b/browser-qa.mjs

The script creates a temporary Chrome tab, uses actual Milkdown selection, checks precise annotation mapping, duplicate text and deletion behavior, bidirectional navigation, component identity fallback and responsive widths. It writes diagnostic PNG screenshots only to /tmp; no production APIs or credentials. True Android touch selection and software keyboard are not simulated.
