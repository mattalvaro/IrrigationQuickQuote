import { Wizard } from "@/components/Wizard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <main className="min-h-screen relative z-10 py-8 px-4 sm:py-12">
      <ErrorBoundary>
        <Wizard />
      </ErrorBoundary>
    </main>
  );
}
