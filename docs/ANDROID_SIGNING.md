# Android signing

## What the key is, and why losing it is unrecoverable

`biovision-upload-key.jks` in the repository root signs every Android release. Google identifies
the app by the key that signed it, so an update signed with a different key is rejected as a
different app. There is no support ticket that recovers a lost key on a self-signed app: the only
route back is a new Play listing, which means a new URL and every existing install stranded on the
version they have.

The key is **not** in git, and must never be. It is ignored repository-wide (`*.jks`,
`*.keystore`), and `.githooks/pre-commit` blocks it even from `git add -f`.

Its passwords live in `~/.gradle/gradle.properties`, outside the repository:

```
BIOVISION_UPLOAD_STORE_FILE=/Users/<you>/Downloads/biovision/biovision-upload-key.jks
BIOVISION_UPLOAD_STORE_PASSWORD=...
BIOVISION_UPLOAD_KEY_ALIAS=biovision-upload
BIOVISION_UPLOAD_KEY_PASSWORD=...
```

`android/app/build.gradle` reads them with `findProperty`, so a machine without them still builds —
debug-signed, and never shippable.

Key fingerprint, for checking a build came from the right key:

```
SHA-256  24:08:DE:D0:BB:31:4A:FE:67:1B:D9:1E:E1:CD:FA:40:3C:12:80:0F:FB:05:24:C5:33:41:61:DC:C1:B8:D6:30
```

Verify any APK with:

```bash
apksigner verify --print-certs artifacts/BioVision-<version>-release.apk
```

## Back it up before the first Play upload

The key currently exists in one place, on one disk. Store a copy somewhere that survives this
machine — a password manager's file attachment (1Password, Bitwarden) is the usual choice, and it
holds the passwords alongside it. A second copy in a separate place is not paranoia here: disk
failure and a lost key have the same consequence.

Do not put it in the repository, in a shared drive folder that syncs publicly, or in a chat thread.

## Enrol in Play App Signing

Play App Signing changes the failure mode. Google holds the app signing key; you hold an *upload*
key, and this file becomes that upload key. If it is ever lost or exposed, Google can reset it and
you carry on with the same listing — the outcome that is otherwise impossible.

It is the default for new apps uploading an AAB, so enrolling is a matter of not opting out when
creating the Play Console listing. Do this before the first upload: enrolling later is harder.

## Building a signed release

```bash
npm run android:apk   # artifacts/BioVision-<version>-<build>-release.apk, for sideloading
npm run android:aab   # artifacts/BioVision-<version>-<build>-release.aab, for Play
```

Raise `versionCode` in `android/app/build.gradle` for every upload; Play rejects a repeat.

## If the key is ever exposed

Assume anyone holding it can publish as you.

1. If enrolled in Play App Signing, request an upload key reset in the Play Console and generate a
   replacement. Existing installs are unaffected.
2. If not enrolled, the app signing key itself is compromised, and there is no reset. Contact Play
   support before publishing anything further.
3. If it reached a git remote, rotating the key is the fix — purging history is not, because anyone
   who cloned already has it.

## Restoring on a new machine

1. Copy `biovision-upload-key.jks` from your backup into the repository root.
2. Recreate the four properties in `~/.gradle/gradle.properties`.
3. `git config core.hooksPath .githooks`, so the guard is active on the clone too.
4. Confirm with `npm run android:apk` and check the fingerprint above.
