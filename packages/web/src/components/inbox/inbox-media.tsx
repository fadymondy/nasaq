"use client";

import { ExternalLink, LocateFixed, MapPin, Pause, Play, Send, Square, Trash2 } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Input } from "../field";
import { Spinner } from "../spinner";
import {
  downsample,
  fakeWaveform,
  formatCoords,
  formatDuration,
  type GeoPoint,
  hostOf,
  isLat,
  isLng,
  type LinkPreviewData,
  mapsUrl,
  PAD_SPAN,
  padToPoint,
  pointToPad,
} from "./inbox-format";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";

// ---------------------------------------------------------------------------------------------
// Waveform bars (shared by the recorder and the player)
// ---------------------------------------------------------------------------------------------

function Bars({ levels, progress = 1, className }: { levels: readonly number[]; progress?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-7 flex-1 items-center gap-[2px]", className)} dir="ltr">
      {levels.map((v, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{ height: `${Math.round(Math.max(0.12, v) * 100)}%` }}
          className={cn("w-[3px] shrink-0 rounded-full", i / levels.length < progress ? "bg-foreground" : "bg-nq-line-strong")}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Voice player
// ---------------------------------------------------------------------------------------------

export interface VoicePlayerProps extends Omit<ComponentProps<"div">, "children"> {
  /** Audio URL. Without it the player only simulates progress (demos, previews before upload). */
  src?: string;
  /** Seconds. */
  duration: number;
  waveform?: readonly number[];
  labels?: Partial<InboxLabels>;
}

const RATES = [1, 1.5, 2] as const;

/** A voice note: play or pause, a seekable waveform, the time and a 1x, 1.5x, 2x speed toggle. */
export function VoicePlayer({ src, duration, waveform, labels, className, ...props }: VoicePlayerProps) {
  const t = useInboxLabels(labels);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState<(typeof RATES)[number]>(1);
  const bars = useMemo(() => waveform ?? fakeWaveform(duration), [waveform, duration]);
  const total = Math.max(0.1, duration);

  // Simulated playback when there is no audio source.
  useEffect(() => {
    if (src || !playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + (0.1 * rate) / total;
        if (next >= 1) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [src, playing, rate, total]);

  const toggle = () => {
    const el = audio.current;
    if (src && el) {
      if (playing) el.pause();
      else void el.play().catch(() => setPlaying(false));
    }
    setPlaying((p) => !p);
  };

  const seek = (value: number) => {
    setProgress(value);
    const el = audio.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = value * el.duration;
  };

  const cycle = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length] as (typeof RATES)[number];
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  return (
    <div data-slot="voice-player" data-playing={playing || undefined} className={cn("flex w-64 max-w-full items-center gap-2", className)} {...props}>
      {src ? (
        // biome-ignore lint/a11y/useMediaCaption: a voice message has no captions
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
        />
      ) : null}
      <Button type="button" variant="secondary" size="icon-sm" className="rounded-full" aria-label={playing ? t.pause : t.play} onClick={toggle}>
        {playing ? <Pause aria-hidden className="fill-current" /> : <Play aria-hidden className="fill-current rtl:-scale-x-100" />}
      </Button>
      <span className="relative flex flex-1 items-center">
        <Bars levels={bars} progress={progress} />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(progress * 100)}
          aria-label={t.voiceProgress}
          aria-valuetext={`${formatDuration(progress * total)} / ${formatDuration(total)}`}
          onChange={(e) => seek(Number(e.target.value) / 100)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      <span dir="ltr" className="w-9 shrink-0 text-caption tabular-nums text-muted-foreground">
        {formatDuration(playing || progress > 0 ? progress * total : total)}
      </span>
      <button
        type="button"
        onClick={cycle}
        aria-label={t.speed}
        className="h-5 min-w-8 rounded-full border border-border px-1.5 text-caption tabular-nums text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
      >
        <bdi>{rate}x</bdi>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Voice recorder
// ---------------------------------------------------------------------------------------------

export interface VoiceRecording {
  blob?: Blob;
  /** Seconds. */
  duration: number;
  /** 32 bars, 0 to 1. */
  waveform: number[];
}

export interface VoiceRecorderProps extends Omit<ComponentProps<"div">, "children" | "onSubmit"> {
  /** Called with the finished recording when the person taps send. */
  onSend: (recording: VoiceRecording) => void | Promise<void>;
  onCancel: () => void;
  /** Stops by itself at this many seconds. Default 120. */
  maxSeconds?: number;
  /** Never touch the microphone: animate fake levels. For demos and tests. */
  simulate?: boolean;
  labels?: Partial<InboxLabels>;
}

type RecState = "starting" | "recording" | "stopped" | "error";

/**
 * Records a voice message with MediaRecorder: a timer and live level bars while recording, then a preview with send and
 * discard. It asks for the microphone when it mounts, so render it only once the person asked to record. Nothing is
 * uploaded: `onSend` gets the blob.
 */
export function VoiceRecorder({ onSend, onCancel, maxSeconds = 120, simulate = false, labels, className, ...props }: VoiceRecorderProps) {
  const t = useInboxLabels(labels);
  const [state, setState] = useState<RecState>("starting");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [preview, setPreview] = useState<{ url?: string; blob?: Blob }>({});
  const [busy, setBusy] = useState(false);
  const levels = useRef<number[]>([]);
  const started = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finalSeconds = useRef(0);

  const release = useCallback(() => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void ctx.current?.close().catch(() => {});
    ctx.current = null;
  }, []);

  const finish = useCallback(() => {
    finalSeconds.current = (Date.now() - started.current) / 1000;
    setElapsed(finalSeconds.current);
    clearInterval(timer.current);
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setPreview({ blob, url: URL.createObjectURL(blob) });
        release();
        setState("stopped");
      };
      rec.stop();
    } else {
      release();
      setState("stopped");
    }
  }, [release]);

  useEffect(() => {
    let cancelled = false;
    const sample = (read: () => number) => {
      timer.current = setInterval(() => {
        const secs = (Date.now() - started.current) / 1000;
        setElapsed(secs);
        const level = read();
        levels.current.push(level);
        setLive((l) => [...l.slice(-39), level]);
        if (secs >= maxSeconds) finish();
      }, 100);
    };
    const begin = async () => {
      if (simulate) {
        started.current = Date.now();
        setState("recording");
        let x = 1;
        sample(() => {
          x += 1;
          return 0.2 + 0.7 * Math.abs(Math.sin(x / 2.3) * Math.cos(x / 5.1));
        });
        return;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError(t.recorderUnsupported);
        setState("error");
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        const rec = new MediaRecorder(media);
        recorder.current = rec;
        rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        rec.start();
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        let read = () => 0.3;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          ctx.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          audioCtx.createMediaStreamSource(media).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          read = () => {
            analyser.getByteTimeDomainData(data);
            let peak = 0;
            for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
            return Math.min(1, peak / 64);
          };
        }
        started.current = Date.now();
        setState("recording");
        sample(read);
      } catch {
        if (!cancelled) {
          setError(t.recorderMic);
          setState("error");
        }
      }
    };
    void begin();
    return () => {
      cancelled = true;
      release();
      const rec = recorder.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
    };
    // Starts once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => (preview.url ? URL.revokeObjectURL(preview.url) : undefined), [preview.url]);

  const waveform = useMemo(() => downsample(levels.current, 32), [state === "stopped"]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true);
    try {
      await onSend({ blob: preview.blob, duration: Math.max(1, Math.round(finalSeconds.current)), waveform });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-slot="voice-recorder"
      data-state={state}
      role="group"
      aria-label={t.voice}
      className={cn("flex min-h-control items-center gap-2 rounded-card border border-input bg-card p-1.5", className)}
      {...props}
    >
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.recorderCancel} onClick={onCancel}>
        <Trash2 aria-hidden />
      </Button>
      {state === "error" ? (
        <p role="alert" className="flex-1 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : state === "starting" ? (
        <p role="status" className="flex flex-1 items-center gap-2 text-body-sm text-muted-foreground">
          <Spinner className="size-4" />
          {t.recorderStarting}
        </p>
      ) : state === "recording" ? (
        <>
          <span role="status" className="flex items-center gap-1.5 text-caption text-nq-danger-text">
            <span aria-hidden className="size-2 rounded-full bg-nq-danger motion-safe:animate-pulse" />
            <span className="sr-only">{t.recording}</span>
            <span dir="ltr" className="w-10 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </span>
          <Bars levels={live.length ? live : [0.1]} className="justify-end" />
          <Button type="button" variant="secondary" size="icon-sm" className="rounded-full" aria-label={t.recorderStop} onClick={finish}>
            <Square aria-hidden className="fill-current" />
          </Button>
        </>
      ) : (
        <>
          <VoicePlayer src={preview.url} duration={Math.max(1, Math.round(finalSeconds.current))} waveform={waveform} labels={labels} className="flex-1" />
          <Button type="button" variant="primary" size="icon-sm" loading={busy} aria-label={t.recorderSend} onClick={send}>
            <Send aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Location: picker and message card
// ---------------------------------------------------------------------------------------------

const PAD_GRID =
  "[background-image:linear-gradient(var(--nq-line)_1px,transparent_1px),linear-gradient(90deg,var(--nq-line)_1px,transparent_1px)] [background-size:2rem_2rem]";

export interface LocationPickerProps extends Omit<ComponentProps<"div">, "children" | "onSubmit"> {
  /** Where the map pad starts. Default Riyadh. */
  center?: { lat: number; lng: number };
  /** Preselected point. */
  value?: GeoPoint;
  /** Suggested places shown as buttons. */
  suggestions?: GeoPoint[];
  onSend: (point: GeoPoint) => void | Promise<void>;
  onCancel?: () => void;
  labels?: Partial<InboxLabels>;
}

/**
 * Pick a place to share. There is no map tile service: a neutral pad stands for the area around `center` (about 4 km).
 * Click or drag the pin, use the arrow keys, type coordinates, choose a suggestion or use the device location.
 */
export function LocationPicker({ center: centerProp = { lat: 24.7136, lng: 46.6753 }, value, suggestions, onSend, onCancel, labels, className, ...props }: LocationPickerProps) {
  const t = useInboxLabels(labels);
  const [center, setCenter] = useState(value ?? centerProp);
  const [point, setPoint] = useState<{ lat: number; lng: number }>(value ?? centerProp);
  const [label, setLabel] = useState(value?.label ?? "");
  const [lat, setLat] = useState(String(point.lat));
  const [lng, setLng] = useState(String(point.lng));
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const pad = useRef<HTMLDivElement>(null);

  const apply = (p: { lat: number; lng: number }, recenter = false) => {
    setPoint(p);
    setLat(String(p.lat));
    setLng(String(p.lng));
    setError("");
    if (recenter) setCenter(p);
  };

  const fromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const box = pad.current?.getBoundingClientRect();
    if (!box) return;
    apply(padToPoint(center, (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (e.shiftKey ? 4 : 1) * PAD_SPAN * 0.05;
    const d = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    apply({ lat: Number((point.lat + (d[0] as number)).toFixed(6)), lng: Number((point.lng + (d[1] as number)).toFixed(6)) });
  };

  const typed = (nextLat: string, nextLng: string) => {
    setLat(nextLat);
    setLng(nextLng);
    const a = Number(nextLat);
    const b = Number(nextLng);
    if (nextLat.trim() && nextLng.trim() && isLat(a) && isLng(b)) {
      setPoint({ lat: a, lng: b });
      setCenter({ lat: a, lng: b });
      setError("");
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return setError(t.locationDenied);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        apply({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }, true);
      },
      () => {
        setLocating(false);
        setError(t.locationDenied);
      },
      { timeout: 8000 },
    );
  };

  const submit = async () => {
    if (!isLat(Number(lat)) || !isLng(Number(lng))) return setError(t.locationInvalid);
    setBusy(true);
    try {
      await onSend({ lat: point.lat, lng: point.lng, label: label.trim() || undefined });
    } finally {
      setBusy(false);
    }
  };

  const at = pointToPad(center, point);
  return (
    <div data-slot="location-picker" className={cn("flex w-80 max-w-full flex-col gap-3", className)} {...props}>
      <p className="text-caption text-muted-foreground">{t.pickLocationHint}</p>
      {/* biome-ignore lint/a11y/useSemanticElements: a 2D pad has no native element */}
      <div
        ref={pad}
        dir="ltr"
        role="application"
        tabIndex={0}
        aria-label={`${t.mapPad} ${formatCoords(point)}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromEvent(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && fromEvent(e)}
        onKeyDown={onKey}
        className={cn(
          "relative h-44 cursor-crosshair touch-none overflow-hidden rounded-control border border-border bg-secondary outline-none",
          "focus-visible:outline-2 focus-visible:outline-nq-focus",
          PAD_GRID,
        )}
      >
        <span aria-hidden className="absolute -translate-x-1/2 -translate-y-full text-nq-danger-text" style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}>
          <MapPin className="size-7 fill-current stroke-background" />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          {t.latitude}
          <Input ltr inputMode="decimal" value={lat} onChange={(e) => typed(e.target.value, lng)} />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          {t.longitude}
          <Input ltr inputMode="decimal" value={lng} onChange={(e) => typed(lat, e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        {t.place}
        <Input value={label} placeholder={t.placeOptional} onChange={(e) => setLabel(e.target.value)} />
      </label>
      {suggestions?.length ? (
        <div role="group" aria-label={t.nearby} className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={`${s.lat},${s.lng}`}
              type="button"
              onClick={() => {
                apply(s, true);
                setLabel(s.label ?? "");
              }}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-border px-2 text-caption text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <MapPin aria-hidden className="size-3" />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" loading={locating} onClick={locate}>
          <LocateFixed aria-hidden />
          {locating ? t.locating : t.useMyLocation}
        </Button>
        <span className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              {t.cancel}
            </Button>
          ) : null}
          <Button type="button" variant="primary" size="sm" loading={busy} onClick={submit}>
            {t.sendLocation}
          </Button>
        </span>
      </div>
    </div>
  );
}

export interface LocationCardProps extends Omit<ComponentProps<"div">, "children"> {
  point: GeoPoint;
  labels?: Partial<InboxLabels>;
}

/** A shared location inside a message: a pad with the pin, the label, the coordinates and a link to open it in maps. */
export function LocationCard({ point, labels, className, ...props }: LocationCardProps) {
  const t = useInboxLabels(labels);
  return (
    <div data-slot="location-card" className={cn("w-60 max-w-full overflow-hidden rounded-control border border-border bg-card", className)} {...props}>
      <div aria-hidden dir="ltr" className={cn("relative grid h-24 place-items-center bg-secondary", PAD_GRID)}>
        <MapPin className="size-7 -translate-y-2 fill-current stroke-background text-nq-danger-text" />
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        <span dir="auto" className="text-label text-foreground">
          {point.label ?? t.locationMessage}
        </span>
        <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">
          {formatCoords(point)}
        </bdi>
        <a
          href={mapsUrl(point)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 self-start text-caption text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current"
        >
          {t.openInMaps}
          <ExternalLink aria-hidden className="size-3" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Link preview
// ---------------------------------------------------------------------------------------------

export interface LinkPreviewCardProps extends Omit<ComponentProps<"a">, "children" | "href"> {
  data: LinkPreviewData;
  labels?: Partial<InboxLabels>;
}

/** A link card for a URL in a message: image, site, title and a two-line description. Opens in a new tab. */
export function LinkPreviewCard({ data, labels, className, ...props }: LinkPreviewCardProps) {
  const t = useInboxLabels(labels);
  return (
    <a
      data-slot="link-preview"
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t.linkOpen}: ${data.title ?? hostOf(data.url)}`}
      className={cn(
        "flex w-64 max-w-full flex-col overflow-hidden rounded-control border border-border bg-card text-start no-underline outline-none",
        "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
        className,
      )}
      {...props}
    >
      {data.image ? <img src={data.image} alt="" loading="lazy" className="aspect-video w-full object-cover" /> : null}
      <span className="flex flex-col gap-0.5 p-2.5">
        <span dir="ltr" className="truncate text-caption text-muted-foreground">
          {data.siteName ?? hostOf(data.url)}
        </span>
        {data.title ? (
          <span dir="auto" className="line-clamp-2 text-label text-foreground">
            {data.title}
          </span>
        ) : null}
        {data.description ? (
          <span dir="auto" className="line-clamp-2 text-caption text-muted-foreground">
            {data.description}
          </span>
        ) : null}
      </span>
    </a>
  );
}
