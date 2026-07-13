# SNAG — iOS app

SNAG's iOS app is a thin native shell (Capacitor) around the live web app at
**https://snag-eta.vercel.app**. The app and the website are the same thing, so
every web update ships to the app instantly — no re-release needed. The native
layer adds the App Store presence, a home-screen icon, full-screen chrome, and
(Phase 2) push notifications.

Everything below runs on a **Mac** — Xcode is macOS-only.

---

## Prerequisites (one time)

1. **Xcode** — install from the Mac App Store, then open it once and let it
   finish "Installing components."
2. **Node.js 20+** — installer from https://nodejs.org (the "LTS" button).
3. **CocoaPods** — in Terminal: `sudo gem install cocoapods`
   (or `brew install cocoapods` if you use Homebrew).
4. **Apple Developer account** — you have this. Signed in to Xcode:
   Xcode ▸ Settings ▸ Accounts ▸ **+** ▸ Apple ID.

---

## Phase 1 — run SNAG on your iPhone

From Terminal:

```bash
# 1. Get the code (first time)
git clone https://github.com/olliedigital/SNAG.git
cd SNAG
git checkout claude/bold-hamilton-x4pomo   # branch with the app config

# 2. Install dependencies
npm install

# 3. Generate the native iOS project + sync config
npx cap add ios
npx cap sync ios

# 4. Open it in Xcode
npx cap open ios
```

In **Xcode**:

1. In the left sidebar click the blue **App** project ▸ select the **App**
   target ▸ **Signing & Capabilities** tab.
2. Tick **Automatically manage signing**.
3. **Team**: pick your Apple Developer account.
4. **Bundle Identifier**: `com.olliedigital.snag` (change it if you want; it
   just has to be unique to you).
5. Plug your iPhone in with a cable. At the top of Xcode, pick your iPhone as
   the run destination (next to the ▶ button).
6. Press **▶ (Run)**.
7. First run only: on the iPhone, **Settings ▸ General ▸ VPN & Device
   Management ▸** tap your developer profile ▸ **Trust**. Re-run.

SNAG launches full-screen on your phone and loads the live site. 🎉

> Testing against your Mac's local `next dev` instead of production? Run
> `SNAG_APP_URL=http://<your-mac-LAN-ip>:3000 npx cap sync ios` (and set
> `server.cleartext: true` in `capacitor.config.ts` for http).

---

## Phase 2 — push notifications (next)

The killer feature: your phone buzzes the second a deal or your strike price
hits — and native push is also what gets a web-backed app approved by Apple.

You'll create an **APNs Auth Key** in the Apple Developer portal
(Certificates, Identifiers & Profiles ▸ Keys ▸ **+** ▸ Apple Push
Notifications service) and send me the **Key ID**, your **Team ID**, and the
`.p8` file. Then SNAG's backend sends pushes alongside the existing emails.
(Claude wires up the app-side registration + backend sending.)

---

## Phase 3 — TestFlight & App Store

1. In Xcode: **Product ▸ Archive**, then **Distribute App ▸ App Store Connect**.
2. In https://appstoreconnect.apple.com create the SNAG app record, add
   screenshots + description, and submit for review.
3. TestFlight lets you (and testers) install it before public release.

---

## Handy commands

```bash
npm run ios:sync   # after any config/plugin change: cap sync ios
npm run ios:open   # open the Xcode workspace
```

After pulling new web changes there's nothing to rebuild for the app — it loads
the live site. You only re-sync/rebuild the native app when the Capacitor
config or plugins change.
