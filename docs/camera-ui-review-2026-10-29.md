# Camera UI design-law recheck: 29 October 2026

Scope: updated dance studio, camera preview, HUD controls, scoring and routine audio. Each point below was revisited from the supplied law. Marketing-only patterns are not applicable to this functional training screen; no new marketing sections or identity/font substitutions were introduced. Existing whole-app review remains in `ui-review-2026-10-29.md`.

Evidence: actual pointer tests at 1440px and 393px, full-page and viewport screenshots, real MediaPipe CPU worker test, synthetic-pose session/audio/save tests. Green video in test screenshots is Chromium fake camera input, not a designed background.

| Rule | Camera review |
| --- | --- |
| Lucide package | Bare functional camera, sound and layout marks only. Removed decorative muscle tiles and particle display. |
| Em dashes | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Pill/eyebrow | Removed camera eyebrow and camera-status pills; status is plain text. |
| Fraunces / Work Sans | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Glowy pill buttons | Removed glow from HUD switches; quiet tonal active state with aria-pressed. |
| Oversized icon tile | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Floating cards | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Cut-off glow | Removed preview glow, canvas text banner and large PiP shadow. |
| Kitchen-sink card | Camera controls separated from the image; short operational groups replace overlay stacks. |
| Fake macOS window | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Space Grotesk | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Purple / blue-purple | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Gradient icon-label pill | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Default CTA pair | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Three-tier pricing | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Testimonial prefab / quote marks | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Gradient initials | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Pre-footer CTA slab | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Gradient tile wordmark | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Cormorant Garamond | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Split hero | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Graph-paper background | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Crude placeholder illustration | Starter skeleton comes from actual authored checkpoint coordinates. Explicitly labeled as a checkpoint, not expert motion. |
| Accent-bar card | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Background glow | No new background bloom. Decorative particle engine and 3D cage/grid removed from rendering. |
| Fake code window | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Sora / JetBrains Mono | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Floating image tag | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Syne | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Gradient headline | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Archivo / Inter default | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Hairline around every box | Shared tonal card primitive retained. Functional inputs and compact control boundaries remain. |
| Countdown | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Card hover lift | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Letterspaced serif wordmark | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Didone defaults | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Mono house voice | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| One label treatment | Camera section labels use sentence case and normal tracking. No repeated uppercase kicker treatment. |
| Botched glass | Removed PiP blur and dark halo; opaque related surfaces. |
| Faint grid repeated | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Botched fill animation | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Invisible content trap | All new course content visible by default. Only the explicitly minimized camera monitor is hidden, with a reachable restore control. |
| Clear the cut | Moved setup and controls outside clipped video; constrained PiP height with scrolling; clamped angle labels to canvas bounds. |
| Parallel comparison alignment | Score rows share a grid. Unavailable retains its slot, rather than collapsing it. |
| Text against edges | Desktop and 393px gutters inspected. Fixed min-width overflow and long correction wrapping. |
| All-around shadow | Removed large camera/PiP shadows. PiP uses only a small directional shadow. |
| Content flung to edges | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Real/fake logos | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Centering | Checkpoint figure and view box centered; controls use accessible primitive alignment; angle labels use centered canvas coordinates. |
| Second-box shadow | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Icon/logo box | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Eyebrow tick | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Oversized footer wordmark failure | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Colliding colors / seams | Kept forest/mineral palette. Camera colors belong to the actual image; browser fake green video is test input. |
| Hard-edged shadow | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Contrast | Plain foreground status replaces generated white-on-missing-background score badge. Semantic stop and warning colors only. |
| Blurred duplicate bloom | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Nav active dot | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Overlapping section clipping | Portrait PiP can scroll; camera controls no longer overlap the image. |
| Cramped display type | Camera title reduced to readable sentence case. Unavailable wraps without breaking the grid. |
| Grain over content | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Cool charcoal | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Candy gradient | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Drifting gradient blobs | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Radial object halo | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Hero fold | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Cream/beige | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| UI-kit gray | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Default Google rotation | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Hover boop | No moving button hover added. |
| Inner glow | Removed HUD glow; no pulsing live dot. |
| Off-center strike | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Default hero stack | Functional course selection and real camera, without a marketing hero stack. |
| Fixed backdrop | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Hard photo seams | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Saturated accents | Stop uses semantic destructive token; overlay palette is tonal. No saturated brand highlight. |
| Underline-fill hover | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Sun/moon toggle / redrawn icons | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Decorative rules | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Kicker + serif H2 | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Serif statement | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Enquire island | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Email pill form | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Image card caption | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Flat after hero | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Recycled house style | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Hero right panel | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Multi-line staircase | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Filled + outlined pair | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Label-over-heading | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Numbered vertical rail | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Stacked slop skeletons | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Whole SaaS template | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Metadata chips | Camera visibility, fps, score and view use plain type. Removed per-stat pill surfaces. |
| Dead controls | Pointer tests cover phrase selection, practice navigation, audio play/stop/restart, 2D/3D repeated switch, layout, PiP, minimize/restore, session save and navigation. Retry also verified separately. |
| Dodging rather than designing | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Tasteful font swap | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Recolored skeleton | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Standard footer | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| No icons overcorrection | Useful bare control marks remain. |
| Avoidance is not design | The actual camera image, tracked skeleton and synchronized count carry the screen. Feedback reports measured observations. |
| Liquid glass / glossy CTA / glass recipe | Omitted: real controls need crisp surfaces, not refraction over the camera image. |
| Tonal elevation / self-colored borders | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Bespoke geometry / silhouette | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Bare icons / custom in-house mark | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Say less | Removed fake library unlocks, certificate, fabricated practice recording, and muscle-intensity display. |
| Authored micro-interaction | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Considered light | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Premium noise | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Licensed type | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Full-page composition | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Earned logo wall | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Blueprint/canvas / micro-grid | No grid behind the page. Removed decorative 3D floor grid. |
| Inset island | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Crafted SVG | Course pose figure is generated from the selected checkpoint, with visible target joints and an honest caption. |
| Professional with a heartbeat | Motion follows actual camera frames, audio beats, or a user control. No decorative looping particles or camera orbit. |
| Grainy gradients | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |
| Scroll-authored reveals | No entrance reveal. Practice navigation honors reduced-motion preference. |
| Correct oversized footer | Checked: this pattern is not used in the changed camera flow. Existing self-hosted type, tonal palette and application navigation remain consistent. |

Signature and cohesion: the live body and its tracked geometry are the focal artifact. The selected starter pose is visibly labeled and changes with the phrase selector. Mineral surfaces, forest ink, bare functional controls and the existing Sporting Grotesque identity form one system. Real session evidence replaces fabricated progress. No expert-motion or device-accuracy claims were invented.

Corrections made during review: long correction overflow; mobile grid minimum widths; controls clipped over video; oversized portrait PiP; reversed/offscreen PiP dragging; unreadable score badge; misleading visibility label; false muscle intensity; mirrored/cropped angle labels; decorative particles, orbit and bloom; stale 3D renderer reuse.
