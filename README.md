# Close Proximity

A proximity-based social app for iOS that helps people discover and connect with others nearby, in real time.

<a href="https://apps.apple.com/us/app/close-proximity/id6780470839">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="50">
</a>

**Live app:** [close-proximity.com](https://close-proximity.com) · **App Store:** [Close Proximity](https://apps.apple.com/us/app/close-proximity/id6780470839)

<!-- Add a screenshot or short demo GIF here — this is the first thing visitors see -->

## What it does

Close Proximity surfaces people around you based on physical proximity, so connections start where you actually are — a venue, an event, a neighborhood — instead of an endless swipe queue.

- **Proximity discovery** — find and connect with users near your current location
- **In-app chat** — message your connections directly
- **Push notifications** — real-time alerts via OneSignal, targeted per user
- **Full account system** — email/password auth with OTP verification, password reset flows
- **Safety built in** — report, flag, and block tools on all user content, backed by an admin moderation dashboard

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui |
| Backend & data | Base44 (auth, entities, functions) |
| Push notifications | OneSignal |
| iOS distribution | React Native / Expo WebView shell, built with EAS |
| Web hosting | Base44 |

The web app in this repo is wrapped in a native iOS shell for App Store distribution. Base44's GitHub integration keeps this repo in two-way sync with the visual builder — changes pushed here appear in the builder, and vice versa.

## Running it locally

```bash
git clone https://github.com/davidolivo5999/close-proximity.git
cd close-proximity
npm install
```

Create a `.env.local` file in the project root:

```
VITE_BASE
