"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronDown,
  Copy,
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
import { TeamRouteMap } from "@/components/team-route-map";
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
import { DASHBOARD_POLL_MS, subscribeWhileVisible } from "@/lib/client-poll";
import { MAX_CHALLENGES } from "@/lib/config";
import type { TeamChallengeStatus, TeamCheckpoint, TeamDashboardResponse } from "@/lib/types";

type LocationPermissionState =
  | "unsupported"
  | "idle"
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "error";

type LocationPlatform =
  | "ios-safari"
  | "ios-chrome"
  | "android-chrome"
  | "desktop"
  | "generic";

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  gpsCapturedAt: string;
};

type ManualCheckpointInput = {
  latitude: string;
  longitude: string;
};

function formatCoordinate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toString();
}

function parseCoordinateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function haversineMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLatitude = toRadians(latitudeB - latitudeA);
  const dLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  return challenge.status === "submitted" ? "Challenge submitted" : "Not started";
}

function challengeStateVariant(challenge: TeamChallengeStatus) {
  if (challenge.review_status === "verified") return "success" as const;
  if (challenge.review_status === "rejected") return "warning" as const;
  return challenge.status === "submitted" ? "secondary" as const : "warning" as const;
}

function challengeKindCopy(challenge: TeamChallengeStatus) {
  if (challenge.kind === "game_long") {
    return {
      title: "Game-long challenge",
      description: "Available after the start check-in and open for the full race.",
    };
  }

  if (challenge.kind === "union") {
    return {
      title: "Union checkpoint unlocked",
      description: "You reached Union. Submit this challenge here, then the final finish check-in unlocks.",
    };
  }

  return {
    title: "Checkpoint unlocked",
    description: "You reached the assigned checkpoint. Submit this challenge here to reveal the next checkpoint.",
  };
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

function getDefaultOpenCheckpointKey(checkpoints: TeamCheckpoint[]) {
  const submittedCandidate = checkpoints.find(
    (checkpoint) => checkpoint.status !== "verified" && checkpoint.latest_checkin
  );
  if (submittedCandidate) return submittedCandidate.key;

  const unresolvedCandidate = checkpoints.find(
    (checkpoint) => checkpoint.status !== "verified"
  );
  return unresolvedCandidate?.key ?? null;
}

function getNextOpenCheckpointKey(checkpoints: TeamCheckpoint[], currentKey: string) {
  const currentIndex = checkpoints.findIndex((checkpoint) => checkpoint.key === currentKey);
  if (currentIndex === -1) return getDefaultOpenCheckpointKey(checkpoints);

  for (let index = currentIndex + 1; index < checkpoints.length; index += 1) {
    if (checkpoints[index].status !== "verified") {
      return checkpoints[index].key;
    }
  }

  for (let index = 0; index < checkpoints.length; index += 1) {
    if (checkpoints[index].status !== "verified") {
      return checkpoints[index].key;
    }
  }

  return null;
}

function detectLocationPlatform(): LocationPlatform {
  if (typeof navigator === "undefined") return "generic";

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /CriOS|Chrome/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|Chrome|FxiOS|EdgiOS/i.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS && isChrome) return "ios-chrome";
  if (isAndroid && isChrome) return "android-chrome";
  if (!isIOS && !isAndroid) return "desktop";
  return "generic";
}

function getPlatformPermissionCopy(platform: LocationPlatform, status: LocationPermissionState) {
  if (status === "unsupported") {
    return {
      badge: "Unavailable",
      title: "Location is not available on this device",
      message: "Check-ins still work without GPS, but HQ will need to review them manually.",
      actionLabel: "Location Unavailable",
      actionMode: "disabled" as const,
      help:
        "This browser or device does not expose geolocation to the app. You can still submit check-ins without GPS.",
    };
  }

  if (status === "granted") {
    return {
      badge: "Enabled",
      title: "Location is enabled",
      message: "GPS can be sent with your check-ins whenever your device can capture it.",
      actionLabel: "Location Enabled",
      actionMode: "granted" as const,
      help:
        "You can go straight into check-ins. If GPS is weak indoors, the check-in still goes through.",
    };
  }

  if (status === "denied") {
    const helpByPlatform: Record<LocationPlatform, string> = {
      "ios-safari":
        "On iPhone Safari, tap aA > Website Settings > Location > Allow, then return here.",
      "ios-chrome":
        "On iPhone Chrome, location still depends on iPhone browser/site permissions. Re-enable location for the browser in iOS settings, then reopen this page.",
      "android-chrome":
        "In Chrome on Android, open site settings for this page and allow Location, then try again.",
      desktop:
        "Use your browser site permissions to allow Location for this page, then refresh or try again.",
      generic:
        "Re-enable location for this site in your browser settings, then return here.",
    };

    return {
      badge: "Denied",
      title: "Location is currently blocked",
      message: "Check-ins still work without GPS, but HQ will only see a manual submission.",
      actionLabel: "Open Location Help",
      actionMode: "help" as const,
      help: helpByPlatform[platform],
    };
  }

  if (status === "requesting") {
    return {
      badge: "Requesting",
      title: "Waiting for location permission",
      message: "Watch your browser prompt and choose Allow if you want GPS attached to check-ins.",
      actionLabel: "Requesting location...",
      actionMode: "requesting" as const,
      help: "If no prompt appears, check whether location was already blocked in your browser settings.",
    };
  }

  if (status === "error") {
    return {
      badge: "Check settings",
      title: "Location could not be requested",
      message: "Check-ins still work without GPS if your device refuses the request.",
      actionLabel: "Enable Location",
      actionMode: "request" as const,
      help:
        platform === "ios-safari"
          ? "Make sure Safari and iPhone Location Services are enabled, then try again."
          : "Check your device location settings and browser site permissions, then try again.",
    };
  }

  return {
    badge: status === "prompt" ? "Ready" : "Waiting",
    title: "Enable location before check-ins",
    message: "Allow location once and the app will attach GPS whenever your phone can provide it.",
    actionLabel: "Enable Location",
    actionMode: "request" as const,
    help:
      platform === "ios-safari"
        ? "Safari will show a permission prompt. Choose Allow when it appears."
        : platform === "ios-chrome"
          ? "Chrome on iPhone still uses iPhone/browser location permissions. Allow the prompt if it appears."
          : platform === "android-chrome"
            ? "Chrome should show a location prompt for this site. Tap Allow to send GPS with check-ins."
            : "Your browser should show a location prompt for this page. Allow it to attach GPS to check-ins.",
  };
}

