import { LoadingScreen } from "@/components/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      label="Awaiting HQ..."
      description="Syncing team progress, check-ins, and control state."
    />
  );
}
