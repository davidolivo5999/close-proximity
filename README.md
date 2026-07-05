Close Proximity

A proximity-based social app for iOS that helps people discover and connect with others nearby, in real time.

Live app: close-proximity.com · App Store: close proximity 

<!-- Add a screenshot or short demo GIF here — this is the first thing visitors see -->
What it does

Close Proximity surfaces people around you based on physical proximity, so connections start where you actually are — a venue, an event, a neighborhood — instead of an endless swipe queue.


Proximity discovery — find and connect with users near your current location
In-app chat — message your connections directly
Push notifications — real-time alerts via OneSignal, targeted per user
Full account system — email/password auth with OTP verification, password reset flows
Safety built in — report, flag, and block tools on all user content, backed by an admin moderation dashboard


Tech stack

LayerTechnologyFrontendReact + Vite, Tailwind CSS, shadcn/uiBackend & dataBase44 (auth, entities, functions)Push notificationsOneSignaliOS distributionReact Native / Expo WebView shell, built with EASWeb hostingBase44

The web app in this repo is wrapped in a native iOS shell for App Store distribution. Base44's GitHub integration keeps this repo in two-way sync with the visual builder — changes pushed here appear in the builder, and vice versa.

Running it locally

bashgit clone https://github.com/davidolivo5999/close-proximity.git
cd close-proximity
npm install

Create a .env.local file in the project root:

VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

Then start the dev server:

bashnpm run dev

Project structure

src/
├── api/          # Base44 client setup
├── components/   # Shared UI components (layout, dialogs, shadcn/ui)
├── lib/          # Auth context, OneSignal service, app params
└── pages/        # Routes: discovery, chat, auth flows, privacy policy

Privacy & safety

Close Proximity handles location and personal data with care:


Privacy policy published at close-proximity.com/privacy
Location is used only for proximity features, with OS-level permission prompts
User data is never sold; sharing is limited to operational providers (OneSignal, Apple)
All user-generated content can be reported or flagged, and users can block one another; reports route to an admin moderation dashboard


About

Built by David Olivo, an independent app developer in NYC.
