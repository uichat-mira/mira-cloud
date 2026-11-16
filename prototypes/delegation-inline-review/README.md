# Formal /new inline review browser regression

Developer-only Chrome CDP regression against the formal /new page, not the POC-B lab. Needs Mira Cloud Vite at 127.0.0.1:5173, Chrome remote-debug port 9222, Node 24.

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/browser-qa.mjs

Exercises text selection, annotation entry, mobile sheet, precise highlight, bidirectional navigation, same-tab session recovery, live ProseMirror mapping after edits, responsive widths and desktop sidebar. Screenshots only go to /tmp. No real Cloud Task, Auth or paid API; not a substitute for Android/iOS hardware acceptance.


## Desktop viewport-fixed review rail + independently scrolling notes

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/desktop-sticky-qa.mjs

The script opens an isolated Chrome tab, adds 24 local-only review notes and 100 paragraphs to a disposable session fixture, then checks that the desktop review rail remains fixed below the Work topbar from the first viewport through the document end, only its note list responds to wheel and comment-navigation scrolling (including at the scroll boundary), and its header and composer remain in place. Also checks 1280x680 and mobile 390px responsiveness. This is live browser evidence, not a jsdom-only computed-style assertion.


## Selection affordance and review-width animation

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/selection-animation-qa.mjs

Exercises the actual /new page in Chrome: ensures the unused Milkdown LaTeX popup is absent, selecting then collapsing a native DOM selection shows/hides the ephemeral comment action, and both opening and closing the desktop review rail interpolate the document width (1600px and 1920px). Confirms the 390px mobile bottom sheet is unchanged. All data remains local-only; no Task/API calls.

## PC draft identity bar sticky under the Work header

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/draft-topline-qa.mjs

Exercises the actual /new page in a disposable Chrome tab with a long Markdown fixture: before scroll, while scrolling, after opening the desktop review rail, and at desktop viewport widths 1280/1600/1920px. Confirms the bar stays precisely below the global 58px Work header and has no horizontal overflow. The mobile 390px version is deliberately nonsticky to preserve reading height.

## Explicit text or whole-stage annotation target

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/comment-intent-qa.mjs

Verifies in real Chrome that opening review without text selection only permits reading existing notes; the composer and submit action do not appear. Creating an unanchored note requires an explicit second action ("批注整个阶段"), and cancelling that action leaves no draft comment. Selected-text annotation is separately covered by browser-qa.mjs. No real backend calls.

## Abandoned comments leave the active review UI

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/abandoned-comment-qa.mjs

This real Chrome test makes a selected-text comment in the /new fixture, then abandons it and checks that its card, count and text highlight disappear immediately, stage acceptance is no longer blocked, and refreshing the page does not restore it to the active view. The decision and source anchor remain only in the local session draft for provenance; no service-side actions are performed.

## Selection debounce: avoid annotation popover during drag

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/selection-debounce-qa.mjs

In a disposable real Chrome tab on the formal /new page, a selected DOM range stays hidden while the pointer is down, becomes actionable only after 180ms of stability following release, resets when the range changes, hides immediately when collapsed, and supplies the *latest* range to the comment composer. Existing browser-qa.mjs and selection-animation-qa.mjs cover the adjacent flows. Mobile long-press still requires hardware verification.
