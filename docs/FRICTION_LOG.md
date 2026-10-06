# Friction log

Developer-experience problems we hit while building Delayed Reaction for Fire TV (Vega OS). Each entry records what we tried, what happened, how long it cost us, and what would have helped. Entries are in the order we hit them.

Severity:
- **High**: blocked progress.
- **Medium**: cost real time.
- **Low**: papercut.

---

### 1. The SDK installer sits behind an Amazon developer login, with no CI path. *(High)*

- **Tried:** to set up a Vega build environment from a fresh Mac and from GitHub Actions.
- **Happened:** the installer link (`developer.amazon.com/kepler/open/sdk`) needs an interactive Amazon login and about 20 GB of disk. There's no documented headless install, so CI can't build a `.vpkg`.
- **Cost:** we couldn't validate on-device builds until a human installed the SDK.
- **Workaround:** the `@amazon-devices/*` packages are on public npm, and Metro with `@amazon-devices/kepler-cli-platform` bundles for `--platform kepler` without the SDK. Our CI now typechecks the app and produces a Kepler bundle on every PR.
- **Would help:**
  - a documented, token-authenticated SDK download for CI;
  - or an official "bundle-only" mode, so teams can gate PRs on Vega compatibility.

### 2. `react-tv-space-navigation@6.0.0-beta1` (used by the multi-TV sample) ships React 19's JSX runtime. *(High)*

- **Tried:** the focus-navigation library from `react-native-multi-tv-app-sample` in a Vega app (React 18.2, RN 0.72).
- **Happened:** every screen failed with *"Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props})"*. The beta's `dist/index.js` contains `react.transitional.element`, React 19's element symbol, so React 18 rejects its elements.
- **Cost:** about an hour, mostly spent suspecting duplicate React copies and the bundler first.
- **Workaround:** pin `react-tv-space-navigation@5.2.0`.
- **Would help:**
  - the multi-TV sample pins a version compatible with Vega's React, instead of `"*"` in `apps/vega/package.json`;
  - or the docs call out the React 18 constraint.

### 3. Metro 0.76 on Vega ignores package `exports`. *(Medium)*

- **Tried:** importing `@delayed-reaction/client/react`, a subpath export from a workspace package.
- **Happened:** it resolves in Next.js and Vite, but not in the Vega Metro bundle.
- **Workaround:** added a root-level `react.ts` re-export as a fallback.
- **Would help:**
  - enable `unstable_enablePackageExports` in the Vega Metro preset;
  - or document that subpath exports aren't supported.

### 4. Metro's Babel preset rejects `export * as ns from '…'`. *(Low)*

- **Happened:** *"Export namespace should be first transformed by `@babel/plugin-transform-export-namespace-from`."* This is valid TypeScript, and it builds everywhere else.
- **Workaround:** removed the namespace re-export.
- **Would help:** include `@babel/plugin-transform-export-namespace-from` in the Vega Babel preset.

### 5. Naming is split between "Kepler" and "Vega". *(Low)*

- **Happened:** the docs say Vega, but the CLI is `kepler`, the platform key is `kepler`, packages are `kepler-*`, the build command is `react-native build-kepler`, and the env var is `KEPLER_SDK_PATH`. On a first read it isn't obvious these are the same thing.
- **Would help:** one line at the top of the Vega docs: "Kepler is Vega's former codename; tools still use it."

### 6. There's no TypeScript surface for `TVEventHandler` on Vega. *(Low)*

- **Happened:** remote handling in the samples uses `require('react-native').TVEventHandler`, which isn't in `react-native`'s 0.72 types. We had to type it ourselves.
- **Would help:** export typings from `@amazon-devices/react-native-kepler`.

### 7. The W3C media lifecycle is easy to get subtly wrong. *(Medium)*

- **Happened:** the `VideoPlayer` needs `initialize()`, then `src` and `load()`, then the surface created via `KeplerVideoSurfaceView` → `setSurfaceHandle`, then `deinitializeSync()` on unmount. The order and the rule of attaching the surface only after metadata are only learnable from the sample's `VideoHandler`.
- **Would help:** a small "minimal player" page with the exact lifecycle and the failure mode of each step.

