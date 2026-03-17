import { LoadingScreen } from "@/components/loading-screen";

export default function MapLoading() {
  return (
    <LoadingScreen
      label="Awaiting live map..."
      description="Syncing team positions, route points, and Union Station."
    />
  );
}
