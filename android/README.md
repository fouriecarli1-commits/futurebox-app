# The Android app

The FutureBox app on Google Play is this website inside a thin Android
wrapper — a Trusted Web Activity. `twa-manifest.json` in this folder is
everything the wrapper needs to know; `npm run check:playstore` keeps it
matching the site's own name, colours and icons, and keeps Google Play
Billing switched on in it.

## Before the first build — two choices that cannot change later

* **The package name.** `twa-manifest.json` says `studio.futurebox.app` (the
  domain backwards, which is the convention). Once an app is uploaded to Play
  with a package name, that name is permanent. Change it here first if you
  want a different one, and use the same value for `ANDROID_PACKAGE` in Vercel.
* **The upload key.** The first build makes `android.keystore` and asks for
  two passwords. Keep the file and both passwords somewhere safe outside this
  repository — it is never committed (`.gitignore` says so). With Play App
  Signing, Google holds the real signing key; this one only proves the upload
  is yours, and Google can reset it if it is lost, but that takes days.

## Building it on GitHub (the way it is done now)

GitHub's machines have the JDK and the Android SDK, so the bundle is built
there (`.github/workflows/android.yml`):

1. Once: GitHub → Settings → Secrets and variables → Actions → two
   repository secrets, `ANDROID_KEYSTORE_B64` (the keystore file, base64) and
   `ANDROID_KEYSTORE_PASSWORD` (its password; the key's is the same). The
   keystore and its password were handed to the owner privately on
   31 October 2026 and are never in this public repository.
2. Actions → **Android app** → **Run workflow**.
3. When it is green, open the run and download **futurebox-android-bundle**
   at the foot of the page: the zip holds `app-release-bundle.aab`, the file
   for the Play Console.

Without the two secrets the run still builds, unsigned, and hands nothing
out. Every later release: raise `appVersionCode` by one in
`twa-manifest.json`, push, run it again.

## Building it on your own computer

Needs Node (already here). Bubblewrap downloads the Java and Android tools it
needs the first time.

```bash
npm install -g @bubblewrap/cli
cd android
bubblewrap build
```

It answers its own questions from `twa-manifest.json`; the first time it
also asks where to install the JDK and Android SDK (say yes to both) and for
the keystore passwords. The result is `app-release-bundle.aab` — that is the
file you upload in the Play Console under **Release → Production** (or the
closed-testing track first).

## Every later release

Only when the wrapper itself changes — the website updates itself. Raise
`appVersionCode` by one (and `appVersionName` if you like) in
`twa-manifest.json`, then `bubblewrap update` and `bubblewrap build`.

## After the first upload

The Play Console shows the app-signing certificate's SHA-256 fingerprint
(**Setup → App integrity**). Put it in Vercel as `ANDROID_CERT_SHA256`, with
`ANDROID_PACKAGE` set to the package name above, and redeploy — then the app
opens with no browser bar. `docs/PLAY-STORE.md` has the rest, including
switching on payments through Google Play.
