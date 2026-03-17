import { LoadingScreen } from "@/components/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      label="Awaiting Converge..."
      description="Syncing the city challenge."
    />
  );
}
