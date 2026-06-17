import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, Scissors, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_DURATION = 120; // 2 minutes

export default function VideoEditor({ file, onConfirm, onCancel }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(MAX_DURATION);
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [objectUrl] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const handleLoaded = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = vid.duration;
    setDuration(dur);
    setTrimEnd(Math.min(dur, MAX_DURATION));
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const t = vid.currentTime;
    setCurrentTime(t);
    // Stop at trim end
    if (t >= trimEnd) {
      vid.pause();
      vid.currentTime = trimEnd;
      setPlaying(false);
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
      setPlaying(false);
    } else {
      if (vid.currentTime < trimStart || vid.currentTime >= trimEnd) {
        vid.currentTime = trimStart;
      }
      vid.play();
      setPlaying(true);
    }
  };

  const handleStartChange = (e) => {
    const val = Math.min(Number(e.target.value), trimEnd - 1);
    setTrimStart(val);
    if (videoRef.current) videoRef.current.currentTime = val;
  };

  const handleEndChange = (e) => {
    const val = Math.max(Number(e.target.value), trimStart + 1);
    const capped = Math.min(val, trimStart + MAX_DURATION);
    setTrimEnd(capped);
    if (videoRef.current) videoRef.current.currentTime = capped;
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const trimLength = trimEnd - trimStart;
  const isOverLimit = trimLength > MAX_DURATION;

  const handleConfirm = useCallback(async () => {
    // If the whole video fits within 2 min and no trimming needed, use raw file
    if (trimStart === 0 && trimEnd >= duration && duration <= MAX_DURATION) {
      onConfirm(file);
      return;
    }

    setProcessing(true);

    // Use MediaRecorder to capture the trimmed portion from the video element
    const vid = videoRef.current;
    if (!vid) return;

    vid.currentTime = trimStart;
    vid.muted = true;

    // Create a canvas to capture frames
    const canvas = document.createElement("canvas");
    canvas.width = vid.videoWidth || 640;
    canvas.height = vid.videoHeight || 360;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(30);

    // Also capture audio from the video element
    let audioStream = null;
    try {
      if (vid.captureStream) {
        const vidStream = vid.captureStream();
        const audioTracks = vidStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioStream = new MediaStream(audioTracks);
          audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        }
      }
    } catch (_) {}

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const trimmedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), { type: mimeType });
      setProcessing(false);
      onConfirm(trimmedFile);
    };

    recorder.start();
    vid.play();

    // Draw frames to canvas while recording
    const drawFrame = () => {
      if (vid.currentTime >= trimEnd || vid.paused) return;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };
    drawFrame();

    // Stop after trim duration
    setTimeout(() => {
      vid.pause();
      recorder.stop();
    }, (trimEnd - trimStart) * 1000 + 200);
  }, [trimStart, trimEnd, duration, file, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Trim Video</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 200 }}>
          <video
            ref={videoRef}
            src={objectUrl}
            onLoadedMetadata={handleLoaded}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
            className="max-h-56 w-full object-contain"
            playsInline
          />
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
          >
            {!playing && (
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Play className="h-6 w-6 text-white fill-white ml-1" />
              </div>
            )}
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Time info */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Duration: {fmt(trimLength)}</span>
            <span className={isOverLimit ? "text-destructive font-semibold" : "text-emerald-500 font-semibold"}>
              {isOverLimit ? `Over 2 min limit!` : `Max 2:00`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary/30 rounded-full"
              style={{
                left: `${(trimStart / Math.max(duration, 1)) * 100}%`,
                width: `${((trimEnd - trimStart) / Math.max(duration, 1)) * 100}%`,
              }}
            />
            <div
              className="absolute h-full w-1 bg-primary rounded-full"
              style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
            />
          </div>

          {/* Trim Start */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Start</span>
              <span className="font-mono">{fmt(trimStart)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimStart}
              onChange={handleStartChange}
              className="w-full accent-primary"
            />
          </div>

          {/* Trim End */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>End</span>
              <span className="font-mono">{fmt(trimEnd)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimEnd}
              onChange={handleEndChange}
              className="w-full accent-primary"
            />
          </div>

          {isOverLimit && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              Selection is longer than 2 minutes. Adjust the start or end to trim it down.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl" disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isOverLimit || processing}
              className="flex-1 rounded-xl"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <><Check className="h-4 w-4 mr-1" /> Use this clip</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}