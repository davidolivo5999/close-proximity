import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertTriangle, UserX, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/login";

  const handleAgree = () => {
    localStorage.setItem("terms_agreed", "1");
    navigate(next, { replace: true });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: "#f2f2ed" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}>
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
        <p className="text-sm text-gray-500 mt-1">Please read and agree before continuing</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 max-w-lg mx-auto w-full">

        {/* Zero tolerance banner */}
        <div className="rounded-2xl p-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">Zero Tolerance Policy</p>
              <p className="text-sm text-red-600 mt-1">
                We have a strict <strong>zero-tolerance policy</strong> for objectionable content and abusive behavior.
                Violations result in immediate and permanent removal from the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Cards */}
        {[
          {
            icon: Flag,
            color: "text-orange-500",
            bg: "bg-orange-50 border-orange-100",
            title: "Prohibited Content",
            body: "You may not post, share, or transmit content that is sexually explicit, violent, hateful, harassing, threatening, or otherwise objectionable. This includes photos, videos, messages, and profile information."
          },
          {
            icon: UserX,
            color: "text-purple-500",
            bg: "bg-purple-50 border-purple-100",
            title: "User Conduct",
            body: "You agree not to harass, bully, stalk, intimidate, or abuse other users. Any form of discrimination based on race, gender, religion, nationality, sexual orientation, disability, or age is strictly prohibited."
          },
          {
            icon: ShieldCheck,
            color: "text-teal-500",
            bg: "bg-teal-50 border-teal-100",
            title: "Reporting & Enforcement",
            body: "You can report any objectionable content or abusive user at any time. Reports are reviewed promptly. Users found in violation will be permanently banned. You may also block any user to immediately remove them from your experience."
          },
        ].map(({ icon: Icon, color, bg, title, body }) => (
          <div key={title} className={`rounded-2xl p-4 border ${bg}`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`font-bold text-sm ${color.replace("text-", "text-").replace("-500", "-700")}`}>{title}</p>
                <p className="text-sm text-gray-600 mt-1">{body}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Full terms */}
        <div className="rounded-2xl p-4 bg-white border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Full Terms Summary</p>
          <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
            <p>• <strong>Age requirement:</strong> You must be 18 years or older to use this app.</p>
            <p>• <strong>Real identity:</strong> You agree to provide accurate information about yourself.</p>
            <p>• <strong>Your content:</strong> You are solely responsible for any content you post.</p>
            <p>• <strong>Our rights:</strong> We reserve the right to remove any content and ban any account at our sole discretion.</p>
            <p>• <strong>Privacy:</strong> Location data is used solely to facilitate nearby discovery. We do not sell your data.</p>
            <p>• <strong>EULA:</strong> This app is licensed to you, not sold. You may not reverse-engineer or redistribute it.</p>
            <p>• <strong>Changes:</strong> We may update these terms. Continued use constitutes acceptance.</p>
            <p>• <strong>Governing law:</strong> These terms are governed by applicable law in your jurisdiction.</p>
          </div>
        </div>

      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 px-5 py-4 bg-white/90 backdrop-blur-md border-t border-gray-200 safe-area-bottom">
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded accent-orange-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-700 leading-snug">
            I have read and agree to the Terms of Use, including the zero-tolerance policy for objectionable content and abusive behavior.
          </span>
        </label>
        <Button
          onClick={handleAgree}
          disabled={!agreed}
          className="w-full h-12 font-semibold rounded-2xl"
          style={{ background: agreed ? "linear-gradient(135deg, #f97316, #ec4899)" : undefined }}
        >
          I Agree — Continue
        </Button>
      </div>
    </div>
  );
}