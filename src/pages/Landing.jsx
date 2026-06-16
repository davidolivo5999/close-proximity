import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Zap, MessageCircle, Calendar, Shield } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: MapPin,
      title: "Discover Nearby",
      description: "Find people around you who share your interests in real-time.",
    },
    {
      icon: Users,
      title: "Connect & Network",
      description: "Send friend requests and build genuine connections.",
    },
    {
      icon: Calendar,
      title: "Create Hangouts",
      description: "Host spontaneous events and invite friends to join.",
    },
    {
      icon: MessageCircle,
      title: "Direct Messages",
      description: "Chat privately with people you connect with.",
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Get notified when friends are nearby.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Control your visibility with privacy zones.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-foreground">Proximity</h1>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="rounded-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-5 py-20 safe-area-top">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="space-y-3">
            <h2 className="text-5xl md:text-6xl font-heading font-bold text-foreground leading-tight">
              Meet people <span className="text-primary">near you</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover amazing people around you, share interests, create spontaneous hangouts, and build real connections.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full rounded-xl">
                Start Exploring
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full rounded-xl">
                Already have an account?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-5 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-heading font-bold text-foreground mb-3">
            Everything you need
          </h3>
          <p className="text-muted-foreground">
            Powerful features designed for authentic connections
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="px-5 py-16 bg-primary/5 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-primary mb-2">10K+</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary mb-2">50K+</p>
              <p className="text-sm text-muted-foreground">Connections Made</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary mb-2">1K+</p>
              <p className="text-sm text-muted-foreground">Hangouts Created</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-5 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 bg-card rounded-3xl border border-border p-12">
          <h3 className="text-3xl font-heading font-bold text-foreground">
            Ready to get started?
          </h3>
          <p className="text-muted-foreground text-lg">
            Join thousands of people discovering real connections in their area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full rounded-xl">
                Create Account
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full rounded-xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-5 py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Proximity. All rights reserved.</p>
      </footer>
    </div>
  );
}