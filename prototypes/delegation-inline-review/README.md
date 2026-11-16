# Formal /new inline review browser regression

Developer-only Chrome CDP regression against the formal /new page, not the POC-B lab. Needs Mira Cloud Vite at 127.0.0.1:5173, Chrome remote-debug port 9222, Node 24.

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/browser-qa.mjs

Exercises text selection, annotation entry, mobile sheet, precise highlight, bidirectional navigation, same-tab session recovery, live ProseMirror mapping after edits, responsive widths and desktop sidebar. Screenshots only go to /tmp. No real Cloud Task, Auth or paid API; not a substitute for Android/iOS hardware acceptance.


## Desktop fixed header + independent note list scroll

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/desktop-sticky-qa.mjs

The script opens an isolated Chrome tab, adds 24 local-only review notes and 100 paragraphs to a disposable session fixture, then checks that the desktop review rail sticks below the Work topbar, only its note list responds to wheel and comment-navigation scrolling (including at the scroll boundary), and its header and composer remain in place. Also checks 1280x680 and mobile 390px responsiveness. This is live browser evidence, not a jsdom-only computed-style assertion.
