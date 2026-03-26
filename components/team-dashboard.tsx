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
              <Link href="/leaderboard">Back to Leaderboard</Link>
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
                    placeholder="Enter access name"
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
                    placeholder="Enter access code"
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
      {newChallengeBanner ? (
        <div className="rounded-[24px] border border-orange-300/18 bg-orange-500/[0.08] p-5 text-white shadow-[0_18px_50px_rgba(255,120,0,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200">
            Challenge Drop Is Out
          </p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-white">{newChallengeBanner.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/62">
                A new challenge just landed. Open the card below to upload proof and submit.
              </p>
            </div>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              type="button"
              onClick={() => setNewChallengeBanner(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

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
            {shouldShowScrollCue ? (
              <div className="max-w-2xl rounded-[18px] border border-orange-300/16 bg-orange-500/[0.08] px-4 py-3">
                <p className="text-sm font-semibold text-white">Next challenge is ready</p>
                <p className="mt-1 text-sm leading-6 text-white/62">
                  Scroll down to the challenge queue to view and submit it.
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              variant="secondary"
            >
              <Link href="/leaderboard">Leaderboard</Link>
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

      <TeamRouteMap dashboard={dashboard} />

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Check-In Progress</CardTitle>
          <CardDescription className="text-white/52">
            Start the race, unlock route checkpoints, then finish at Union.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-[22px] border border-orange-400/14 bg-orange-500/[0.07] p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-orange-500/14 p-2 text-orange-200">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{locationHeaderTitle}</p>
                  <Badge className="border-orange-300/18 bg-orange-300/10 text-orange-100" variant="secondary">
                    {locationHeaderBadge}
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-white/62">
                  {locationHeaderMessage}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className={`h-11 w-full sm:w-auto ${
                  hasRecordedGpsFix
                    ? "bg-emerald-500/90 text-white hover:bg-emerald-500"
                    : "bg-white/8 text-white hover:bg-white/12"
                }`}
                disabled={
                  hasRecordedGpsFix ||
                  locationPermissionCopy.actionMode === "disabled" ||
                  locationPermissionCopy.actionMode === "granted" ||
                  locationPermissionState === "requesting"
                }
                type="button"
                variant="secondary"
                onClick={() => void requestLocationAccess()}
              >
                {locationPermissionState === "requesting" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {locationPermissionCopy.actionLabel}
                  </>
                ) : hasRecordedGpsFix ? (
                  <>
                    <LocateFixed className="h-4 w-4" />
                    Location Enabled
                  </>
                ) : (
                  <>
                    <LocateFixed className="h-4 w-4" />
                    {locationPermissionCopy.actionLabel}
                  </>
                )}
              </Button>
              <p className="text-sm leading-6 text-white/62">
                Use Chrome on your phone if possible. {locationHelpText}
              </p>
            </div>
            {!hasRecordedGpsFix ? (
              <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
                <p className="text-sm text-white/52">No GPS fix captured yet.</p>
              </div>
            ) : null}
          </div>

          {locationPermissionState === "denied" ? (
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4 text-white">
              <p className="text-sm font-semibold text-white">Location blocked</p>
              <p className="mt-2 text-sm leading-6 text-white/64">{locationHelpText}</p>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-3 sm:p-4">
            <div className="grid gap-2">
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

                return (
                  <div
                    key={checkpoint.key}
                    className={`rounded-[20px] border transition ${
                      isOpen
                        ? "border-orange-400/22 bg-white/[0.06]"
                        : "border-white/6 bg-transparent"
                    }`}
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
                        <p className="text-lg font-semibold text-white">{checkpoint.label}</p>
                        <p className="mt-1 text-sm leading-6 text-white/56">{checkpoint.description}</p>
                        <p className="mt-2 text-sm text-white/76">
                          <span className="text-white/46">Expected location:</span>{" "}
                          {checkpoint.expected_location_label}
                        </p>
                        {checkpoint.expected_location_description ? (
                          <p className="text-xs text-white/42">
                            {checkpoint.expected_location_description}
                          </p>
                        ) : null}
                        {checkpoint.latest_checkin ? (
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/42">
                            <span>{new Date(checkpoint.latest_checkin.created_at).toLocaleString()}</span>
                            {checkpoint.latest_checkin.latitude !== null ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {formatCoordinate(checkpoint.latest_checkin.latitude)},{" "}
                                {formatCoordinate(checkpoint.latest_checkin.longitude)}
                              </span>
                            ) : (
                              <span>No GPS captured</span>
                            )}
                            {checkpoint.latest_checkin.accuracy_meters !== null ? (
                              <span>Accuracy {Math.round(checkpoint.latest_checkin.accuracy_meters)}m</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={checkpointVariant(checkpoint.status)}>
                          {checkpointLabel(checkpoint.status)}
                        </Badge>
                        <ChevronDown
                          className={`mt-0.5 h-4 w-4 shrink-0 text-white/52 transition ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {checkpoint.expected_location_description ? (
                      <div className="px-4 pb-2">
                        <button
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                          type="button"
                          onClick={() => void copyAddress(checkpoint.expected_location_description ?? "")}
                        >
                          <Copy className="h-3 w-3 shrink-0" />
                          Copy address
                        </button>
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className="border-t border-white/8 px-4 pb-4 pt-4">
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
                            <div className="rounded-[20px] border border-sky-400/12 bg-sky-500/[0.05] p-4">
                              <p className="text-sm font-semibold text-white">Testing coordinates</p>
                              <p className="mt-1 text-xs leading-5 text-white/58">
                                Optional for testing only. If you fill these in, the checkpoint will
                                use them instead of live GPS.
                              </p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <Input
                                  className="border-white/10 bg-white/5 text-white placeholder:text-white/26"
                                  inputMode="decimal"
                                  placeholder="Latitude"
                                  type="text"
                                  value={manualCheckpointInputs[checkpoint.key]?.latitude ?? ""}
                                  onChange={(event) =>
                                    setManualCheckpointInputs((current) => ({
                                      ...current,
                                      [checkpoint.key]: {
                                        latitude: event.target.value,
                                        longitude:
                                          current[checkpoint.key]?.longitude ?? "",
                                      },
                                    }))
                                  }
                                />
                                <Input
                                  className="border-white/10 bg-white/5 text-white placeholder:text-white/26"
                                  inputMode="decimal"
                                  placeholder="Longitude"
                                  type="text"
                                  value={manualCheckpointInputs[checkpoint.key]?.longitude ?? ""}
                                  onChange={(event) =>
                                    setManualCheckpointInputs((current) => ({
                                      ...current,
                                      [checkpoint.key]: {
                                        latitude:
                                          current[checkpoint.key]?.latitude ?? "",
                                        longitude: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              {targetLocation ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/44">
                                      Checkpoint target
                                    </p>
                                    <p className="mt-2 font-mono text-xs text-white/76">
                                      {formatCoordinate(targetLocation.latitude)},{" "}
                                      {formatCoordinate(targetLocation.longitude)}
                                    </p>
                                    <p className="mt-2 text-xs text-white/56">
                                      Acceptance radius: {Math.round(targetLocation.radiusMeters)}m
                                    </p>
                                  </div>
                                  <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/44">
                                      Actual check-in
                                    </p>
                                    {checkpoint.latest_checkin?.latitude != null &&
                                    checkpoint.latest_checkin.longitude != null ? (
                                      <>
                                        <p className="mt-2 font-mono text-xs text-white/76">
                                          {formatCoordinate(checkpoint.latest_checkin.latitude)},{" "}
                                          {formatCoordinate(checkpoint.latest_checkin.longitude)}
                                        </p>
                                        <p className="mt-2 text-xs text-white/56">
                                          Distance from target:{" "}
                                          {latestSubmittedDistance !== null
                                            ? `${Math.round(latestSubmittedDistance)}m`
                                            : "Unknown"}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="mt-2 text-xs text-white/56">
                                        No submitted checkpoint coordinates yet.
                                      </p>
                                    )}
                                  </div>
                                  <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 sm:col-span-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/44">
                                      Manual test preview
                                    </p>
                                    {hasValidManualPreview ? (
                                      <>
                                        <p className="mt-2 font-mono text-xs text-white/76">
                                          {formatCoordinate(manualLatitude)}, {formatCoordinate(manualLongitude)}
                                        </p>
                                        <p className="mt-2 text-xs text-white/56">
                                          Distance from target:{" "}
                                          {manualPreviewDistance !== null
                                            ? `${Math.round(manualPreviewDistance)}m`
                                            : "Unknown"}
                                          {" · "}
                                          {manualPreviewDistance !== null &&
                                          manualPreviewDistance <= targetLocation.radiusMeters
                                            ? "Would pass"
                                            : "Would fail"}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="mt-2 text-xs text-white/56">
                                        Enter a latitude and longitude above to preview whether the
                                        test check-in is inside the allowed radius.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
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
                                {checkpoint.checkin_type === "challenge"
                                  ? "Live GPS is required to unlock this checkpoint challenge."
                                  : "If location access is blocked, the check-in still goes through and HQ can review it manually."}
                              </p>
                            ) : null}
                          </div>

                          {checkpoint.checkin_type === "challenge" &&
                          checkpoint.challenge_id !== null &&
                          orderedChallenges.find((item) => item.id === checkpoint.challenge_id)
                            ?.challenge_order !== 4 ? (
                            <div className="rounded-[20px] border border-orange-400/14 bg-orange-500/[0.07] p-4">
                              <p className="text-sm font-semibold text-white">After check-in</p>
                              <p className="mt-1 text-sm leading-6 text-white/62">
                                Scroll down to the challenge queue to view and submit this challenge.
                              </p>
                            </div>
                          ) : null}

                          <Button
                            className="h-12 w-full bg-orange-500 text-base text-black hover:bg-orange-400"
                            disabled={checkingInKey === checkpoint.key || isFinishLocked}
                            type="submit"
                          >
                            {checkingInKey === checkpoint.key ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Checking in...
                              </>
                            ) : (
                              checkpoint.checkin_type === "start" && !checkpoint.latest_checkin
                                ? "Accept contract and start"
                                : checkpoint.checkin_type === "finish"
                                  ? "Check in at Union"
                                  : checkpoint.expected_location_label === "Union Station"
                                    ? "Arrived at Union"
                                    : "Arrived at checkpoint"
                            )}
                          </Button>
                        </form>

                        {checkpoint.latest_checkin?.review_note ? (
                          <p className="mt-3 text-xs text-white/44">
                            HQ note: {checkpoint.latest_checkin.review_note}
                          </p>
                        ) : null}

                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {!hasStartedRace ? (
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4 text-white">
              <p className="text-sm font-semibold text-white">Challenges unlock after the start check-in</p>
              <p className="mt-1 text-sm leading-6 text-white/58">
                Complete your start check-in first. Once the race has started, the first challenge
                card will appear automatically.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Challenge Queue</CardTitle>
          <CardDescription className="text-white/52">
            Challenge 1 stays open all race. Each next route challenge appears only after the current one is submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!hasStartedRace ? (
            <p className="text-sm text-white/46">
              Start the race with your first check-in to reveal challenge cards.
            </p>
          ) : !dashboard.challenges.length ? (
            <p className="text-sm text-white/46">
              HQ has not released any challenges yet.
            </p>
          ) : visibleChallenges.length ? (
            visibleChallenges.map((challenge) => {
              const isLocked = challenge.review_status === "verified";
              const latestUploadAt = challenge.uploads[0]?.uploaded_at;
              const showMediaSection =
                Boolean(challenge.allow_media_upload) || challenge.uploads.length > 0;
              const kindCopy = challengeKindCopy(challenge);

              return (
                <Card
                  key={challenge.id}
                  id={`challenge-proof-${challenge.id}`}
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

                  <div className="mb-4 rounded-[20px] border border-emerald-400/12 bg-emerald-500/[0.06] p-4">
                    <p className="text-sm font-semibold text-white">{kindCopy.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {kindCopy.description}
                    </p>
                    {challenge.kind === "union" ? (
                      <p className="mt-2 text-xs text-white/54">
                        Required location: Union Station · Front Street entrance
                      </p>
                    ) : challenge.checkpoint?.checkpoint_label ? (
                      <p className="mt-2 text-xs text-white/54">
                        Required location: {challenge.checkpoint.checkpoint_label}
                        {challenge.checkpoint.checkpoint_address
                          ? ` · ${challenge.checkpoint.checkpoint_address}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  {showMediaSection ? (
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
                        ) : null}
                      </div>

                      {!Boolean(challenge.allow_media_upload) ? (
                        <p className="mt-3 text-xs text-white/52">
                          Media upload is turned off for this challenge.
                        </p>
                      ) : null}
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
                                    decoding="async"
                                    loading="lazy"
                                    src={upload.signed_url}
                                  />
                                ) : (
                                  <video
                                    className="h-full w-full object-cover"
                                    controls
                                    playsInline
                                    preload="none"
                                    src={upload.signed_url}
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
                                    href={upload.signed_url}
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
                  ) : null}

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
                      placeholder="Add a note for HQ if needed. You can also submit with uploaded media only."
                    />
                    <Button
                      className="bg-orange-500 text-black hover:bg-orange-400"
                      disabled={savingId === challenge.id || isLocked}
                      type="submit"
                    >
                      {savingId === challenge.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        challenge.status === "submitted" ? "Challenge submitted" : "Submit Challenge"
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
              Submit the current challenge to reveal the next one in your route.
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
                <TableHead>Points</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.leaderboard.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.team_name}</TableCell>
                  <TableCell>#{entry.leaderboard_rank}</TableCell>
                  <TableCell>{entry.total_points}</TableCell>
                  <TableCell>{entry.completed_count}/{entry.total_challenges}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pendingContractCheckpoint ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#151112] text-white shadow-[0_24px_90px_rgba(0,0,0,0.5)]">
            <div className="border-b border-white/8 px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
                Converge Contract
              </p>
              <h3 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
                Start Terms
              </h3>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/38">Agreement</p>
                <p className="mt-3 text-base leading-8 text-white/80 sm:text-lg">
                  The winning team gets to decide the losing team&apos;s consequence:
                  either interview people with a question from the winners, or complete a dare set by them.
                </p>
              </div>

              <div className="rounded-[24px] border border-orange-400/14 bg-orange-500/[0.06] p-4 sm:p-5">
                <p className="text-sm font-semibold text-white">Acceptance required to begin</p>
                <p className="mt-2 text-sm leading-7 text-white/64">
                  Accepting this contract starts your team officially. Until it is accepted,
                  the race stays locked and challenge cards will not open.
                </p>
                <p className="mt-3 text-sm leading-7 text-white/64">
                  You cannot cheat on the challenges or submit random check-ins. Adelynn will be
                  reviewing and approving them.
                </p>
                <p className="mt-3 text-sm font-bold leading-7 text-orange-400 [text-shadow:0_0_12px_theme(colors.orange.400/0.5)]">
                  James is the one who created this so YOU CANNOT LOSE AT ALL. LOCK IN CLUCK IN 🔒
                </p>
                <p className="mt-3 rounded-[12px] bg-yellow-400/10 px-3 py-2 text-sm font-bold leading-7 text-yellow-300 ring-1 ring-yellow-400/30 [text-shadow:0_0_14px_theme(colors.yellow.300/0.5)]">
                  🎥 YOU HAVE TO RECORD POV OF DOING THE CHALLENGE FOR THE ENTIRE DURATION
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  type="button"
                  variant="secondary"
                  onClick={() => setPendingContractCheckpoint(null)}
                >
                  Not now
                </Button>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
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