export function TeamDashboard({ gameSlug }: { gameSlug: string }) {
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
  const [locationPermissionState, setLocationPermissionState] =
    useState<LocationPermissionState>("idle");
  const [locationPlatform, setLocationPlatform] = useState<LocationPlatform>("generic");
  const [isSecureLocationContext, setIsSecureLocationContext] = useState(true);
  const [lastResolvedPosition, setLastResolvedPosition] = useState<CapturedLocation | null>(null);
  const [gpsMessages, setGpsMessages] = useState<Record<string, string>>({});
  const [manualCheckpointInputs, setManualCheckpointInputs] = useState<
    Record<string, ManualCheckpointInput>
  >({});
  const [openCheckpointKey, setOpenCheckpointKey] = useState<string | null>(null);
  const [newChallengeBanner, setNewChallengeBanner] = useState<TeamChallengeStatus | null>(null);
  const [pendingContractCheckpoint, setPendingContractCheckpoint] = useState<TeamCheckpoint | null>(null);
  const seenChallengeIdsRef = useRef<number[] | null>(null);
  const { toast } = useToast();

  const loadDashboard = async () => {
    const next = await api<TeamDashboardResponse>("/api/team/me");
    setDashboard(next);
  };

  useEffect(() => {
    loadDashboard().catch(() => undefined);
  }, []);

  useEffect(() => {
    setLocationPlatform(detectLocationPlatform());
    setIsSecureLocationContext(
      typeof window === "undefined" ? true : Boolean(window.isSecureContext)
    );
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    return subscribeWhileVisible(() => {
      loadDashboard().catch(() => undefined);
    }, DASHBOARD_POLL_MS);
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) return;
    const hasStarted = dashboard.checkpoints.some(
      (checkpoint) => checkpoint.checkin_type === "start" && Boolean(checkpoint.latest_checkin)
    );
    const orderedChallenges = dashboard.challenges
      .slice()
      .sort((a, b) => a.challenge_order - b.challenge_order);
    const submittedChallengeIds = new Set(
      orderedChallenges
        .filter((challenge) => challenge.status === "submitted")
        .map((challenge) => challenge.id)
    );
    const challengeCheckinIds = new Set(
      dashboard.checkpoints
        .filter(
          (checkpoint) =>
            checkpoint.checkin_type === "challenge" &&
            checkpoint.challenge_id !== null &&
            Boolean(checkpoint.latest_checkin)
        )
        .map((checkpoint) => Number(checkpoint.challenge_id))
    );
    const visibleChallengeRows = orderedChallenges.filter((challenge) => {
      if (challenge.kind === "game_long") return hasStarted;

      const previousChallenge = orderedChallenges.find(
        (item) => item.challenge_order === challenge.challenge_order - 1
      );
      const isPreviousComplete = previousChallenge
        ? previousChallenge.kind === "game_long"
          ? hasStarted
          : submittedChallengeIds.has(previousChallenge.id)
        : hasStarted;

      return isPreviousComplete && challengeCheckinIds.has(challenge.id);
    });

    const currentIds = visibleChallengeRows.map((challenge) => challenge.id);
    const previousIds = seenChallengeIdsRef.current;

    if (previousIds) {
      const newChallenge = visibleChallengeRows.find(
        (challenge) => !previousIds.includes(challenge.id)
      );
      if (newChallenge) {
        setNewChallengeBanner(newChallenge);
      }
    }

    seenChallengeIdsRef.current = currentIds;
  }, [dashboard]);

  useEffect(() => {
    if (!newChallengeBanner) return;
    const timeout = window.setTimeout(() => {
      setNewChallengeBanner(null);
    }, 9000);
    return () => window.clearTimeout(timeout);
  }, [newChallengeBanner]);

  async function copyAddress(address: string) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Location copied to your clipboard.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access is unavailable on this device.",
        variant: "error",
      });
    }
  }

  async function refreshLocationPermissionState() {
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost"
    ) {
      setIsSecureLocationContext(false);
      setLocationPermissionState("unsupported");
      return "unsupported" as const;
    }

    setIsSecureLocationContext(true);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationPermissionState("unsupported");
      return "unsupported" as const;
    }

    if (typeof window === "undefined" || !("permissions" in navigator)) {
      setLocationPermissionState("prompt");
      return "prompt" as const;
    }

    try {
      const permissions = navigator.permissions as Permissions;
      const result = await permissions.query({ name: "geolocation" as PermissionName });
      const nextState =
        result.state === "granted"
          ? "granted"
          : result.state === "denied"
            ? "denied"
            : "prompt";

      setLocationPermissionState(nextState);
      return nextState;
    } catch {
      setLocationPermissionState("prompt");
      return "prompt" as const;
    }
  }

  useEffect(() => {
    void refreshLocationPermissionState();
  }, []);

  const startCheckpoint =
    dashboard?.checkpoints.find((checkpoint) => checkpoint.checkin_type === "start") ?? null;
  const hasStartedRace = Boolean(startCheckpoint?.latest_checkin);
  const isFinishUnlocked = (dashboard?.teamStats.completed_count ?? 0) >= MAX_CHALLENGES;
  const orderedChallenges =
    dashboard?.challenges.slice().sort((a, b) => a.challenge_order - b.challenge_order) ?? [];
  const submittedChallengeIds = new Set(
    orderedChallenges.filter((challenge) => challenge.status === "submitted").map((challenge) => challenge.id)
  );
  const challengeCheckinIds = new Set(
    (dashboard?.checkpoints ?? [])
      .filter(
        (checkpoint) =>
          checkpoint.checkin_type === "challenge" &&
          checkpoint.challenge_id !== null &&
          Boolean(checkpoint.latest_checkin)
      )
      .map((checkpoint) => Number(checkpoint.challenge_id))
  );
  const visibleChallenges = orderedChallenges.filter((challenge) => {
    if (challenge.kind === "game_long") return hasStartedRace;

    const previousChallenge = orderedChallenges.find(
      (item) => item.challenge_order === challenge.challenge_order - 1
    );
    const isPreviousComplete = previousChallenge
      ? previousChallenge.kind === "game_long"
        ? hasStartedRace
        : submittedChallengeIds.has(previousChallenge.id)
      : hasStartedRace;

    return isPreviousComplete && challengeCheckinIds.has(challenge.id);
  });
  const visibleCheckpoints = dashboard
    ? dashboard.checkpoints.filter((checkpoint) => {
        if (checkpoint.checkin_type === "start") return true;
        if (!hasStartedRace) return false;
        if (checkpoint.checkin_type === "finish") return isFinishUnlocked;
        if (checkpoint.challenge_id === null) return false;

        const challenge = orderedChallenges.find((item) => item.id === checkpoint.challenge_id);
        if (!challenge) return false;

        const previousChallenge = orderedChallenges.find(
          (item) => item.challenge_order === challenge.challenge_order - 1
        );
        const isPreviousComplete = previousChallenge
          ? previousChallenge.kind === "game_long"
            ? hasStartedRace
            : submittedChallengeIds.has(previousChallenge.id)
          : hasStartedRace;

        return isPreviousComplete;
      })
    : [];
  const nextVisibleChallenge = visibleChallenges[0] ?? null;
  const shouldShowScrollCue =
    nextVisibleChallenge?.kind === "checkpoint" &&
    (nextVisibleChallenge.challenge_order === 2 || nextVisibleChallenge.challenge_order === 3);
  const visibleCheckpointSignature = useMemo(
    () =>
      visibleCheckpoints
        .map((checkpoint) =>
          [
            checkpoint.key,
            checkpoint.status,
            checkpoint.latest_checkin?.created_at ?? "",
            checkpoint.latest_checkin?.reviewed_at ?? "",
          ].join(":")
        )
        .join("|"),
    [visibleCheckpoints]
  );
  const locationPermissionCopy = getPlatformPermissionCopy(
    locationPlatform,
    locationPermissionState
  );
  const hasRecordedGpsFix = Boolean(
    lastResolvedPosition ||
      (dashboard?.latestLocation?.latitude !== undefined &&
        dashboard?.latestLocation?.longitude !== undefined &&
        dashboard?.latestLocation?.gps_captured_at)
  );
  const locationHeaderTitle = hasRecordedGpsFix
    ? "Location is enabled"
    : locationPermissionState === "granted"
      ? "Location access is ready"
      : locationPermissionCopy.title;
  const locationHeaderBadge = hasRecordedGpsFix
    ? "Enabled"
    : locationPermissionState === "granted"
      ? "Ready"
      : locationPermissionCopy.badge;
  const locationHeaderMessage = hasRecordedGpsFix
    ? "GPS can be sent with your check-ins whenever your device can capture it."
    : locationPermissionState === "granted"
      ? "Location permission is on. Capture a GPS fix during check-in."
      : locationPermissionCopy.message;
  const locationHelpText =
    !isSecureLocationContext
      ? "GPS only works over HTTPS or localhost. If you opened this on a phone using a local network URL like http://192.168.x.x:3000, the check-in will still submit but coordinates will not be attached."
      : locationPermissionCopy.help;

  useEffect(() => {
    if (!visibleCheckpoints.length) {
      setOpenCheckpointKey(null);
      return;
    }

    setOpenCheckpointKey((current) => {
      const stillValid =
        current &&
        visibleCheckpoints.some(
          (checkpoint) => checkpoint.key === current && checkpoint.status !== "verified"
        );

      return stillValid ? current : getDefaultOpenCheckpointKey(visibleCheckpoints);
    });
  }, [visibleCheckpointSignature]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      await api("/api/auth/team", {
        method: "POST",
        body: JSON.stringify({ gameSlug, name: teamName, pin }),
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
          body: JSON.stringify({
            proofNote,
            status: "submitted",
          }),
        }
      );
      setDashboard(next.dashboard);
      toast({
        title: "Challenge submitted",
        description: "Your proof is pending for HQ review.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Could not submit challenge",
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
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost"
    ) {
      setIsSecureLocationContext(false);
      setLocationPermissionState("unsupported");
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationPermissionState("unsupported");
      return;
    }

    setLocationPermissionState("requesting");

    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationPermissionState("granted");
            setLastResolvedPosition({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              gpsCapturedAt: new Date(position.timestamp).toISOString(),
            });
            resolve();
          },
          (geoError) => {
            if (geoError.code === geoError.PERMISSION_DENIED) {
              setLocationPermissionState("denied");
            } else if (geoError.code === geoError.TIMEOUT) {
              setLocationPermissionState("error");
            } else {
              setLocationPermissionState("error");
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
      await refreshLocationPermissionState();
    }
  }

  async function requestBrowserPosition(options: PositionOptions) {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      throw new Error("geolocation-unavailable");
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function capturePosition(checkpointKey: string) {
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost"
    ) {
      setIsSecureLocationContext(false);
      setLocationPermissionState("unsupported");
      setGpsMessages((current) => ({
        ...current,
        [checkpointKey]: "GPS needs HTTPS or localhost. Check-in sent without GPS.",
      }));
      return {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        gpsCapturedAt: null,
      };
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationPermissionState("unsupported");
      setGpsMessages((current) => ({
        ...current,
        [checkpointKey]: "Location unavailable on this device.",
      }));
      return {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        gpsCapturedAt: null,
      };
    }

    try {
      const position = await requestBrowserPosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
      const captured = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        gpsCapturedAt: new Date(position.timestamp).toISOString(),
      };
      setLocationPermissionState("granted");
      setLastResolvedPosition(captured);
      setGpsMessages((current) => ({
        ...current,
        [checkpointKey]: `GPS captured within ${Math.round(position.coords.accuracy)}m.`,
      }));
      return captured;
    } catch (error) {
      const geoError = error as GeolocationPositionError | undefined;
      if (geoError?.code === 1) {
        setLocationPermissionState("denied");
        setGpsMessages((current) => ({
          ...current,
          [checkpointKey]: "Permission denied, check-in sent without GPS.",
        }));
        return {
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          gpsCapturedAt: null,
        };
      }
    }

    try {
      const fallbackPosition = await requestBrowserPosition({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 120000,
      });
      const captured = {
        latitude: fallbackPosition.coords.latitude,
        longitude: fallbackPosition.coords.longitude,
        accuracyMeters: fallbackPosition.coords.accuracy,
        gpsCapturedAt: new Date(fallbackPosition.timestamp).toISOString(),
      };
      setLocationPermissionState("granted");
      setLastResolvedPosition(captured);
      setGpsMessages((current) => ({
        ...current,
        [checkpointKey]: `GPS captured on fallback within ${Math.round(
          fallbackPosition.coords.accuracy
        )}m.`,
      }));
      return captured;
    } catch (error) {
      const geoError = error as GeolocationPositionError | undefined;

      if (lastResolvedPosition) {
        setGpsMessages((current) => ({
          ...current,
          [checkpointKey]: "Fresh GPS timed out. Reusing your last captured location for this check-in.",
        }));
        return lastResolvedPosition;
      }

      const message =
        geoError?.code === 3
          ? "Location timed out, check-in sent without GPS."
          : "Location unavailable on this device.";

      setLocationPermissionState(geoError?.code === 1 ? "denied" : "error");
      setGpsMessages((current) => ({ ...current, [checkpointKey]: message }));
      return {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        gpsCapturedAt: null,
      };
    }
  }

  async function onCheckpointCheckin(checkpoint: TeamCheckpoint) {
    setCheckingInKey(checkpoint.key);
    try {
      const manualInput = manualCheckpointInputs[checkpoint.key];
      const hasManualOverride =
        checkpoint.checkin_type === "challenge" &&
        Boolean(manualInput?.latitude.trim() || manualInput?.longitude.trim());

      let position: {
        latitude: number | null;
        longitude: number | null;
        accuracyMeters: number | null;
        gpsCapturedAt: string | null;
      };

      if (hasManualOverride) {
        const latitude = parseCoordinateInput(manualInput?.latitude ?? "");
        const longitude = parseCoordinateInput(manualInput?.longitude ?? "");

        if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error("Enter valid test latitude and longitude.");
        }

        position = {
          latitude,
          longitude,
          accuracyMeters: 1,
          gpsCapturedAt: new Date().toISOString(),
        };
        setGpsMessages((current) => ({
          ...current,
          [checkpoint.key]: "Using manual test coordinates for this checkpoint.",
        }));
      } else {
        position = await capturePosition(checkpoint.key);
      }

      const next = await api<{ dashboard: TeamDashboardResponse }>("/api/team/checkins", {
        method: "POST",
        body: JSON.stringify({
          checkinType: checkpoint.checkin_type,
          challengeId: checkpoint.challenge_id,
          checkinNote: "",
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMeters: position.accuracyMeters,
          gpsCapturedAt: position.gpsCapturedAt,
        }),
      });
      setDashboard(next.dashboard);
      const nextVisibleCheckpoints = next.dashboard.checkpoints.filter((item) => {
        if (item.checkin_type === "start") return true;
        const nextStartCheckpoint =
          next.dashboard.checkpoints.find((candidate) => candidate.checkin_type === "start") ?? null;
        return Boolean(nextStartCheckpoint?.latest_checkin);
      });
      setOpenCheckpointKey((current) =>
        current === checkpoint.key
          ? getNextOpenCheckpointKey(nextVisibleCheckpoints, checkpoint.key)
          : current
      );
      if (hasManualOverride) {
        setManualCheckpointInputs((current) => ({
          ...current,
          [checkpoint.key]: { latitude: "", longitude: "" },
        }));
      }
      toast({
        title:
          checkpoint.checkin_type === "challenge"
            ? `${checkpoint.label} unlocked`
            : `${checkpoint.label} recorded`,
        description:
          checkpoint.checkin_type === "challenge"
            ? "That challenge is now open in your queue."
            : "HQ can now see your latest checkpoint activity.",
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Check-in failed",
        description: nextError instanceof Error ? nextError.message : "Request failed.",
        variant: "error",
      });
    } finally {
      await refreshLocationPermissionState();
      setCheckingInKey(null);
    }
  }

  async function onStartContractAccept() {
    if (!pendingContractCheckpoint) return;
    toast({
      title: "Welcome to the challenge of death",
      description: "Ahha just joking. Best of luck!",
      variant: "success",
      durationMs: 10000,
    });
    const nextCheckpoint = pendingContractCheckpoint;
    setPendingContractCheckpoint(null);
    await onCheckpointCheckin(nextCheckpoint);
  }

  if (!dashboard) {
    return (
      <main
        className="relative flex min-h-screen w-full flex-col items-center justify-center"
        style={{
          backgroundImage: "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_208a8505-04d8-407f-a202-6ea78d2f3571_3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
        }}
      >
        <style>{`
          @keyframes signin-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes signin-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .signin-card { animation: signin-fadein 0.5s ease forwards; }
        `}</style>

        {/* Layered overlay: dark top, lighter mid so city shows through, dark bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/90 via-[#090809]/55 to-[#090809]/95" />

        <div className="relative z-10 flex w-full flex-col items-center px-4 py-12">
          {/* Brand */}
          <div className="signin-card mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Converge</p>
            <h1 className="mt-3 text-5xl leading-none text-[#e6d5b8] sm:text-6xl">Sign In</h1>
            <p className="mt-3 text-sm text-[#e6d5b8]/50">
              Your route. Your challenge queue.
            </p>
          </div>

          {/* Form card */}
          <div
            className="signin-card w-full max-w-[360px] border-2 border-[#e6d5b8]/15 bg-[#090809]/88 p-7"
            style={{ backdropFilter: "blur(12px)", animationDelay: "0.1s", opacity: 0 }}
          >
            <form className="space-y-5" onSubmit={onLogin}>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/50">
                  Team Name
                </label>
                <Input
                  className="border border-[#e6d5b8]/15 bg-[#e6d5b8]/5 text-[#e6d5b8] placeholder:text-[#e6d5b8]/20 focus:border-orange-500 focus:ring-0"
                  type="text"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Enter your team name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/50">
                  PIN
                </label>
                <Input
                  className="border border-[#e6d5b8]/15 bg-[#e6d5b8]/5 tracking-widest text-[#e6d5b8] placeholder:text-[#e6d5b8]/20 focus:border-orange-500 focus:ring-0"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>

              {error ? (
                <p className="text-xs text-red-400">{error}</p>
              ) : null}

              <Button
                className="w-full border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 hover:border-orange-400 disabled:opacity-50"
                disabled={isSigningIn}
                type="submit"
              >
                {isSigningIn ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-5 border-t border-[#e6d5b8]/10 pt-5">
              <Button
                asChild
                className="w-full border border-[#e6d5b8]/12 bg-transparent text-[#e6d5b8]/45 hover:bg-[#e6d5b8]/5 hover:text-[#e6d5b8]"
                variant="secondary"
              >
                <Link href="/leaderboard">← Back to Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_415a8841-0d4c-4e47-b833-4cfe0a3dc69a_3.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <style>{`
        @keyframes db-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes db-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .db-section { animation: db-fadein 0.45s ease forwards; }
        .db-live-dot { animation: db-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Fixed dark overlay — city shows as ghost */}
      <div className="pointer-events-none fixed inset-0 bg-[#090809]/91" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6 md:pt-8">

        {/* ── NEW CHALLENGE BANNER ─────────────────── */}
        {newChallengeBanner ? (
          <div className="mb-6 flex items-start justify-between gap-4 border-l-2 border-orange-500 bg-orange-500/8 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-orange-500">Challenge Drop</p>
              <p className="mt-1 text-base text-[#e6d5b8]">{newChallengeBanner.title}</p>
              <p className="mt-0.5 text-xs text-[#e6d5b8]/50">Scroll to challenge queue to view and submit.</p>
            </div>
            <button
              className="mt-0.5 text-xs text-[#e6d5b8]/35 transition hover:text-[#e6d5b8]"
              type="button"
              onClick={() => setNewChallengeBanner(null)}
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* ── HEADER ──────────────────────────────── */}
        <section className="db-section border border-[#e6d5b8]/10 bg-[#090809]/70">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between md:p-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Converge // Field Ops</p>
              <div className="flex flex-wrap gap-2">
                <span className="border border-[#e6d5b8]/15 px-2.5 py-1 text-xs uppercase tracking-wider text-[#e6d5b8]/55">
                  {dashboard.team.badge_label}
                </span>
                <span className="border border-[#e6d5b8]/15 px-2.5 py-1 text-xs uppercase tracking-wider text-[#e6d5b8]/55">
                  {dashboard.team.start_location_name}
                </span>
              </div>
              <h1 className="text-4xl text-[#e6d5b8] sm:text-5xl">{dashboard.team.team_name}</h1>
              <p className="max-w-2xl text-sm leading-7 text-[#e6d5b8]/50">{dashboard.team.route_summary}</p>
              {shouldShowScrollCue ? (
                <div className="border-l-2 border-orange-500 bg-orange-500/8 pl-4 py-2">
                  <p className="text-sm text-[#e6d5b8]">Next challenge is ready</p>
                  <p className="mt-0.5 text-xs text-[#e6d5b8]/50">Scroll to the challenge queue to view and submit.</p>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                asChild
                className="border border-[#e6d5b8]/15 bg-transparent text-[#e6d5b8]/55 hover:bg-[#e6d5b8]/5 hover:text-[#e6d5b8]"
                variant="secondary"
              >
                <Link href={`/e/${gameSlug}/leaderboard`}>Leaderboard</Link>
              </Button>
              <Button
                className="border border-[#e6d5b8]/10 bg-transparent text-[#e6d5b8]/35 hover:bg-[#e6d5b8]/5 hover:text-[#e6d5b8]"
                disabled={isSigningOut}
                variant="ghost"
                onClick={onLogout}
              >
                {isSigningOut ? <><LoaderCircle className="h-4 w-4 animate-spin" />Signing out...</> : "Log Out"}
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 border-t border-[#e6d5b8]/10 xl:grid-cols-4">
            <div className="border-r border-[#e6d5b8]/10 p-5 md:p-6">
              <p className="mb-2 text-xs uppercase tracking-widest text-orange-500">Walk Time</p>
              <p className="text-3xl text-[#e6d5b8]">{dashboard.team.walk_time}</p>
            </div>
            <div className="p-5 md:p-6 xl:border-r xl:border-[#e6d5b8]/10">
              <p className="mb-2 text-xs uppercase tracking-widest text-orange-500">Rank</p>
              <p className="text-3xl text-[#e6d5b8]">#{dashboard.teamStats.leaderboard_rank}</p>
            </div>
            <div className="border-r border-t border-[#e6d5b8]/10 p-5 md:p-6 xl:border-t-0">
              <p className="mb-2 text-xs uppercase tracking-widest text-orange-500">Last Known</p>
              <p className="text-xl text-[#e6d5b8]">
                {dashboard.latestLocation ? dashboard.latestLocation.label : "No GPS yet"}
              </p>
            </div>
            <div className="border-t border-[#e6d5b8]/10 p-5 md:p-6 xl:border-t-0">
              <p className="mb-2 text-xs uppercase tracking-widest text-orange-500">Points</p>
              <p className="text-3xl text-[#e6d5b8]">{dashboard.teamStats.total_points}</p>
            </div>
          </div>
        </section>

        {/* Map */}
        <div className="border-x border-[#e6d5b8]/10">
          <TeamRouteMap dashboard={dashboard} />
        </div>

        {/* ── CHECK-IN PROGRESS ───────────────────── */}
        <section className="db-section border border-[#e6d5b8]/10 bg-[#090809]/70" style={{ animationDelay: "0.1s", opacity: 0 }}>
          <div className="border-b border-[#e6d5b8]/10 px-6 py-5 md:px-8">
            <div className="flex items-center gap-2.5">
              <span className="db-live-dot inline-block h-2 w-2 bg-orange-500" />
              <h2 className="text-xl text-[#e6d5b8]">Check-In Progress</h2>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wider text-[#e6d5b8]/35">Start → route checkpoints → Union Station</p>
          </div>

          <div className="space-y-4 p-6 md:p-8">
            {/* GPS panel */}
            <div className="border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-orange-500/10 p-2 text-orange-400">
                  <LocateFixed className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-[#e6d5b8]">{locationHeaderTitle}</p>
                    <span className="border border-orange-500/30 px-2 py-0.5 text-xs text-orange-400">
                      {locationHeaderBadge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#e6d5b8]/50">{locationHeaderMessage}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className={`h-10 w-full border sm:w-auto ${hasRecordedGpsFix ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15" : "border-[#e6d5b8]/15 bg-transparent text-[#e6d5b8]/55 hover:bg-[#e6d5b8]/5"}`}
                  disabled={hasRecordedGpsFix || locationPermissionCopy.actionMode === "disabled" || locationPermissionCopy.actionMode === "granted" || locationPermissionState === "requesting"}
                  type="button"
                  variant="secondary"
                  onClick={() => void requestLocationAccess()}
                >
                  {locationPermissionState === "requesting" ? (
                    <><LoaderCircle className="h-4 w-4 animate-spin" />{locationPermissionCopy.actionLabel}</>
                  ) : hasRecordedGpsFix ? (
                    <><LocateFixed className="h-4 w-4" />Location Enabled</>
                  ) : (
                    <><LocateFixed className="h-4 w-4" />{locationPermissionCopy.actionLabel}</>
                  )}
                </Button>
                <p className="text-xs text-[#e6d5b8]/40">Use Chrome on your phone if possible. {locationHelpText}</p>
              </div>
              {!hasRecordedGpsFix ? (
                <p className="mt-3 text-xs text-[#e6d5b8]/30">No GPS fix captured yet.</p>
              ) : null}
            </div>

            {locationPermissionState === "denied" ? (
              <div className="border border-[#e6d5b8]/10 p-4">
                <p className="text-sm text-[#e6d5b8]">Location blocked</p>
                <p className="mt-1 text-xs leading-5 text-[#e6d5b8]/50">{locationHelpText}</p>
              </div>
            ) : null}

            {/* Checkpoint rows */}
            <div className="space-y-2">
              {visibleCheckpoints.map((checkpoint) => {
                const isOpen = openCheckpointKey === checkpoint.key;
                const isFinishLocked =
                  checkpoint.checkin_type === "finish" && !isFinishUnlocked;
                const checkpointChallenge =
                  checkpoint.challenge_id !== null
                    ? dashboard.challenges.find((item) => item.id === checkpoint.challenge_id) ?? null
                    : null;
                const targetLocation =
                  checkpoint.checkin_type !== "challenge"
                    ? null
                    : checkpointChallenge?.kind === "union"
                      ? {
                          latitude: 43.6453,
                          longitude: -79.3807,
                          radiusMeters: checkpoint.unlock_radius_meters ?? 150,
                        }
                      : checkpointChallenge?.checkpoint?.latitude != null &&
                          checkpointChallenge?.checkpoint?.longitude != null
                        ? {
                            latitude: checkpointChallenge.checkpoint.latitude,
                            longitude: checkpointChallenge.checkpoint.longitude,
                            radiusMeters:
                              checkpointChallenge.checkpoint.unlock_radius_meters ??
                              checkpoint.unlock_radius_meters ??
                              150,
                          }
                        : null;
                const manualLatitude = parseCoordinateInput(
                  manualCheckpointInputs[checkpoint.key]?.latitude ?? ""
                );
                const manualLongitude = parseCoordinateInput(
                  manualCheckpointInputs[checkpoint.key]?.longitude ?? ""
                );
                const hasValidManualPreview =
                  manualLatitude !== null &&
                  manualLongitude !== null &&
                  Number.isFinite(manualLatitude) &&
                  Number.isFinite(manualLongitude);
                const latestSubmittedDistance =
                  targetLocation &&
                  checkpoint.latest_checkin?.latitude != null &&
                  checkpoint.latest_checkin.longitude != null
                    ? haversineMeters(
                        checkpoint.latest_checkin.latitude,
                        checkpoint.latest_checkin.longitude,
                        targetLocation.latitude,
                        targetLocation.longitude
                      )
                    : null;
                const manualPreviewDistance =
                  targetLocation && hasValidManualPreview
                    ? haversineMeters(
                        manualLatitude,
                        manualLongitude,
                        targetLocation.latitude,
                        targetLocation.longitude
                      )
                    : null;

                const statusAccent =
                  checkpoint.status === "verified"
                    ? "border-l-emerald-500"
                    : checkpoint.status === "pending"
                      ? "border-l-orange-500"
                      : "border-l-[#e6d5b8]/15";

                return (
                  <div
                    key={checkpoint.key}
                    className={`border border-[#e6d5b8]/10 border-l-2 transition ${statusAccent} ${isOpen ? "bg-[#e6d5b8]/3" : "bg-transparent"}`}
                  >
                    <button
                      className="flex w-full items-start justify-between gap-3 p-4 text-left"
                      type="button"
                      onClick={() =>
                        setOpenCheckpointKey((current) =>
                          current === checkpoint.key ? null : checkpoint.key
                        )
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-base text-[#e6d5b8]">{checkpoint.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[#e6d5b8]/50">{checkpoint.description}</p>
                        <p className="mt-1 text-xs text-[#e6d5b8]/40">
                          <span className="text-[#e6d5b8]/25">At: </span>
                          {checkpoint.expected_location_label}
                        </p>
                        {checkpoint.latest_checkin ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#e6d5b8]/30">
                            <span>{new Date(checkpoint.latest_checkin.created_at).toLocaleString()}</span>
                            {checkpoint.latest_checkin.latitude !== null ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {formatCoordinate(checkpoint.latest_checkin.latitude)},{" "}
                                {formatCoordinate(checkpoint.latest_checkin.longitude)}
                              </span>
                            ) : <span>No GPS</span>}
                            {checkpoint.latest_checkin.accuracy_meters !== null ? (
                              <span>±{Math.round(checkpoint.latest_checkin.accuracy_meters)}m</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={checkpointVariant(checkpoint.status)}>
                          {checkpointLabel(checkpoint.status)}
                        </Badge>
                        <ChevronDown className={`h-4 w-4 text-[#e6d5b8]/35 transition ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {checkpoint.expected_location_description ? (
                      <div className="px-4 pb-2">
                        <button
                          className="inline-flex items-center gap-1 border border-[#e6d5b8]/10 px-2.5 py-1 text-xs text-[#e6d5b8]/40 transition hover:text-[#e6d5b8]"
                          type="button"
                          onClick={() => void copyAddress(checkpoint.expected_location_description ?? "")}
                        >
                          <Copy className="h-3 w-3 shrink-0" />
                          Copy address
                        </button>
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className="border-t border-[#e6d5b8]/10 px-4 pb-4 pt-4">
                        <form
                          className="space-y-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (
                              checkpoint.checkin_type === "start" &&
                              !checkpoint.latest_checkin
                            ) {
                              setPendingContractCheckpoint(checkpoint);
                              return;
                            }
                            void onCheckpointCheckin(checkpoint);
                          }}
                        >
                          {isFinishLocked ? (
                            <div className="rounded-[20px] border border-orange-400/14 bg-orange-500/[0.07] p-4">
                              <p className="text-sm font-semibold text-white">Finish locked</p>
                              <p className="mt-1 text-sm leading-6 text-white/62">
                                Complete all {MAX_CHALLENGES} challenges before the final Union check-in unlocks.
                              </p>
                            </div>
                          ) : null}
                          {checkpoint.checkin_type === "challenge" ? (
                            <div className="border border-sky-500/15 bg-sky-500/5 p-4">
                              <p className="text-sm text-[#e6d5b8]">Testing coordinates</p>
                              <p className="mt-1 text-xs text-[#e6d5b8]/45">Optional. Overrides live GPS if filled in.</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <Input
                                  className="border border-[#e6d5b8]/15 bg-[#e6d5b8]/5 text-[#e6d5b8] placeholder:text-[#e6d5b8]/25"
                                  inputMode="decimal"
                                  placeholder="Latitude"
                                  type="text"
                                  value={manualCheckpointInputs[checkpoint.key]?.latitude ?? ""}
                                  onChange={(event) =>
                                    setManualCheckpointInputs((current) => ({
                                      ...current,
                                      [checkpoint.key]: {
                                        latitude: event.target.value,
                                        longitude: current[checkpoint.key]?.longitude ?? "",
                                      },
                                    }))
                                  }
                                />
                                <Input
                                  className="border border-[#e6d5b8]/15 bg-[#e6d5b8]/5 text-[#e6d5b8] placeholder:text-[#e6d5b8]/25"
                                  inputMode="decimal"
                                  placeholder="Longitude"
                                  type="text"
                                  value={manualCheckpointInputs[checkpoint.key]?.longitude ?? ""}
                                  onChange={(event) =>
                                    setManualCheckpointInputs((current) => ({
                                      ...current,
                                      [checkpoint.key]: {
                                        latitude: current[checkpoint.key]?.latitude ?? "",
                                        longitude: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              {targetLocation ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="border border-[#e6d5b8]/10 p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-[#e6d5b8]/30 mb-2">Target</p>
                                    <p className="font-mono text-xs text-[#e6d5b8]/60">
                                      {formatCoordinate(targetLocation.latitude)}, {formatCoordinate(targetLocation.longitude)}
                                    </p>
                                    <p className="mt-1 text-xs text-[#e6d5b8]/40">Radius: {Math.round(targetLocation.radiusMeters)}m</p>
                                  </div>
                                  <div className="border border-[#e6d5b8]/10 p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-[#e6d5b8]/30 mb-2">Actual</p>
                                    {checkpoint.latest_checkin?.latitude != null && checkpoint.latest_checkin.longitude != null ? (
                                      <>
                                        <p className="font-mono text-xs text-[#e6d5b8]/60">
                                          {formatCoordinate(checkpoint.latest_checkin.latitude)}, {formatCoordinate(checkpoint.latest_checkin.longitude)}
                                        </p>
                                        <p className="mt-1 text-xs text-[#e6d5b8]/40">
                                          Δ {latestSubmittedDistance !== null ? `${Math.round(latestSubmittedDistance)}m` : "?"}
                                        </p>
                                      </>
                                    ) : <p className="text-xs text-[#e6d5b8]/35">No coords yet.</p>}
                                  </div>
                                  <div className="border border-[#e6d5b8]/10 p-3 sm:col-span-2">
                                    <p className="text-[10px] uppercase tracking-widest text-[#e6d5b8]/30 mb-2">Manual preview</p>
                                    {hasValidManualPreview ? (
                                      <>
                                        <p className="font-mono text-xs text-[#e6d5b8]/60">
                                          {formatCoordinate(manualLatitude)}, {formatCoordinate(manualLongitude)}
                                        </p>
                                        <p className="mt-1 text-xs text-[#e6d5b8]/40">
                                          Δ {manualPreviewDistance !== null ? `${Math.round(manualPreviewDistance)}m` : "?"}{" · "}
                                          {manualPreviewDistance !== null && manualPreviewDistance <= targetLocation.radiusMeters ? "✓ Would pass" : "✗ Would fail"}
                                        </p>
                                      </>
                                    ) : <p className="text-xs text-[#e6d5b8]/30">Enter lat/lng above to preview.</p>}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="border border-[#e6d5b8]/10 bg-[#e6d5b8]/3 p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-orange-500/10 p-2 text-orange-400">
                                <Navigation className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm text-[#e6d5b8]">GPS check-in status</p>
                                <p className="mt-1 text-xs leading-5 text-[#e6d5b8]/50">
                                  {gpsMessages[checkpoint.key] ??
                                    (checkpoint.latest_checkin?.gps_captured_at
                                      ? "Location captured on latest check-in."
                                      : "Location will be requested when you tap the button below.")}
                                </p>
                              </div>
                            </div>
                            {!checkpoint.latest_checkin?.gps_captured_at ? (
                              <p className="mt-2 text-xs text-[#e6d5b8]/30">
                                {checkpoint.checkin_type === "challenge"
                                  ? "Live GPS required for this checkpoint challenge."
                                  : "If location is blocked, check-in still goes through for HQ review."}
                              </p>
                            ) : null}
                          </div>

                          {checkpoint.checkin_type === "challenge" &&
                          checkpoint.challenge_id !== null &&
                          orderedChallenges.find((item) => item.id === checkpoint.challenge_id)?.challenge_order !== 4 ? (
                            <div className="border border-orange-500/15 bg-orange-500/5 p-4">
                              <p className="text-sm text-[#e6d5b8]">After check-in</p>
                              <p className="mt-1 text-xs text-[#e6d5b8]/50">Scroll to the challenge queue to view and submit.</p>
                            </div>
                          ) : null}

                          <Button
                            className="h-11 w-full border border-orange-500 bg-orange-500 text-black hover:bg-orange-400"
                            disabled={checkingInKey === checkpoint.key || isFinishLocked}
                            type="submit"
                          >
                            {checkingInKey === checkpoint.key ? (
                              <><LoaderCircle className="h-4 w-4 animate-spin" />Checking in...</>
                            ) : checkpoint.checkin_type === "start" && !checkpoint.latest_checkin
                              ? "Accept contract and start"
                              : checkpoint.checkin_type === "finish"
                                ? "Check in at Union"
                                : checkpoint.expected_location_label === "Union Station"
                                  ? "Arrived at Union"
                                  : "Arrived at checkpoint"}
                          </Button>
                        </form>

                        {checkpoint.latest_checkin?.review_note ? (
                          <p className="mt-3 text-xs text-[#e6d5b8]/35">HQ note: {checkpoint.latest_checkin.review_note}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!hasStartedRace ? (
              <div className="border border-[#e6d5b8]/10 p-4">
                <p className="text-sm text-[#e6d5b8]">Challenges unlock after the start check-in</p>
                <p className="mt-1 text-xs text-[#e6d5b8]/45">Complete your start check-in first. Challenge cards appear automatically.</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── CHALLENGE QUEUE ─────────────────────── */}
        <section className="db-section border border-[#e6d5b8]/10 bg-[#090809]/70" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <div className="border-b border-[#e6d5b8]/10 px-6 py-5 md:px-8">
            <h2 className="text-xl text-[#e6d5b8]">Challenge Queue</h2>
            <p className="mt-1 text-xs uppercase tracking-wider text-[#e6d5b8]/35">
              Mission 1 stays open all race · each next mission appears after current is submitted
            </p>
          </div>

          <div className="p-6 md:p-8">
            {!hasStartedRace ? (
              <p className="text-sm text-[#e6d5b8]/40">Start the race to reveal challenge cards.</p>
            ) : !dashboard.challenges.length ? (
              <p className="text-sm text-[#e6d5b8]/40">HQ has not released any challenges yet.</p>
            ) : visibleChallenges.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleChallenges.map((challenge) => {
                  const isLocked = challenge.review_status === "verified";
                  const latestUploadAt = challenge.uploads[0]?.uploaded_at;
                  const showMediaSection = Boolean(challenge.allow_media_upload) || challenge.uploads.length > 0;
                  const kindCopy = challengeKindCopy(challenge);

                  return (
                    <div
                      key={challenge.id}
                      id={`challenge-proof-${challenge.id}`}
                      className="flex flex-col border border-[#e6d5b8]/12 bg-[#090809]/50"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#e6d5b8]/10 p-5">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-widest text-orange-500">
                            Mission {challenge.challenge_order}
                          </p>
                          <h3 className="text-lg text-[#e6d5b8]">{challenge.title}</h3>
                        </div>
                        <Badge variant={challengeStateVariant(challenge)}>
                          {challengeStateLabel(challenge)}
                        </Badge>
                      </div>

                      <div className="flex flex-1 flex-col space-y-4 p-5">
                        <p className="text-sm leading-6 text-[#e6d5b8]/55">{challenge.text}</p>

                        {/* Kind info */}
                        <div className="border border-emerald-500/15 bg-emerald-500/5 p-4">
                          <p className="text-sm text-[#e6d5b8]">{kindCopy.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#e6d5b8]/50">{kindCopy.description}</p>
                          {challenge.kind === "union" ? (
                            <p className="mt-2 text-xs text-[#e6d5b8]/35">Union Station · Front St entrance</p>
                          ) : challenge.checkpoint?.checkpoint_label ? (
                            <p className="mt-2 text-xs text-[#e6d5b8]/35">
                              {challenge.checkpoint.checkpoint_label}
                              {challenge.checkpoint.checkpoint_address ? ` · ${challenge.checkpoint.checkpoint_address}` : ""}
                            </p>
                          ) : null}
                        </div>

                        {/* Media section */}
                        {showMediaSection ? (
                          <div className="border border-[#e6d5b8]/10 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm text-[#e6d5b8]">Proof media</p>
                                <p className="text-xs text-[#e6d5b8]/40">
                                  {challenge.uploads.length} file{challenge.uploads.length === 1 ? "" : "s"}
                                  {latestUploadAt ? ` · ${new Date(latestUploadAt).toLocaleString()}` : " · none yet"}
                                </p>
                              </div>
                              {Boolean(challenge.allow_media_upload) ? (
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
                                  <span className={`inline-flex h-9 cursor-pointer items-center gap-2 border px-3 text-xs transition ${isLocked || uploadingId === challenge.id ? "cursor-not-allowed border-[#e6d5b8]/8 text-[#e6d5b8]/25" : "border-[#e6d5b8]/20 text-[#e6d5b8]/55 hover:border-[#e6d5b8]/40 hover:text-[#e6d5b8]"}`}>
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    {uploadingId === challenge.id ? "Uploading..." : "Add media"}
                                  </span>
                                </label>
                              ) : null}
                            </div>
                            {!Boolean(challenge.allow_media_upload) ? <p className="text-xs text-[#e6d5b8]/30">Media upload off for this challenge.</p> : null}
                            {isLocked ? <p className="text-xs text-emerald-400/70">HQ verified. Uploads locked.</p> : null}
                            {challenge.review_status === "rejected" && challenge.review_note ? (
                              <p className="text-xs text-amber-300/70">HQ: {challenge.review_note}</p>
                            ) : null}
                            {challenge.uploads.length ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {challenge.uploads.map((upload) => (
                                  <div key={upload.id} className="overflow-hidden border border-[#e6d5b8]/10">
                                    <div className="aspect-[4/3] bg-black/30">
                                      {upload.media_type === "image" ? (
                                        <img alt={upload.file_name} className="h-full w-full object-cover" decoding="async" loading="lazy" src={upload.signed_url} />
                                      ) : (
                                        <video className="h-full w-full object-cover" controls playsInline preload="none" src={upload.signed_url} />
                                      )}
                                    </div>
                                    <div className="p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-xs text-[#e6d5b8]/65">{upload.file_name}</p>
                                          <p className="text-xs text-[#e6d5b8]/35">{upload.media_type === "video" ? "Video" : "Image"} · {Math.max(1, Math.round(upload.file_size_bytes / 1024 / 1024))}MB</p>
                                        </div>
                                        {upload.media_type === "video" ? <Video className="h-3.5 w-3.5 shrink-0 text-[#e6d5b8]/30" /> : null}
                                      </div>
                                      <div className="mt-2 flex items-center justify-between">
                                        <a className="text-xs text-orange-400 hover:text-orange-300" href={upload.signed_url} rel="noreferrer" target="_blank">Open</a>
                                        {!isLocked ? (
                                          <button className="inline-flex items-center gap-1 text-xs text-[#e6d5b8]/30 transition hover:text-red-400" disabled={removingUploadId === upload.id} type="button" onClick={() => void onDeleteUpload(challenge.id, upload.id)}>
                                            <Trash2 className="h-3 w-3" />
                                            {removingUploadId === upload.id ? "Removing..." : "Remove"}
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Submit form */}
                        <form
                          className="mt-auto space-y-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            void onSubmitChallenge(challenge.id, String(formData.get("proofNote") ?? ""));
                          }}
                        >
                          <Textarea
                            className="border border-[#e6d5b8]/15 bg-[#e6d5b8]/5 text-[#e6d5b8] placeholder:text-[#e6d5b8]/25"
                            defaultValue={challenge.proof_note}
                            disabled={isLocked}
                            name="proofNote"
                            placeholder="Add a note for HQ if needed. Submit with media only too."
                          />
                          <Button
                            className="border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-50"
                            disabled={savingId === challenge.id || isLocked}
                            type="submit"
                          >
                            {savingId === challenge.id ? (
                              <><LoaderCircle className="h-4 w-4 animate-spin" />Submitting...</>
                            ) : challenge.status === "submitted" ? "Challenge submitted" : "Submit Challenge"}
                          </Button>
                          <p className="text-xs text-[#e6d5b8]/30">
                            {challenge.submitted_at ? `Last submitted ${new Date(challenge.submitted_at).toLocaleString()}` : "No proof submitted yet."}
                          </p>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#e6d5b8]/40">Submit the current challenge to reveal the next one.</p>
            )}
          </div>
        </section>

        {/* ── LIVE LEADERBOARD ────────────────────── */}
        <section className="db-section border border-[#e6d5b8]/10 bg-[#090809]/70" style={{ animationDelay: "0.3s", opacity: 0 }}>
          <div className="border-b border-[#e6d5b8]/10 px-6 py-5 md:px-8">
            <div className="flex items-center gap-2.5">
              <span className="db-live-dot inline-block h-2 w-2 bg-emerald-500" />
              <h2 className="text-xl text-[#e6d5b8]">Live Leaderboard</h2>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wider text-[#e6d5b8]/35">Standings refresh every few seconds</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e6d5b8]/10">
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-widest text-[#e6d5b8]/30 md:px-8">Team</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-[#e6d5b8]/30">Rank</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-[#e6d5b8]/30">Points</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-[#e6d5b8]/30 md:px-6">Done</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.leaderboard.map((entry) => {
                  const isCurrentTeam = entry.team_name === dashboard.team.team_name;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-[#e6d5b8]/8 transition ${isCurrentTeam ? "border-l-2 border-l-orange-500 bg-orange-500/8" : "hover:bg-[#e6d5b8]/3"}`}
                    >
                      <td className={`px-6 py-3.5 text-sm md:px-8 ${isCurrentTeam ? "text-[#e6d5b8]" : "text-[#e6d5b8]/60"}`}>
                        {entry.team_name}
                        {isCurrentTeam ? <span className="ml-2 text-xs text-orange-400 uppercase tracking-wider">You</span> : null}
                      </td>
                      <td className={`px-4 py-3.5 text-sm ${isCurrentTeam ? "text-orange-400" : "text-[#e6d5b8]/45"}`}>#{entry.leaderboard_rank}</td>
                      <td className={`px-4 py-3.5 text-sm ${isCurrentTeam ? "text-[#e6d5b8]" : "text-[#e6d5b8]/55"}`}>{entry.total_points}</td>
                      <td className={`px-4 py-3.5 text-sm md:px-6 ${isCurrentTeam ? "text-[#e6d5b8]" : "text-[#e6d5b8]/45"}`}>
                        {entry.completed_count}/{entry.total_challenges}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* ── CONTRACT MODAL ──────────────────────── */}
      {pendingContractCheckpoint ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="w-full max-w-2xl border border-[#e6d5b8]/15 bg-[#090809] text-[#e6d5b8]">
            <div className="border-b border-[#e6d5b8]/10 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Converge Contract</p>
              <h3 className="mt-2 text-3xl text-[#e6d5b8]">Start Terms</h3>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="border border-[#e6d5b8]/10 bg-[#e6d5b8]/3 p-5">
                <p className="mb-3 text-xs uppercase tracking-wider text-[#e6d5b8]/30">Agreement</p>
                <p className="text-base leading-7 text-[#e6d5b8]/70">
                  The winning team gets to decide the losing team&apos;s consequence:
                  either interview people with a question from the winners, or complete a dare set by them.
                </p>
              </div>

              <div className="border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                <p className="text-sm text-[#e6d5b8]">Acceptance required to begin</p>
                <p className="text-sm leading-6 text-[#e6d5b8]/60">
                  Accepting starts your team officially. Until accepted, the race stays locked and challenge cards will not open.
                </p>
                <p className="text-sm leading-6 text-[#e6d5b8]/60">
                  You cannot cheat on the challenges or submit random check-ins. Adelynn will be reviewing and approving them.
                </p>
                <p className="text-sm font-bold text-orange-400 [text-shadow:0_0_12px_theme(colors.orange.400/0.5)]">
                  James is the one who created this so YOU CANNOT LOSE AT ALL. LOCK IN CLUCK IN 🔒
                </p>
                <p className="border border-yellow-400/25 bg-yellow-400/8 px-4 py-3 text-sm font-bold text-yellow-300">
                  🎥 YOU HAVE TO RECORD POV OF DOING THE CHALLENGE FOR THE ENTIRE DURATION
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  className="border border-[#e6d5b8]/15 bg-transparent text-[#e6d5b8]/50 hover:bg-[#e6d5b8]/5 hover:text-[#e6d5b8]"
                  type="button"
                  variant="secondary"
                  onClick={() => setPendingContractCheckpoint(null)}
                >
                  Not now
                </Button>
                <Button
                  className="border border-orange-500 bg-orange-500 text-black hover:bg-orange-400"
                  type="button"
                  onClick={() => void onStartContractAccept()}
                >
                  Accept and start
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
