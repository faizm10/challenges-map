"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ImagePlus,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Trash2,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import type { TeamChallengeStatus, TeamCheckpoint, TeamDashboardResponse } from "@/lib/types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function challengeStateLabel(challenge: TeamChallengeStatus) {
  if (challenge.review_status === "verified") return "Verified";
  if (challenge.review_status === "rejected") return "Rejected";
  return challenge.status === "submitted" ? "Submitted" : "Not started";
}

function challengeStateVariant(challenge: TeamChallengeStatus) {
  if (challenge.review_status === "verified") return "success" as const;
  if (challenge.review_status === "rejected") return "warning" as const;
  return challenge.status === "submitted" ? "secondary" as const : "warning" as const;
}

function checkpointVariant(status: TeamCheckpoint["status"]) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "warning" as const;
  if (status === "pending") return "secondary" as const;
  return "warning" as const;
}

function checkpointLabel(status: TeamCheckpoint["status"]) {
  if (status === "not_started") return "Not started";
  if (status === "pending") return "Pending review";
  if (status === "verified") return "Verified";
  return "Rejected";
}

export function TeamDashboard() {
  const [dashboard, setDashboard] = useState<TeamDashboardResponse | null>(null);
  const [teamName, setTeamName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [removingUploadId, setRemovingUploadId] = useState<number | null>(null);
  const [checkingInKey, setCheckingInKey] = useState<string | null>(null);
  const [isRequestingLocationAccess, setIsRequestingLocationAccess] = useState(false);
  const [locationAccessMessage, setLocationAccessMessage] = useState<string>("");
  const [gpsMessages, setGpsMessages] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadDashboard = async () => {
    const next = await api<TeamDashboardResponse>("/api/team/me");
    setDashboard(next);
  };

  useEffect(() => {
    loadDashboard().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const poll = window.setInterval(() => {
      loadDashboard().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(poll);
  }, [dashboard]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      await api("/api/auth/team", {
        method: "POST",
        body: JSON.stringify({ name: teamName, pin }),
      });
      setTeamName("");
      setPin("");
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to log in.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function onLogout() {
    setIsSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setDashboard(null);
    } finally {
      setIsSigningOut(false);
    }
  }

  async function onSubmitChallenge(challengeId: number, proofNote: string) {
    setSavingId(challengeId);
    try {
      const next = await api<{ dashboard: TeamDashboardResponse }>(
        `/api/team/challenges/${challengeId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ proofNote, status: "submitted" }),
        }
      );
      setDashboard(next.dashboard);
      toast({
        title: "Proof updated",
        description: "HQ can now review your latest submission state.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Could not update challenge",
        description: nextError instanceof Error ? nextError.message : "Request failed.",
        variant: "error",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onUploadFiles(challengeId: number, fileList: FileList | null) {
    if (!fileList?.length) return;

    setUploadingId(challengeId);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/team/challenges/${challengeId}/uploads`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        dashboard?: TeamDashboardResponse;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        await loadDashboard();
      }

      toast({
        title: "Media uploaded",
        description: "Your proof gallery was updated for HQ review.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Upload failed",
        description: nextError instanceof Error ? nextError.message : "Request failed.",
        variant: "error",
      });
    } finally {
      setUploadingId(null);
    }
  }

  async function onDeleteUpload(challengeId: number, uploadId: number) {
    setRemovingUploadId(uploadId);
    try {
      const response = await fetch(`/api/team/challenges/${challengeId}/uploads/${uploadId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        dashboard?: TeamDashboardResponse;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        await loadDashboard();
      }

      toast({
        title: "Media removed",
        description: "That file is no longer attached to the challenge.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Could not remove file",
        description: nextError instanceof Error ? nextError.message : "Request failed.",
        variant: "error",
      });
    } finally {
      setRemovingUploadId(null);
    }
  }

  async function requestLocationAccess() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationAccessMessage("Location is unavailable on this device.");
      return;
    }

    setIsRequestingLocationAccess(true);

    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationAccessMessage(
              "Location access is enabled. You can now tap Check in and send GPS with your submission."
            );
            resolve();
          },
          (geoError) => {
            if (geoError.code === geoError.PERMISSION_DENIED) {
              setLocationAccessMessage(
                "Location is denied in Safari. On iPhone, open aA > Website Settings > Location > Allow, then return here and try again."
              );
            } else if (geoError.code === geoError.TIMEOUT) {
              setLocationAccessMessage(
                "Location request timed out. Make sure Location Services are on, then try again."
              );
            } else {
              setLocationAccessMessage(
                "Location could not be requested. Check iPhone Location Services and Safari site permissions, then try again."
              );
            }
            resolve();
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      });
    } finally {
      setIsRequestingLocationAccess(false);
    }
  }

  async function capturePosition(checkpointKey: string) {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGpsMessages((current) => ({ ...current, [checkpointKey]: "Location unavailable on this device." }));
      return {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        gpsCapturedAt: null,
      };
    }

    return new Promise<{
      latitude: number | null;
      longitude: number | null;
      accuracyMeters: number | null;
      gpsCapturedAt: string | null;
    }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsMessages((current) => ({
            ...current,
            [checkpointKey]: `Location captured within ${Math.round(position.coords.accuracy)}m.`,
          }));
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            gpsCapturedAt: new Date(position.timestamp).toISOString(),
          });
        },
        (geoError) => {
          const message =
            geoError.code === geoError.PERMISSION_DENIED
              ? "Location permission denied. Check-in still sent without GPS."
              : geoError.code === geoError.TIMEOUT
                ? "Location timed out. Check-in still sent without GPS."
                : "Location unavailable. Check-in still sent without GPS.";
          setGpsMessages((current) => ({ ...current, [checkpointKey]: message }));
          resolve({
            latitude: null,
            longitude: null,
            accuracyMeters: null,
            gpsCapturedAt: null,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }
      );
    });
  }

  async function onCheckpointCheckin(checkpoint: TeamCheckpoint, note: string) {
    setCheckingInKey(checkpoint.key);
    try {
      const position = await capturePosition(checkpoint.key);
      const next = await api<{ dashboard: TeamDashboardResponse }>("/api/team/checkins", {
        method: "POST",
        body: JSON.stringify({
          checkinType: checkpoint.checkin_type,
          challengeId: checkpoint.challenge_id,
          checkinNote: note,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMeters: position.accuracyMeters,
          gpsCapturedAt: position.gpsCapturedAt,
        }),
      });
      setDashboard(next.dashboard);
      toast({
        title: `${checkpoint.label} recorded`,
        description: "HQ can now see your latest checkpoint activity.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Check-in failed",
        description: nextError instanceof Error ? nextError.message : "Request failed.",
        variant: "error",
      });
    } finally {
      setCheckingInKey(null);
    }
  }

  if (!dashboard) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 md:py-8">
        <Card className="grid gap-6 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Team Access
            </p>
            <h1 className="max-w-[10ch] font-serif text-4xl leading-none text-white sm:text-6xl">
              Your route. Your challenge queue.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/58">
              Enter your team name and PIN to unlock your Converge dashboard, check-ins,
              media uploads, proof-note submissions, and live standings.
            </p>
            <Button
              asChild
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="secondary"
            >
              <Link href="/">Back to Leaderboard</Link>
            </Button>
          </div>

          <Card className="rounded-[28px] border-white/8 bg-white/[0.04] p-5 text-white">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl text-white">Team Unlock</CardTitle>
              <CardDescription className="text-white/48">
                One team name and PIN unlock one Converge dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-5">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/72">Team name</label>
                  <Input
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                    type="text"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Team 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/72">Enter team PIN</label>
                  <Input
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="TEAM1GO"
                    required
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 text-black hover:bg-orange-400"
                  disabled={isSigningIn}
                  type="submit"
                >
                  {isSigningIn ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Unlock Team Dashboard"
                  )}
                </Button>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
              </form>
            </CardContent>
          </Card>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 md:py-8">
      <Card className="grid gap-5 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/10 bg-white/8 text-white/88" variant="secondary">
                {dashboard.team.badge_label}
              </Badge>
              <Badge className="border-white/10 bg-white/8 text-white/72" variant="secondary">
                {dashboard.team.start_location_name}
              </Badge>
            </div>
            <h1 className="font-serif text-4xl text-white sm:text-5xl">{dashboard.team.team_name}</h1>
            <p className="max-w-3xl text-lg leading-8 text-white/56">{dashboard.team.route_summary}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              variant="secondary"
            >
              <Link href="/">Leaderboard</Link>
            </Button>
            <Button
              className="w-full text-white/72 hover:bg-white/6 hover:text-white sm:w-auto"
              disabled={isSigningOut}
              variant="ghost"
              onClick={onLogout}
            >
              {isSigningOut ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Log Out"
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Walk Time
            </p>
            <p className="text-2xl font-semibold text-white">{dashboard.team.walk_time}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Rank
            </p>
            <p className="text-2xl font-semibold text-white">#{dashboard.teamStats.leaderboard_rank}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Last Known
            </p>
            <p className="text-lg font-semibold text-white">
              {dashboard.latestLocation ? dashboard.latestLocation.label : "No GPS yet"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Total
            </p>
            <p className="text-2xl font-semibold text-white">{dashboard.teamStats.total_points}</p>
          </div>
        </div>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Check-In Progress</CardTitle>
          <CardDescription className="text-white/52">
            Check in at the start, for each released challenge, and when you arrive at Union.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-[22px] border border-orange-400/14 bg-orange-500/[0.07] p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-orange-500/14 p-2 text-orange-200">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Location check-ins work best on your phone</p>
                <p className="mt-1 text-sm leading-6 text-white/62">
                  Tap Enable Location first and allow Safari access when your phone asks. Your GPS
                  status will appear right inside each checkpoint card.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-11 w-full bg-white/8 text-white hover:bg-white/12 sm:w-auto"
                disabled={isRequestingLocationAccess}
                type="button"
                variant="secondary"
                onClick={() => void requestLocationAccess()}
              >
                {isRequestingLocationAccess ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Requesting location...
                  </>
                ) : (
                  <>
                    <LocateFixed className="h-4 w-4" />
                    Enable Location
                  </>
                )}
              </Button>
              <p className="text-sm leading-6 text-white/62">
                {locationAccessMessage ||
                  "If Safari shows a permission prompt, choose Allow. If it was denied earlier, use Safari website settings to turn it back on."}
              </p>
            </div>
          </div>

          {dashboard.checkpoints.map((checkpoint) => (
            <Card
              key={checkpoint.key}
              className="rounded-[24px] border border-white/8 bg-white/[0.05] p-5 text-white"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{checkpoint.label}</p>
                  <p className="mt-1 text-sm leading-7 text-white/56">{checkpoint.description}</p>
                  <p className="mt-2 text-sm text-white/76">
                    <span className="text-white/46">Expected location:</span>{" "}
                    {checkpoint.expected_location_label}
                  </p>
                  {checkpoint.expected_location_description ? (
                    <p className="text-xs text-white/42">
                      {checkpoint.expected_location_description}
                    </p>
                  ) : null}
                </div>
                <Badge variant={checkpointVariant(checkpoint.status)}>
                  {checkpointLabel(checkpoint.status)}
                </Badge>
              </div>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  void onCheckpointCheckin(checkpoint, String(formData.get("checkinNote") ?? ""));
                }}
              >
                <Textarea
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                  defaultValue={checkpoint.latest_checkin?.checkin_note ?? ""}
                  name="checkinNote"
                  placeholder="Optional note for HQ about where you are or what just happened."
                />
                <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="mb-2 flex items-start gap-3">
                    <div className="rounded-2xl bg-white/[0.06] p-2 text-orange-200">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">GPS check-in status</p>
                      <p className="mt-1 text-sm leading-6 text-white/60">
                        {gpsMessages[checkpoint.key] ??
                          (checkpoint.latest_checkin?.gps_captured_at
                            ? "Location was captured on your latest check-in."
                            : "Location will be requested as soon as you tap the button below.")}
                      </p>
                    </div>
                  </div>
                  {!checkpoint.latest_checkin?.gps_captured_at ? (
                    <p className="text-xs text-white/44">
                      If location access is blocked, the check-in still goes through and HQ can
                      review it manually.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    className="h-12 w-full bg-orange-500 text-base text-black hover:bg-orange-400"
                    disabled={checkingInKey === checkpoint.key}
                    type="submit"
                  >
                    {checkingInKey === checkpoint.key ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Checking in...
                      </>
                    ) : (
                      `Check in now`
                    )}
                  </Button>
                </div>
              </form>

              {checkpoint.latest_checkin ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/42">
                  <span>{new Date(checkpoint.latest_checkin.created_at).toLocaleString()}</span>
                  {checkpoint.latest_checkin.latitude !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {checkpoint.latest_checkin.latitude.toFixed(5)},{" "}
                      {checkpoint.latest_checkin.longitude?.toFixed(5)}
                    </span>
                  ) : (
                    <span>No GPS captured</span>
                  )}
                  {checkpoint.latest_checkin.accuracy_meters !== null ? (
                    <span>Accuracy {Math.round(checkpoint.latest_checkin.accuracy_meters)}m</span>
                  ) : null}
                  {checkpoint.latest_checkin.review_note ? (
                    <span>HQ note: {checkpoint.latest_checkin.review_note}</span>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Released Challenges</CardTitle>
          <CardDescription className="text-white/52">
            Upload photos or videos for HQ review, then add an optional proof note.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {dashboard.challenges.length ? (
            dashboard.challenges.map((challenge) => {
              const isLocked = challenge.review_status === "verified";
              const latestUploadAt = challenge.uploads[0]?.uploaded_at;

              return (
                <Card
                  key={challenge.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.05] p-5 text-white"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                        Challenge {challenge.challenge_order}
                      </p>
                      <h3 className="text-xl font-semibold text-white">{challenge.title}</h3>
                    </div>
                    <Badge variant={challengeStateVariant(challenge)}>
                      {challengeStateLabel(challenge)}
                    </Badge>
                  </div>

                  <p className="mb-4 text-sm leading-7 text-white/58">{challenge.text}</p>

                  <div className="mb-4 rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Proof media</p>
                        <p className="text-xs text-white/46">
                          {challenge.uploads.length} file{challenge.uploads.length === 1 ? "" : "s"}
                          {latestUploadAt
                            ? ` · latest ${new Date(latestUploadAt).toLocaleString()}`
                            : " · nothing uploaded yet"}
                        </p>
                      </div>
                      <label className="inline-flex">
                        <input
                          accept="image/*,video/*"
                          className="hidden"
                          disabled={isLocked || uploadingId === challenge.id}
                          multiple
                          type="file"
                          onChange={(event) => {
                            void onUploadFiles(challenge.id, event.currentTarget.files);
                            event.currentTarget.value = "";
                          }}
                        />
                        <span
                          className={`inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white transition ${
                            isLocked || uploadingId === challenge.id
                              ? "cursor-not-allowed bg-white/[0.03] text-white/40"
                              : "cursor-pointer bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <ImagePlus className="h-4 w-4" />
                          {uploadingId === challenge.id ? "Uploading media..." : "Add media"}
                        </span>
                      </label>
                    </div>

                    {isLocked ? (
                      <p className="mt-3 text-xs text-emerald-300/80">
                        HQ verified this challenge. Uploads are locked.
                      </p>
                    ) : null}
                    {challenge.review_status === "rejected" && challenge.review_note ? (
                      <p className="mt-3 text-xs text-amber-200/80">
                        HQ note: {challenge.review_note}
                      </p>
                    ) : null}

                    {challenge.uploads.length ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {challenge.uploads.map((upload) => (
                          <div
                            key={upload.id}
                            className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20"
                          >
                            <div className="aspect-[4/3] bg-black/30">
                              {upload.media_type === "image" ? (
                                <img
                                  alt={upload.file_name}
                                  className="h-full w-full object-cover"
                                  src={upload.public_url}
                                />
                              ) : (
                                <video
                                  className="h-full w-full object-cover"
                                  controls
                                  preload="metadata"
                                  src={upload.public_url}
                                />
                              )}
                            </div>
                            <div className="space-y-2 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">{upload.file_name}</p>
                                  <p className="text-xs text-white/44">
                                    {upload.media_type === "video" ? "Video" : "Image"} ·{" "}
                                    {Math.max(1, Math.round(upload.file_size_bytes / 1024 / 1024))}MB
                                  </p>
                                </div>
                                {upload.media_type === "video" ? (
                                  <Video className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                                ) : null}
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <a
                                  className="text-xs text-orange-300 hover:text-orange-200"
                                  href={upload.public_url}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Open
                                </a>
                                {!isLocked ? (
                                  <button
                                    className="inline-flex items-center gap-1 text-xs text-white/52 transition hover:text-red-300"
                                    disabled={removingUploadId === upload.id}
                                    type="button"
                                    onClick={() => void onDeleteUpload(challenge.id, upload.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {removingUploadId === upload.id ? "Removing file..." : "Remove"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      void onSubmitChallenge(challenge.id, String(formData.get("proofNote") ?? ""));
                    }}
                  >
                    <Textarea
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                      defaultValue={challenge.proof_note}
                      disabled={isLocked}
                      name="proofNote"
                      placeholder="Add optional context for HQ: what was captured, who appeared, and anything they should notice."
                    />
                    <Button
                      className="bg-orange-500 text-black hover:bg-orange-400"
                      disabled={savingId === challenge.id || isLocked}
                      type="submit"
                    >
                      {savingId === challenge.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Saving proof...
                        </>
                      ) : (
                        "Submit / Update"
                      )}
                    </Button>
                    <p className="text-xs text-white/42">
                      {challenge.submitted_at
                        ? `Last submitted ${new Date(challenge.submitted_at).toLocaleString()}`
                        : "No proof submitted yet."}
                    </p>
                  </form>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-white/46">
              No live drops yet. HQ has not released any challenges.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Live Leaderboard</CardTitle>
          <CardDescription className="text-white/52">
            Public standings refresh every few seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Creativity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.leaderboard.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.team_name}</TableCell>
                  <TableCell>#{entry.leaderboard_rank}</TableCell>
                  <TableCell>{entry.total_points}</TableCell>
                  <TableCell>{entry.completed_count}/{entry.total_challenges}</TableCell>
                  <TableCell>{entry.speed_points}</TableCell>
                  <TableCell>{entry.creativity_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
