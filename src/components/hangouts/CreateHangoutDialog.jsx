import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

const EMOJIS = ["☕", "🍕", "🎮", "🏃", "🎸", "📚", "🍺", "🎨", "🏀", "🌳", "🎵", "🍜"];
const DURATIONS = [
  { label: "30 min", value: 0.5 },
  { label: "1 hour", value: 1 },
  { label: "2 hours", value: 2 },
  { label: "4 hours", value: 4 },
];

export default function CreateHangoutDialog({ open, onClose, onSubmit, isLoading }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("☕");
  const [duration, setDuration] = useState(1);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), emoji, duration_hours: duration });
    setTitle("");
    setDescription("");
    setEmoji("☕");
    setDuration(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-sm mx-4 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading text-xl">Create a Hangout</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Let your friends know you're around and invite them to join you.
          </p>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Emoji picker */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Vibe</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border-2 ${
                    emoji === e
                      ? "border-primary bg-primary/10 scale-110"
                      : "border-border bg-muted/40 hover:border-primary/40"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">What's happening?</Label>
            <Input
              placeholder="e.g. Coffee at the corner café"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl bg-muted/50 border-0 focus-visible:ring-primary/30"
              maxLength={60}
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Details <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Any extra info for friends joining..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-muted/50 border-0 focus-visible:ring-primary/30 resize-none"
              rows={2}
              maxLength={160}
            />
          </div>

          {/* Duration */}
          <div>
            <Label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Duration
            </Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                    duration === d.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/40 text-foreground hover:border-primary/40"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
            className="flex-1 rounded-xl"
          >
            {isLoading ? "Creating..." : "Drop Pin 📍"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}