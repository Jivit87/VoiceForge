"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Cpu,
  Download,
  FileText,
  Globe,
  Infinity,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  X,
  CircleHelp,
  PenLine
} from "lucide-react";

import {
  BookOpen,
  Briefcase,
  ClockCounterClockwise,
  DownloadSimple,
  Info,
  Leaf,
  Lightning,
  LinkSimple,
  MaskHappy,
  Microphone,
  Newspaper,
  Play as PhosphorPlay,
  SunHorizon,
  Waveform,
  CircleNotch
} from "@phosphor-icons/react";

import { toast } from "@/components/ui/sonner";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { SERVERS } from "@/lib/servers";
import { cn } from "@/lib/utils";

type HealthState = "checking" | "online" | "offline";
type ButtonState = "idle" | "loading" | "success" | "error";
type StatusTone = "idle" | "loading" | "error" | "success" | "retry";
type Language = (typeof SUPPORTED_LANGUAGES)[number];

type ServerState = {
  name: string;
  url: string;
  health: HealthState;
};

type StatusState = {
  tone: StatusTone;
  text: string;
};

type HistoryItem = {
  instruct: string;
  text: string;
  language: Language;
  platform: string;
  duration: number;
  sampleRate: number;
  audioUrl: string;
};

const MAX_INSTRUCT = 300;
const MAX_TEXT = 500;



const TRUST_ITEMS = [
  { label: "Always Available", icon: Infinity },
  { label: "10 Languages", icon: Globe },
  { label: "Sub-second Generation", icon: Clock3 },
  { label: "Enterprise Scale", icon: Sparkles },
  { label: "Neural Engine", icon: Cpu }
] as const;

const VOICE_PRESETS = [
  {
    icon: BookOpen,
    name: "Audiobook",
    instruct: "A deep, resonant male narrator, slow and dramatic, audiobook style"
  },
  {
    icon: Newspaper,
    name: "News Anchor",
    instruct: "Professional female news anchor, neutral American accent, confident and clear"
  },
  {
    icon: Leaf,
    name: "Meditation",
    instruct: "Soft, breathy female voice, slow pace, calm and soothing, meditation guide"
  },
  {
    icon: Microphone,
    name: "Podcast Host",
    instruct: "Casual male voice, mid-30s, conversational, warm and friendly, podcast style"
  },
  {
    icon: Briefcase,
    name: "Executive",
    instruct: "Authoritative British male, professional and measured, corporate explainer"
  },
  {
    icon: Lightning,
    name: "Announcer",
    instruct: "Energetic male voice, fast pace, very enthusiastic, like a sports commentator"
  },
  {
    icon: MaskHappy,
    name: "Villain",
    instruct: "Raspy older male voice, menacing, slow and deliberate, dramatic"
  },
  {
    icon: SunHorizon,
    name: "Upbeat",
    instruct: "Bright, cheerful female voice, early 20s, upbeat and friendly, warm smile in voice"
  }
] as const;

const HOW_IT_WORKS = [
  {
    number: "01",
    icon: PenLine,
    title: "Describe a Voice",
    body: "Type any voice description in plain English. Tone, pace, accent, age, mood, style."
  },
  {
    number: "02",
    icon: FileText,
    title: "Write your Text",
    body: "Paste the lines you want narrated. The model handles the rest without extra setup."
  },
  {
    number: "03",
    icon: Mic,
    title: "Instant Audio",
    body: "Our proprietary AI engine generates high-fidelity audio streams and returns them directly to your browser."
  }
] as const;

const FEATURE_CARDS = [
  {
    title: "Multi-Region Failover",
    body: "Automatically routes every request across redundant infrastructure so your application never stalls.",
    icon: Sparkles,
    wide: true
  },
  {
    title: "10 Languages",
    body: "English, Chinese, Japanese, Korean, German, French, Russian, Portuguese, Spanish, and Italian.",
    icon: Globe
  },
  {
    title: "Voice Instruction Engine",
    body: "Describe any voice in plain English. No speaker IDs, no reference clips, no extra ceremony.",
    icon: Mic
  },
  {
    title: "Fast architecture",
    body: "Hardware-accelerated neural inference tuned for sub-second turnaround times.",
    icon: Info
  },
  {
    title: "Studio-Quality Export",
    body: "Preview in-browser and download uncompressed, broadcast-ready audio with a single click.",
    icon: Download
  },
  {
    title: "Zero-configuration",
    body: "Built on resilient edge infrastructure ensuring 99.9% uptime and immediate usability.",
    icon: SunHorizon
  }
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = String(total % 60).padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return "0.0";
  return seconds.toFixed(1);
}

function decodeAudioBase64(base64: string) {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function setAudioFromUrl(audio: HTMLAudioElement | null, url: string | null) {
  if (!audio) return;
  audio.src = url ?? "";
  audio.load();
}

function LogoMark({ dark = false }: { dark?: boolean }) {
  const color = dark ? "rgba(255,255,255,0.82)" : "var(--ink)";
  const bars = [8, 14, 20, 14, 8];

  return (
    <svg width="24" height="20" viewBox="0 0 24 20" aria-hidden="true">
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 5}
          y={20 - height}
          width="3"
          height={height}
          rx="1.5"
          fill={color}
          className="waveform-logo-bar"
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </svg>
  );
}

