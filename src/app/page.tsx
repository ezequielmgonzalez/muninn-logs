import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Muninn Logs</h1>
      <p className="text-muted-foreground">The memory of your game table.</p>
      <Button>Log a game</Button>
    </main>
  );
}