### 8. The Ring track's "simulator" isn't described anywhere. *(Low; evaluated, didn't use)*

- **Happened:** while choosing a track, we found the Devpost page mentions Ring simulators, but the Ring developer docs and `ring-api-helloworld` need real devices on the account.

### 9. Fire TV-adjacent web tooling (outside Amazon's control, noted for completeness)

- **Vite 8 / `@vitejs/plugin-react` 6 assume React 19.** To run the TV UI in a browser on React 18, we used Vite 6 and plugin-react 4.
- **React Native Web's `Animated` reads Node's `global`.** We defined `global: 'globalThis'`.
- **`useNativeDriver: true` silently never animates on web**, so cards rendered at opacity 0.

### 10. The first SDK build fails until the manifest declares an OS version, and the CLI can't list valid ones. *(Medium)*

- **Tried:** `react-native build-kepler` (→ `vega build`) on an app whose `manifest.toml` follows the multi-TV sample.
- **Happened:** *"Missing [os.version].target. A Vega application must declare its OS version."* The error suggests `vega project update-manifest --os-version <version>`, but nothing tells you which versions exist. `vega platform` has no `list`. We found `1.2` by reading `sdk-compat.json` inside the CLI's `node_modules`. The public samples don't declare `[os.version]` either.
- **Workaround:**
  1. `vega project update-manifest --os-version 1.2 --os-min 1.2` (it also adds the `IVega_1_2` module);
  2. `vega project doctor` flagged two package versions to align;
  3. after that, the build produced `.vpkg` files for all three architectures.
- **Would help:**
  - list valid OS versions in the error message, or add `vega platform os-versions`;
  - update the samples' manifests.

### 11. `useKeplerAppStateManager().getComponentInstance()` returns a new object each render. *(High)*

- **Tried:** passing the component instance to `setMediaControlFocus`, as the multi-TV sample does. We listed it as an effect dependency, as React's rules suggest.
- **Happened:** the video never played on the Virtual Device. The logs showed *"Initialization aborted due to deinitialization"* and *"Callback received after deinitialize call, destroying MediaElement"*. The changing instance re-ran the effect on every render, tearing the `VideoPlayer` down before it could attach its surface. It worked in our browser build, which doesn't have this hook.
- **Cost:** a playback bug that only showed up on device.
- **Workaround:** read the instance once into a ref.
- **Would help:**
  - return a stable instance (or memoize it inside the hook);
  - or document that it isn't referentially stable.

### 12. App icon: the documented file layout makes an invalid package. *(Medium)*

- **Tried:** following the manifest docs: `icon = "@image/app_icon"`, with the file at `assets/image/app_icon.png`.
- **Happened:** the build warned *"Icon file not found … assets/image/app_icon does not exist"* but carried on ("icon validation is not enforced"). Installing then failed with *"Package is invalid"* and no further detail.
- **Workaround:** name the file `assets/image/app_icon`, with no extension.
- **Would help:**
  - accept the `.png` extension, or document the extensionless name;
  - make the build fail on the icon warning, instead of producing a package the device rejects.

### 13. `vega project doctor` is excellent. *(positive)*

- In one command it validated the manifest, OS versions, dependency alignment against the OS profile, deprecated APIs and VPT rules, and gave the exact fix for each.
- It would help even more if `vega build` suggested running it when it fails.

---

## What worked well

- **Public npm packages for `@amazon-devices/*`.** We could typecheck and bundle for Vega before installing anything.
- **The Vega samples** (`vega-video-sample`, `react-native-multi-tv-app-sample`). They're the real documentation for player and remote handling.
- **The Vega Virtual Device.** `vega run-app` installed and launched our package in seconds (cold launch 293 ms), and device logs streamed with `vega device start-log-stream`.
- **The `.kepler.*` / `.vega.*` platform file convention.** It made sharing 95% of the TV UI with a browser build straightforward.