function MicroWaveform({
  active = false,
  progress = 0,
  onScrub,
  onHover,
  onLeave,
  hoverTime = null,
  playedColor = "var(--ink)",
  mutedColor = "rgba(12,10,9,0.12)"
}: {
  active?: boolean;
  progress?: number;
  onScrub?: (clientX: number, rect: DOMRect) => void;
  onHover?: (clientX: number, rect: DOMRect) => void;
  onLeave?: () => void;
  hoverTime?: number | null;
  playedColor?: string;
  mutedColor?: string;
}) {
  const bars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const phase = index / 29;
        const envelope = 0.35 + Math.sin(phase * Math.PI) * 0.65;
        return Math.round(clamp(18 + envelope * 82, 18, 100) * 100) / 100;
      }),
    []
  );

  return (
    <div className="relative">
      {onScrub ? (
        <button
          type="button"
          aria-label="Waveform scrub bar"
          className="group flex h-10 w-full cursor-crosshair items-end gap-1.5"
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onScrub(event.clientX, rect);
          }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onHover?.(event.clientX, rect);
          }}
          onPointerLeave={() => onLeave?.()}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            onScrub(rect.left + rect.width * progress, rect);
          }}
        >
          {bars.map((height, index) => {
            const played = progress > 0 && index / bars.length <= progress;
            return (
              <span
                key={index}
                aria-hidden="true"
                suppressHydrationWarning
                className={cn("waveform-bar block w-[2px] rounded-full")}
                style={{
                  height: `${height}%`,
                  backgroundColor: played ? playedColor : mutedColor,
                  animationDelay: active ? `${index * 60}ms` : `${index * 120}ms`
                }}
              />
            );
          })}
        </button>
      ) : (
        <div className="flex h-10 items-end gap-1.5">
          {bars.map((height, index) => {
            const played = progress > 0 && index / bars.length <= progress;
            return (
              <span
                key={index}
                aria-hidden="true"
                suppressHydrationWarning
                className={cn("waveform-bar block w-[2px] rounded-full")}
                style={{
                  height: `${height}%`,
                  backgroundColor: played ? playedColor : mutedColor,
                  animationDelay: active ? `${index * 60}ms` : `${index * 120}ms`
                }}
              />
            );
          })}
        </div>
      )}
      {progress > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-[var(--ink)]"
          style={{ left: `${progress * 100}%` }}
        />
      ) : null}
      {hoverTime !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 rounded-full border border-[var(--hairline)] bg-[var(--surface-card)] px-2 py-1 text-[11px] font-medium text-[var(--ink-body)] shadow-[var(--shadow-outline)]"
          style={{ left: `${progress * 100}%`, transform: "translateX(-50%)" }}
        >
          {formatTime(hoverTime)}
        </div>
      ) : null}
    </div>
  );
}

function TonePill({
  state,
  label
}: {
  state: HealthState;
  label: string;
}) {
  const palette =
    state === "online"
      ? "border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.08)] text-[#16a34a]"
      : state === "offline"
        ? "border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] text-[#dc2626]"
        : "border-[rgba(217,119,6,0.2)] bg-[rgba(217,119,6,0.08)] text-[#d97706]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-micro",
        palette
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "checking" && "bg-current animate-pulse",
          state === "online" && "bg-current",
          state === "offline" && "bg-current"
        )}
      />
      {label}
    </span>
  );
}

