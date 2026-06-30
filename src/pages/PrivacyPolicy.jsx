import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const sections = [
  {
    title: "1. Information We Collect",
    items: [
      {
        label: "Location Data",
        text: "With your permission, we collect your approximate location to show you nearby users and enable the proximity-based discovery features of the app. Location sharing requires your explicit opt-in and is only shared when you manually check in — it is never shared automatically or in the background.",
      },
      {
        label: "Profile Information",
        text: "Name, profile photo, and any bio or interests you choose to add to your profile.",
      },
      {
        label: "Photos",
        text: "If you upload a profile picture, we access your photo library or camera with your permission.",
      },
      {
        label: "Push Notification Data",
        text: "We use OneSignal to send push notifications. This involves collecting a device token to deliver notifications to you.",
      },
      {
        label: "Purchase Information",
        text: "If you subscribe to Close Proximity Pro, purchases are processed by Apple's App Store. We receive confirmation of your subscription status but do not collect or store your payment card details.",
      },
      {
        label: "Messages",
        text: "If you use in-app messaging features, message content is stored to enable the conversation history feature.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    text: "We use the information above to operate core app features (nearby discovery, friend connections, messaging), send relevant notifications, process subscriptions, and maintain a safe community through our moderation and blocking systems.",
  },
  {
    title: "3. User Safety and Moderation",
    text: "Close Proximity includes tools that allow you to report and block other users. Reported content is reviewed by our moderation system to enforce our community guidelines.",
  },
  {
    title: "4. Data Sharing",
    text: "We do not sell your personal information. We share data only with service providers necessary to operate the app (such as OneSignal for notifications and Apple for subscription processing), or when required by law.",
  },
  {
    title: "5. Your Choices",
    text: "You may decline location sharing at any time; doing so will limit access to proximity-based features but will not prevent you from using the rest of the app. You may also block or report other users, and you can delete your account at any time from the app's settings.",
  },
  {
    title: "6. Children's Privacy",
    text: "Close Proximity is rated 17+ and is not intended for use by anyone under the age of 17.",
  },
  {
    title: "7. Contact Us",
    text: "If you have any questions about this Privacy Policy, please contact us at:",
    contact: "closeproximity921@gmail.com",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-4 flex items-center gap-3 safe-area-top">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        {/* Intro */}
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-bold text-foreground">Privacy Policy</h2>
          <p className="text-sm text-muted-foreground">Close Proximity · Last Updated: June 30, 2026</p>
        </div>

        <p className="text-foreground/80 leading-relaxed">
          Close Proximity ("we," "our," or "the app") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
        </p>

        {/* Sections */}
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
            {section.items ? (
              <ul className="space-y-3">
                {section.items.map((item, i) => (
                  <li key={i} className="leading-relaxed text-foreground/80">
                    <span className="font-medium text-foreground">{item.label}: </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="leading-relaxed text-foreground/80">
                {section.text}
                {section.contact && (
                  <>
                    {" "}
                    <a href={`mailto:${section.contact}`} className="text-primary hover:underline font-medium">
                      {section.contact}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        ))}

        {/* Footer note */}
        <div className="border-t border-border pt-6 text-sm text-muted-foreground text-center pb-8">
          © 2026 Close Proximity. All rights reserved.
        </div>
      </div>
    </div>
  );
}