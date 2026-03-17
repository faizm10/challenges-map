import { LoadingScreen } from "@/components/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      label="Awaiting check-in..."
      description="Pulling your route, challenges, and GPS status."
    />
  );
}
