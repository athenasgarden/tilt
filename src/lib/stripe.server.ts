import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import type { StripeMode } from "@/lib/types";

export function stripeModeFromKey(key: string): Exclude<StripeMode, "off"> {
  return key.startsWith("sk_live_") ? "live" : "test";
}

export async function readStripeSecret(): Promise<string | null> {
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();
  if (fromEnv) return fromEnv;
  const sql = await getSql();
  const rows = await sql<{ v: string }>`
    select v from operator_settings where k = 'stripe_secret_key' limit 1
  `;
  const stored = rows[0]?.v?.trim();
  return stored || null;
}

export async function stripeStatus(): Promise<{
  paymentsReady: boolean;
  stripeMode: StripeMode;
  source: "env" | "operator" | "none";
}> {
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();
  if (fromEnv) {
    return {
      paymentsReady: true,
      stripeMode: stripeModeFromKey(fromEnv),
      source: "env",
    };
  }
  const stored = await readStripeSecret();
  if (stored) {
    return {
      paymentsReady: true,
      stripeMode: stripeModeFromKey(stored),
      source: "operator",
    };
  }
  return { paymentsReady: false, stripeMode: "off", source: "none" };
}

export async function getStripe(): Promise<Stripe> {
  const key = await readStripeSecret();
  if (!key) {
    throw new Error("Stripe is not connected. Open Operator and paste a secret key.");
  }
  return new Stripe(key);
}

export async function verifyStripeKey(key: string): Promise<boolean> {
  try {
    const stripe = new Stripe(key);
    await stripe.balance.retrieve();
    return true;
  } catch {
    return false;
  }
}

export function publicOrigin(): string {
  const request = getRequest();
  const originHeader = request.headers.get("origin")?.trim();
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      // fall through
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // fall through
    }
  }

  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const local = host.includes("localhost") || host.startsWith("127.");
  const proto = forwardedProto || (local ? "http" : url.protocol.replace(":", "") || "https");
  return `${proto}://${host}`;
}

export async function createBidCheckout(input: {
  url: string;
  handle: string;
  tagline: string;
  bid: number;
  cost: number;
}): Promise<{ id: string; url: string }> {
  const stripe = await getStripe();
  const origin = publicOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "pay",
    success_url: `${origin}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.cost * 100,
          product_data: {
            name: `TILT · ${input.handle}`,
            description: `Board bid ${input.handle} at $${input.bid.toLocaleString("en-US")}`,
          },
        },
      },
    ],
    metadata: {
      url: input.url,
      handle: input.handle,
      tagline: input.tagline.slice(0, 400),
      bid: String(input.bid),
      cost: String(input.cost),
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { id: session.id, url: session.url };
}
