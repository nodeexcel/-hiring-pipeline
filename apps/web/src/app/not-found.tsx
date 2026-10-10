import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <p className="text-base text-muted-foreground">The page you are looking for does not exist or was moved.</p>
      <Button asChild variant="outline">
        <Link href="/admin/candidates">Go to candidates</Link>
      </Button>
    </main>
  );
}
