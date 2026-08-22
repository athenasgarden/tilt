import { createFileRoute } from "@tanstack/react-router";
import { fulfillPaidSession } from "@/lib/board.server";
import { getStripe, readStripeSecret } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("stripe-signature");
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

        if (webhookSecret) {
          if (!signature) {
            return new Response("Missing stripe-signature", { status: 400 });
          }
          try {
            const stripe = await getStripe();
            stripe.webhooks.constructEvent(raw, signature, webhookSecret);
          } catch {
            return new Response("Invalid signature", { status: 400 });
          }
        } else {
          const key = await readStripeSecret();
          if (!key) return new Response("Stripe is not connected", { status: 503 });
        }

        let sessionId = "";
        try {
          const payload = JSON.parse(raw) as {
            type?: string;
            data?: { object?: { id?: string; object?: string } };
          };
          if (payload.type !== "checkout.session.completed") {
            return Response.json({ received: true });
          }
          sessionId = payload.data?.object?.id ?? "";
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (!sessionId) return new Response("Missing session", { status: 400 });
        await fulfillPaidSession(sessionId);
        return Response.json({ received: true });
      },
    },
  },
});