export default function Page() {
  const [servers, setServers] = useState<ServerState[]>(
    SERVERS.map((server) => ({ ...server, health: "checking" }))
  );
  const [roundRobinIndex, setRoundRobinIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("English");
  const [instruct, setInstruct] = useState("");
  const [text, setText] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusState>({ tone: "idle", text: "" });
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    platform: string;
    duration: number;
    sampleRate: number;
  } | null>(null);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const generatedUrlsRef = useRef<string[]>([]);

  const healthyServers = useMemo(
    () => servers.filter((server) => server.health === "online"),
    [servers]
  );

  const isReady = instruct.trim().length > 0 && text.trim().length > 0;
  const instructCount = instruct.trim().length;
  const textCount = text.trim().length;
  const onlineCount = healthyServers.length;
  const playerProgress = audioDuration ? clamp(audioTime / audioDuration, 0, 1) : 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll("[data-reveal]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      const results = await Promise.all(
        SERVERS.map(async (server) => {
          if (!server.url) {
            return { name: server.name, health: "offline" as HealthState };
          }

          try {
            const response = await fetch(`${server.url}/`, {
              headers: { "ngrok-skip-browser-warning": "1" },
              signal: AbortSignal.timeout(5000)
            });
            return {
              name: server.name,
              health: (response.ok ? "online" : "offline") as HealthState
            };
          } catch {
            return { name: server.name, health: "offline" as HealthState };
          }
        })
      );

      if (!controller.signal.aborted) {
        setServers((current) =>
          current.map((server) => {
            const match = results.find((result) => result.name === server.name);
            return match ? { ...server, health: match.health } : server;
          })
        );
      }
    }

    checkHealth();
    const interval = window.setInterval(checkHealth, 30000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : meta?.duration ?? 0);
    };
    const handleTimeUpdate = () => setAudioTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    setAudioFromUrl(audio, audioUrl);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, meta]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      generatedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function pushTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }

  function clearPendingTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function pickServer(excluded = new Set<string>()) {
    const online = healthyServers.filter((server) => !excluded.has(server.name));
    // Fall back to "checking" servers if none are confirmed online yet
    const pool = online.length > 0
      ? online
      : servers.filter((s) => s.health === "checking" && !excluded.has(s.name));
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    const server = pool[roundRobinIndex % pool.length];
    setRoundRobinIndex((index) => index + 1);
    return server;
  }

  function markServer(name: string, health: HealthState) {
    setServers((current) =>
      current.map((server) => (server.name === name ? { ...server, health } : server))
    );
  }

  function updateStatus(tone: StatusTone, text: string) {
    setStatus({ tone, text });
  }

  function scheduleButtonReset(nextState: ButtonState, delay: number) {
    setButtonState(nextState);
    pushTimer(() => setButtonState("idle"), delay);
    if (nextState === "success") {
      pushTimer(() => updateStatus("idle", ""), delay + 250);
    }
    if (nextState === "error") {
      pushTimer(() => updateStatus("idle", ""), delay + 500);
    }
  }

  function scrollToDemo() {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectPreset(index: number) {
    setActivePreset(index);
    setInstruct(VOICE_PRESETS[index].instruct);
    updateStatus("idle", "");
    pushTimer(() => scrollToDemo(), 50);
  }

  function replayHistory(item: HistoryItem) {
    setLanguage(item.language);
    setInstruct(item.instruct);
    setText(item.text);
    setAudioUrl(item.audioUrl);
    setMeta({
      platform: item.platform,
      duration: item.duration,
      sampleRate: item.sampleRate
    });
    setAudioDuration(item.duration);
    setAudioTime(0);
    setIsPlaying(false);
    setActivePreset(null);
    updateStatus("success", "Restored a previous generation.");
    scrollToDemo();
  }

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Page link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function handleGenerate() {
    clearPendingTimers();

    const safeInstruct = instruct.trim();
    const safeText = text.trim();

    if (!safeInstruct || !safeText) {
      updateStatus("error", "Write a voice instruction and the text you want spoken.");
      toast.error("Add a voice instruction and the text.");
      scheduleButtonReset("error", 2500);
      return;
    }

    if (safeInstruct.length > MAX_INSTRUCT || safeText.length > MAX_TEXT) {
      updateStatus("error", "Trim the text fields to fit the allowed limits.");
      toast.error("Your text is over the character limit.");
      scheduleButtonReset("error", 2500);
      return;
    }

    setIsPlaying(false);
    setAudioTime(0);
    setAudioDuration(0);
    setButtonState("loading");

    // Filter out unconfigured servers; Colab first (no tunnel timeout), Kaggle second
    const allServers = SERVERS.filter((s) => s.url.trim() !== "");
    let tried = new Set<string>();

    function nextServer() {
      return allServers.find((s) => !tried.has(s.name)) ?? null;
    }

    while (true) {
      const server = nextServer();

      if (!server) {
        setStatus({
          tone: "error",
          text: "All servers failed to generate. Please try again in a moment."
        });
        toast.error("Generation failed on all servers.");
        scheduleButtonReset("error", 3000);
        return;
      }

      tried.add(server.name);

      updateStatus(
        tried.size === 1 ? "loading" : "retry",
        tried.size === 1
          ? `Generating audio...`
          : `Retrying on backup server...`
      );

      try {
        const response = await fetch(`${server.url}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "1"
          },
          body: JSON.stringify({
            text: safeText,
            instruct: safeInstruct,
            language
          }),
          signal: AbortSignal.timeout(95000) // 95s — under Cloudflare's 100s hard limit
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail ?? `HTTP ${response.status}`);
        }

        const blob = decodeAudioBase64(data.audio_b64);
        const nextAudioUrl = URL.createObjectURL(blob);
        generatedUrlsRef.current.push(nextAudioUrl);

        setAudioUrl(nextAudioUrl);
        setMeta({
          platform: data.platform,
          duration: data.duration_seconds,
          sampleRate: data.sample_rate
        });
        setAudioDuration(data.duration_seconds);
        setAudioTime(0);
        setIsPlaying(false);
        updateStatus(
          "success",
          `Done — ${formatSeconds(data.duration_seconds)}s · served by ${data.platform}.`
        );
        toast.success("Your voiceover is ready.");
        markServer(server.name, "online");
        setHistory((current) => [
          {
            instruct: safeInstruct,
            text: safeText,
            language,
            platform: data.platform,
            duration: data.duration_seconds,
            sampleRate: data.sample_rate,
            audioUrl: nextAudioUrl
          },
          ...current
        ].slice(0, 5));
        scheduleButtonReset("success", 1500);
        return;
      } catch (error) {
        markServer(server.name, "offline");
        const isTimeout = error instanceof Error && error.name === "TimeoutError";
        const remaining = allServers.filter((s) => !tried.has(s.name));
        if (remaining.length > 0) {
          updateStatus("retry", isTimeout
            ? `${server.name} timed out. Switching to next server...`
            : `${server.name} failed. Trying next server...`
          );
          await new Promise<void>((resolve) => { pushTimer(() => resolve(), 500); });
          // continue loop
        } else {
          const message = isTimeout
            ? "Generation timed out on all servers. Please try again."
            : (error instanceof Error ? error.message : "Generation failed.");
          updateStatus("error", message);
          toast.error(message);
          scheduleButtonReset("error", 3000);
          return;
        }
      }
    }
  }

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function scrubAudio(clientX: number, rect: DOMRect) {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextTime = ratio * audioDuration;
    audio.currentTime = nextTime;
    setAudioTime(nextTime);
  }

  function previewWaveform(clientX: number, rect: DOMRect) {
    if (!audioDuration) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    setHoverTime(ratio * audioDuration);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb left-[-10rem] top-[-7rem] h-[22rem] w-[22rem] bg-[radial-gradient(circle,rgba(167,229,211,0.35)_0%,rgba(200,184,224,0.18)_38%,transparent_72%)]" />
        <div className="orb right-[-10rem] top-[8rem] h-[24rem] w-[24rem] bg-[radial-gradient(circle,rgba(244,197,168,0.24)_0%,transparent_68%)] orb--peach" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(12,10,9,0.04),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(167,229,211,0.06),transparent_26%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
        <header
          className={cn(
            "sticky top-0 z-50 -mx-4 px-4 transition-all duration-300 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
            scrolled
              ? "border-b border-[var(--hairline)] bg-[rgba(250,250,250,0.96)] [backdrop-filter:blur(16px)]"
              : "bg-transparent"
          )}
        >
          <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between">

            {/* Logo */}
            <a href="#top" className="flex shrink-0 items-center gap-2">
              <LogoMark />
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
                VoiceForge
              </span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden items-center md:flex">
              {[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Studio", href: "#demo" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="px-4 py-2 text-[14px] font-medium text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]"
                >
                  {label}
                </a>
              ))}

              {/* Use Cases dropdown */}
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 px-4 py-2 text-[14px] font-medium text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]"
                >
                  Use Cases
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>

                {/* Hover bridge */}
                <div className="pointer-events-none absolute left-0 top-full h-3 w-full group-hover:pointer-events-auto" />

                {/* Dropdown */}
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] w-[540px] -translate-x-1/2 scale-[0.98] rounded-2xl border border-[var(--hairline)] bg-white p-3 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                  <div className="grid grid-cols-2 gap-0.5">
                    {[
                      { icon: BookOpen,   title: "Audiobooks",  desc: "Rich narration for long-form stories" },
                      { icon: Newspaper,  title: "News & Media", desc: "Professional broadcast voices" },
                      { icon: Microphone, title: "Podcasts",    desc: "Warm host voices that engage listeners" },
                      { icon: Briefcase,  title: "Enterprise",  desc: "Corporate narration and e-learning" },
                      { icon: Leaf,       title: "Wellness",    desc: "Calm guides for meditation" },
                      { icon: Lightning,  title: "Advertising", desc: "High-energy promotional spots" },
                    ].map(({ icon: Icon, title, desc }) => (
                      <a
                        key={title}
                        href="#demo"
                        className="flex items-start gap-3 rounded-xl p-3 transition-colors duration-100 hover:bg-[var(--canvas-soft)]"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--canvas-warm)]">
                          <Icon weight="duotone" className="h-4 w-4 text-[var(--ink-muted)]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
                          <p className="mt-0.5 text-[12px] leading-[1.4] text-[var(--ink-soft)]">{desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--canvas-soft)] px-4 py-2.5">
                    <span className="text-[12px] text-[var(--ink-muted)]">No account needed — start free</span>
                    <a href="#demo" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--ink)] hover:underline">
                      Open Studio <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </nav>

            {/* Right CTAs */}
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="#docs"
                className="hidden px-3.5 py-2 text-[14px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] sm:inline-flex"
              >
                Sign in
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--ink-2)]"
              >
                Get started
              </a>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                className="ml-1 flex h-8 w-8 flex-col items-center justify-center gap-[5px] md:hidden"
              >
                <span className={cn("h-px w-4 bg-[var(--ink)] transition-all duration-200", mobileMenuOpen && "translate-y-[6px] rotate-45")} />
                <span className={cn("h-px w-4 bg-[var(--ink)] transition-all duration-200", mobileMenuOpen && "opacity-0")} />
                <span className={cn("h-px w-4 bg-[var(--ink)] transition-all duration-200", mobileMenuOpen && "-translate-y-[6px] -rotate-45")} />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 md:hidden",
              mobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <nav className="flex flex-col border-t border-[var(--hairline-soft)] py-3">
              {[
                { label: "Features", href: "#features", desc: "Everything VoiceForge can do" },
                { label: "How it works", href: "#how-it-works", desc: "Three steps to your perfect voice" },
                { label: "Studio", href: "#demo", desc: "Generate voices right here, right now" },
                { label: "Docs", href: "#docs", desc: "API reference and integration guides" },
                { label: "Use Cases", href: "#features", desc: "Audiobooks, podcasts, enterprise & more" },
              ].map(({ label, href, desc }, i) => (
                <a
                  key={href + label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center justify-between rounded-[12px] px-3 py-3 transition-colors duration-150 hover:bg-black/[0.04]"
                  style={{ transitionDelay: mobileMenuOpen ? `${i * 40}ms` : "0ms" }}
                >
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--ink)]">{label}</div>
                    <div className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">{desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--ink-soft)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </a>
              ))}
              <div className="mt-3 border-t border-[var(--hairline-soft)] pt-3">
                <a
                  href="#demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="pill-button pill-button--glow w-full justify-center gap-1.5 py-3 text-[15px]"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </nav>
          </div>
        </header>

        <section id="top" className="relative flex min-h-[calc(100vh-60px)] items-center py-20 sm:py-24">
          <div className="mx-auto w-full max-w-[600px] text-center">

            <div data-reveal className="reveal">
              <h1 className="text-display-mega text-[var(--ink)]">
                Design any{" "}
                <span className="bg-[linear-gradient(135deg,#6ee7b7,#a78bfa)] bg-clip-text text-transparent">
                  voice
                </span>
                .
              </h1>
              <h1 className="text-display-mega italic text-[var(--ink)]">
                In plain English.
              </h1>
            </div>

            <p
              data-reveal
              className="reveal mx-auto mt-7 max-w-[480px] text-[1.0625rem] leading-7 text-[var(--ink-body)]"
            >
              Describe a voice. Write your text. Get studio-quality audio instantly — no sign-up, no account wall.
            </p>

            <div
              data-reveal
              className="reveal mt-9 flex items-center justify-center gap-2.5"
            >
              <a href="#demo" className="pill-button pill-button--primary px-6 py-[11px] text-[14px]">
                Try the Studio <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#how-it-works" className="px-4 py-[11px] text-[14px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
                How it works
              </a>
            </div>

            <div data-reveal className="reveal mt-10 flex flex-col items-center gap-3">
              <MicroWaveform active />
              <div className="flex items-center gap-4 text-[12.5px] text-[var(--ink-soft)]">
                <span>No account</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[var(--hairline-strong)]" />
                <span>10 languages</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[var(--hairline-strong)]" />
                <span>Instant download</span>
              </div>
            </div>

          </div>
        </section>



        <section id="demo" data-reveal className="reveal studio-section mt-16 sm:mt-20">
          <div className="studio-inner">

            {/* ── Title bar — ElevenLabs top chrome ── */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Waveform weight="duotone" className="h-4 w-4 text-[var(--studio-text-secondary)]" />
                <span className="text-[14px] font-medium text-[var(--studio-text-2)]">Voice Studio</span>
                <span className="text-[var(--studio-border-hover)]">|</span>
                <span className="text-[13px] text-[var(--studio-text-secondary)]">New generation</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--studio-text-secondary)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>Ready</span>
              </div>
            </div>

            {/* ── App shell ── */}
            <div className="overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_20px_rgba(0,0,0,0.06)]">

              {/* Three-column layout: left sidebar | center canvas | right controls */}
              <div className="flex min-h-[560px] divide-x divide-[var(--studio-border)]">

                {/* ── Left sidebar — tool nav + voice picker ── */}
                <div className="flex w-64 shrink-0 flex-col divide-y divide-[var(--studio-border)]">
                  {/* Voice picker */}
                  <div className="p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-text-muted)]">Voice</p>
                    <div className="space-y-1">
                      {VOICE_PRESETS.map((preset, index) => {
                        const gradients = ["from-violet-400 to-purple-500","from-orange-400 to-rose-400","from-emerald-400 to-teal-400","from-amber-400 to-orange-400","from-blue-400 to-indigo-500","from-red-400 to-orange-500","from-slate-500 to-zinc-500","from-lime-400 to-emerald-400"];
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => selectPreset(index)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                              activePreset === index
                                ? "bg-[var(--studio-surface-2)] text-[var(--studio-text)]"
                                : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-surface-2)] hover:text-[var(--studio-text-2)]"
                            )}
                          >
                            <div className={cn("h-5 w-5 shrink-0 rounded-full bg-gradient-to-br", gradients[index])} />
                            <span className="text-[13px] font-medium">{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-text-muted)]">Language</p>
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="studio-select appearance-none text-[13px]"
                      >
                        {SUPPORTED_LANGUAGES.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--studio-text-muted)]" />
                    </div>
                  </div>
                </div>

                {/* ── Center canvas — main writing area ── */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex-1 p-8">
                    {/* Voice instruction — subtle, above the fold */}
                    <div className="mb-6">
                      <div className="studio-label mb-2">
                        <span className="flex items-center gap-1.5">
                          Voice Instruction
                          <Info weight="duotone" className="h-3 w-3 opacity-50" />
                        </span>
                        <span className={cn(
                          instructCount > 290 ? "text-[var(--studio-error)]" :
                          instructCount > 250 ? "text-[var(--studio-warning)]" :
                          "text-[var(--studio-text-muted)]"
                        )}>{instructCount}/{MAX_INSTRUCT}</span>
                      </div>
                      <textarea
                        value={instruct}
                        maxLength={MAX_INSTRUCT}
                        onChange={(e) => { setInstruct(e.target.value); setActivePreset(null); }}
                        placeholder='e.g. "Warm male narrator, calm and deep, slight British accent"'
                        className="studio-input text-[14px]"
                        rows={2}
                      />
                    </div>

                    {/* Text — large canvas, ElevenLabs-style prominent writing area */}
                    <div>
                      <div className="studio-label mb-2">
                        <span>Text to Narrate</span>
                        <span className={cn(
                          textCount > 490 ? "text-[var(--studio-error)]" :
                          textCount > 415 ? "text-[var(--studio-warning)]" :
                          "text-[var(--studio-text-muted)]"
                        )}>{textCount}/{MAX_TEXT}</span>
                      </div>
                      <textarea
                        value={text}
                        maxLength={MAX_TEXT}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste or type the lines you want narrated. The voice instruction above will shape how they sound."
                        className="studio-input min-h-[240px] text-[15px] leading-7"
                        rows={10}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Right panel — generate + status ── */}
                <div className="flex w-56 shrink-0 flex-col divide-y divide-[var(--studio-border)]">
                  <div className="flex-1 p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-text-muted)]">Generate</p>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={buttonState === "loading" || !isReady}
                      className={cn(
                        "studio-generate-btn",
                        buttonState === "success" && "studio-generate-btn--success",
                        buttonState === "error" && "studio-generate-btn--error"
                      )}
                    >
                      {buttonState === "loading" ? (
                        <><div className="studio-loading-orb" /><span>Generating…</span></>
                      ) : buttonState === "success" ? (
                        <><Check className="h-4 w-4" /><span>Generated</span></>
                      ) : buttonState === "error" ? (
                        <><X className="h-4 w-4" /><span>Failed · Retry</span></>
                      ) : (
                        <><PhosphorPlay weight="fill" className="h-4 w-4" /><span>Generate Voice</span></>
                      )}
                    </button>

                    {/* Status */}
                    <div
                      role={status.tone === "error" ? "alert" : "status"}
                      aria-live={status.tone === "error" ? "assertive" : "polite"}
                      className={cn("studio-status-bar mt-3", `studio-status-bar--${status.tone}`)}
                    >
                      <div className="flex items-start gap-1.5">
                        {status.tone === "error" ? <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> :
                         status.tone === "success" ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> :
                         status.tone === "retry" ? <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
                        <span>{status.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="p-4">
                    <p className="text-[11px] leading-5 text-[var(--studio-text-secondary)]">
                      <span className="font-semibold text-[var(--studio-text-2)]">Tip</span> — Write voice instructions in English for best results across all languages.
                    </p>
                  </div>

                  {/* History */}
                  {history.length > 0 && (
                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-text-muted)]">
                        <ClockCounterClockwise weight="duotone" className="h-3 w-3" />
                        Recent
                      </div>
                      <div className="space-y-1">
                        {history.slice(0, 4).map((item, index) => (
                          <button
                            key={`${item.platform}-${index}`}
                            type="button"
                            onClick={() => replayHistory(item)}
                            className="w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--studio-surface-2)]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-[var(--studio-text-2)]">{item.language}</span>
                              <span className="font-mono text-[10px] text-[var(--studio-text-muted)]">{formatSeconds(item.duration)}s</span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--studio-text-secondary)]">{item.instruct}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom player bar — ElevenLabs persistent playback ── */}
              <div className="border-t border-[var(--studio-border)] bg-[var(--studio-surface-2)] px-6 py-4">
                <audio ref={audioRef} preload="metadata" className="hidden" />
                {audioUrl && meta ? (
                  <div className="flex items-center gap-5">
                    {/* Large centered play — ElevenLabs signature */}
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent)] text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying
                        ? <Pause className="h-4 w-4" />
                        : <PhosphorPlay weight="fill" className="h-4 w-4 translate-x-0.5" />}
                    </button>

                    {/* Time + waveform scrubber */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <MicroWaveform
                        active={isPlaying}
                        progress={playerProgress}
                        onScrub={scrubAudio}
                        onHover={previewWaveform}
                        onLeave={() => setHoverTime(null)}
                        hoverTime={hoverTime}
                        playedColor="#0c0a09"
                        mutedColor="#d0d0ce"
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-[var(--studio-text-muted)]">
                          {formatTime(audioTime)} / {formatTime(audioDuration || meta.duration)}
                        </span>
                        <div className="flex items-center gap-2">
                          <a href={audioUrl} download="voiceforge-audio" className="studio-pill-btn">
                            <DownloadSimple weight="bold" className="h-3.5 w-3.5" />
                            Export
                          </a>
                          <button type="button" onClick={copyPageLink} className="studio-pill-btn">
                            <LinkSimple className="h-3.5 w-3.5" />
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[var(--studio-text-muted)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--studio-border)] bg-[var(--studio-surface)]">
                      <PhosphorPlay weight="fill" className="h-4 w-4 translate-x-0.5 opacity-30" />
                    </div>
                    <span className="text-[13px]">Audio will appear here after generation</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        <section data-reveal className="reveal -mx-4 border-y border-[var(--hairline-soft)] bg-[var(--canvas-soft)] px-4 py-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            {/* Header */}
            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)]">Voice Library</p>
                <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
                  Pick a personality.<br className="hidden sm:block" /> Start generating.
                </h2>
              </div>
              <p className="max-w-xs text-[14px] leading-6 text-[var(--ink-body)]">
                Click any voice to pre-fill the studio. Each preset is a starting point — edit the instruction freely.
              </p>
            </div>

            {/* Voice grid — ElevenLabs list style */}
            <div className="divide-y divide-[var(--hairline)]">
              {VOICE_PRESETS.map((preset, index) => {
                const gradients = [
                  "from-violet-400 via-purple-300 to-indigo-400",
                  "from-orange-300 via-rose-300 to-pink-400",
                  "from-emerald-300 via-teal-300 to-cyan-400",
                  "from-amber-300 via-orange-300 to-rose-300",
                  "from-blue-300 via-indigo-300 to-violet-400",
                  "from-red-400 via-orange-400 to-yellow-300",
                  "from-slate-400 via-zinc-400 to-stone-500",
                  "from-lime-300 via-emerald-300 to-teal-400",
                ];
                const tags: Record<string, string[]> = {
                  "Audiobook":    ["Male", "Dramatic", "Slow"],
                  "News Anchor":  ["Female", "American", "Clear"],
                  "Meditation":   ["Female", "Calm", "Breathy"],
                  "Podcast Host": ["Male", "Casual", "Warm"],
                  "Executive":    ["Male", "British", "Formal"],
                  "Announcer":    ["Male", "Energetic", "Fast"],
                  "Villain":      ["Male", "Raspy", "Menacing"],
                  "Upbeat":       ["Female", "Cheerful", "Bright"],
                };
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => selectPreset(index)}
                    className="group flex w-full items-center gap-5 py-4 text-left transition-colors hover:bg-white/60 sm:gap-6 sm:px-4 sm:py-5 rounded-xl"
                  >
                    {/* Avatar orb */}
                    <div className={cn(
                      "h-11 w-11 shrink-0 rounded-full bg-gradient-to-br shadow-sm",
                      gradients[index]
                    )} />

                    {/* Name + description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-medium text-[var(--ink)]">{preset.name}</span>
                        <div className="hidden items-center gap-1.5 sm:flex">
                          {(tags[preset.name] ?? []).map(tag => (
                            <span key={tag} className="rounded-full border border-[var(--hairline-strong)] bg-white px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--ink-muted)]">{preset.instruct}</p>
                    </div>

                    {/* Use CTA */}
                    <span className="hidden shrink-0 rounded-full border border-[var(--hairline-strong)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:block">
                      Use voice
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform group-hover:translate-x-0.5 sm:hidden" />
                  </button>
                );
              })}
            </div>

            {/* Footer nudge */}
            <div className="mt-8 flex items-center gap-2 text-[13px] text-[var(--ink-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Or describe any voice you can imagine in the Studio below</span>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          data-reveal
          className="reveal mx-auto w-full max-w-[1440px] py-20 sm:py-24"
        >
          {/* Header */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)]">How it works</p>
              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
                From prompt to audio<br className="hidden sm:block" /> in seconds.
              </h2>
            </div>
            <p className="max-w-xs text-[14px] leading-6 text-[var(--ink-body)]">
              No setup, no API keys. Describe the voice, paste your text, hit generate.
            </p>
          </div>

          {/* Two-column: left steps list, right visual */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-12">
            {/* Left: numbered steps */}
            <div className="flex flex-col gap-px lg:w-80 lg:shrink-0">
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="group flex gap-4 rounded-xl p-5 transition-colors hover:bg-[var(--canvas-soft)]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-card)] text-[12px] font-semibold text-[var(--ink)]">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--ink-muted)]" />
                        <span className="text-[15px] font-medium text-[var(--ink)]">{step.title}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-body)]">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: visual panel */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)]">
              {/* Decorative gradient blobs — like ElevenLabs hero */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-violet-200/60 to-indigo-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-200/50 to-teal-200/30 blur-3xl" />

              <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center gap-8 p-10 lg:min-h-0">
                {/* Mock studio input */}
                <div className="w-full max-w-md space-y-3">
                  <div className="rounded-xl border border-[var(--hairline)] bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Voice Instruction</p>
                    <p className="text-[13px] italic text-[var(--ink-body)]">"Deep British male narrator, slow and dramatic, audiobook style"</p>
                  </div>
                  <div className="rounded-xl border border-[var(--hairline)] bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Text to Narrate</p>
                    <p className="text-[13px] text-[var(--ink-body)]">"In the stillness of the night, the world held its breath..."</p>
                  </div>
                </div>

                {/* Arrow + waveform result */}
                <div className="flex w-full max-w-md flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
                    <div className="h-px w-12 bg-[var(--hairline-strong)]" />
                    <Mic className="h-3.5 w-3.5" />
                    <span>Neural synthesis engine</span>
                    <div className="h-px w-12 bg-[var(--hairline-strong)]" />
                  </div>
                  {/* Fake waveform bars */}
                  <div className="flex w-full items-end justify-center gap-[3px] rounded-xl border border-[var(--hairline)] bg-white/80 px-6 py-4 shadow-sm backdrop-blur-sm">
                    {[6,10,16,22,14,28,18,24,12,20,26,16,10,22,18,14,8,20,24,16,12,18,22,10,6].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[var(--ink)]"
                        style={{ height: `${h}px`, opacity: 0.15 + (i / 30) }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)]">High-fidelity audio · ready to play</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          data-reveal
          className="reveal mx-auto w-full max-w-[1440px] py-20 sm:py-24"
        >
          {/* Header */}
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)]">Platform</p>
              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
                Everything you need<br className="hidden sm:block" /> to ship voice.
              </h2>
            </div>
            <p className="max-w-xs text-[14px] leading-6 text-[var(--ink-body)]">
              A complete voice platform — from natural language prompts to broadcast-ready audio.
            </p>
          </div>

          {/* Two-column: left feature list, right visual panel */}
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
            {/* Left: feature list */}
            <div className="flex flex-col lg:w-72 lg:shrink-0">
              {FEATURE_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="group flex gap-4 border-b border-[var(--hairline)] py-5 last:border-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--canvas-soft)]">
                      <Icon className="h-4 w-4 text-[var(--ink-muted)]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[var(--ink)]">{card.title}</p>
                      <p className="mt-1 text-[13px] leading-5 text-[var(--ink-muted)]">{card.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: bento grid visual */}
            <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-fr">
              {/* Card 1 — large, spans 2 rows */}
              <div className="col-span-2 row-span-1 relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-6">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-violet-200/50 to-purple-100/30 blur-2xl" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Voice Instruction</p>
                <p className="mt-3 text-[22px] font-medium leading-snug tracking-tight text-[var(--ink)]">
                  "Warm female anchor,<br />confident, slight British accent"
                </p>
                <div className="mt-4 flex gap-2">
                  {["Female","Confident","British","Anchor"].map(t => (
                    <span key={t} className="rounded-full border border-[var(--hairline-strong)] bg-white px-2.5 py-0.5 text-[11px] text-[var(--ink-muted)]">{t}</span>
                  ))}
                </div>
              </div>

              {/* Card 2 — languages */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-5">
                <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-100/20 blur-xl" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Languages</p>
                <p className="mt-2 text-[28px] font-semibold text-[var(--ink)]">10</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {["EN","ZH","JA","KO","DE","FR","RU","PT","ES","IT"].map(l => (
                    <span key={l} className="rounded border border-[var(--hairline)] bg-white px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink-muted)]">{l}</span>
                  ))}
                </div>
              </div>

              {/* Card 3 — latency */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-5">
                <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-100/20 blur-xl" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Generation</p>
                <p className="mt-2 text-[28px] font-semibold text-[var(--ink)]">&lt;2s</p>
                <p className="mt-1 text-[12px] text-[var(--ink-muted)]">Average time to first audio</p>
                {/* Mini bar chart */}
                <div className="mt-3 flex items-end gap-0.5 h-8">
                  {[40,55,35,70,50,80,45,90,60,75].map((h,i) => (
                    <div key={i} className="flex-1 rounded-sm bg-[var(--ink)]" style={{height:`${h}%`, opacity: 0.08 + i * 0.03}} />
                  ))}
                </div>
              </div>

              {/* Card 4 — export */}
              <div className="col-span-2 relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-rose-200/40 to-pink-100/20 blur-xl" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-muted)]">Export</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)]">
                      <Download className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[var(--ink)]">voiceforge-audio</p>
                      <p className="text-[12px] text-[var(--ink-muted)]">Broadcast-ready · instant download</p>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        </section>


        <section
          id="faq"
          data-reveal
          className="reveal mx-auto w-full max-w-[1440px] py-4 pb-20 sm:pb-24"
        >
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* Left: title */}
            <div className="lg:w-64 lg:shrink-0 lg:pt-1">
              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">FAQs</h2>
            </div>

            {/* Right: accordion */}
            <div className="flex-1">
              {[
                {
                  q: "Why write voice prompts in English?",
                  a: "The model interprets tone, accent, age, and style best when described in English — even if the narration itself is in another language."
                },
                {
                  q: "What happens if a server goes offline?",
                  a: "VoiceForge automatically detects the issue and retries your request on the next available server. Generation continues uninterrupted as long as any server in the pool is healthy."
                },
                {
                  q: "What should I put in the Text to Narrate field?",
                  a: "Paste any spoken-word content: a product script, scene excerpt, announcement, or narration. Keep it under 500 characters per generation."
                },
                {
                  q: "Which languages are supported?",
                  a: "English, Chinese, Japanese, Korean, German, French, Russian, Portuguese, Spanish, and Italian."
                },
                {
                  q: "What audio format is returned?",
                  a: "VoiceForge returns high-fidelity audio you can play instantly in the browser or download for use anywhere."
                },
                {
                  q: "Is VoiceForge free to use?",
                  a: "Yes — no subscription, no credit card, no usage caps. Generate as much as you need."
                },
              ].map((item, i) => (
                <div key={i} className="border-b border-dashed border-[var(--hairline-strong)]">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[15px] font-medium text-[var(--ink)]">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform duration-200",
                        openFaq === i && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      openFaq === i ? "max-h-40 pb-5 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <p className="text-[14px] leading-7 text-[var(--ink-body)]">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          data-reveal
          className="reveal -mx-4 mt-auto bg-[var(--canvas-deep)] px-4 py-16 text-[var(--ink-on-dark-soft)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-col gap-10 border-b border-[rgba(255,255,255,0.07)] pb-10 lg:flex-row lg:justify-between">
              {/* Brand */}
              <div className="max-w-[260px]">
                <a href="#top" className="flex items-center gap-2.5">
                  <LogoMark dark />
                  <span className="font-display text-[19px] font-light tracking-[-0.03em] text-[var(--ink-on-dark)]">
                    VoiceForge
                  </span>
                </a>
                <p className="mt-4 text-[13px] leading-6 text-[rgba(255,255,255,0.35)]">
                  Design any voice in plain English. Instant, high-fidelity audio generation with no sign-up required.
                </p>
              </div>

              {/* Nav columns */}
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.25)]">Product</p>
                  <div className="flex flex-col gap-3 text-[13px]">
                    <a href="#demo" className="transition-colors hover:text-[var(--ink-on-dark)]">Studio</a>
                    <a href="#features" className="transition-colors hover:text-[var(--ink-on-dark)]">Features</a>
                    <a href="#how-it-works" className="transition-colors hover:text-[var(--ink-on-dark)]">How it works</a>
                  </div>
                </div>
                <div>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.25)]">Resources</p>
                  <div className="flex flex-col gap-3 text-[13px]">
                    <a href="#docs" className="transition-colors hover:text-[var(--ink-on-dark)]">API Docs</a>
                    <a href="#faq" className="transition-colors hover:text-[var(--ink-on-dark)]">FAQs</a>
                  </div>
                </div>
                <div>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.25)]">Voices</p>
                  <div className="flex flex-col gap-3 text-[13px]">
                    {VOICE_PRESETS.slice(0, 4).map(p => (
                      <a key={p.name} href="#demo" className="transition-colors hover:text-[var(--ink-on-dark)]">{p.name}</a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 text-[12px] text-[rgba(255,255,255,0.25)] sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} VoiceForge. All rights reserved.</span>
              <div className="flex items-center gap-5">
                <a href="#" className="transition-colors hover:text-[rgba(255,255,255,0.6)]">Privacy</a>
                <a href="#" className="transition-colors hover:text-[rgba(255,255,255,0.6)]">Terms</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

