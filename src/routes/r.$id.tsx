import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { recordClick } from "@/lib/board.functions";

export const Route = createFileRoute("/r/$id")({
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("That listing does not exist.");
    }
    const result = await recordClick({ data: { id } });
    if (!result.ok) throw new Error(result.error);
    return result;
  },
  component: RedirectOut,
});

function RedirectOut() {
  const { url } = Route.useLoaderData();

  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <p className="font-display marquee-glow text-sm tracking-hud text-accent uppercase">Inserting you into the cabinet</p>
      <p className="max-w-md truncate text-sm text-muted">{url}</p>
    </main>
  );
}
