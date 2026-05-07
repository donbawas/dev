import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type EmailAddress = { email_address: string; id: string };

type ClerkUserPayload = {
  id: string;
  email_addresses: EmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

type WebhookEvent =
  | { type: 'user.created'; data: ClerkUserPayload }
  | { type: 'user.updated'; data: ClerkUserPayload }
  | { type: 'user.deleted'; data: { id: string } };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let event: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'user.created': {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
        event.data;
      const primary = email_addresses.find((e) => e.id === primary_email_address_id);
      const email = primary?.email_address ?? email_addresses[0]?.email_address ?? '';
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      await sql`
        INSERT INTO users (clerk_id, email, name, avatar_url)
        VALUES (${id}, ${email}, ${name}, ${image_url})
        ON CONFLICT (clerk_id) DO NOTHING
      `;
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
        event.data;
      const primary = email_addresses.find((e) => e.id === primary_email_address_id);
      const email = primary?.email_address ?? email_addresses[0]?.email_address ?? '';
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      await sql`
        UPDATE users
        SET email = ${email}, name = ${name}, avatar_url = ${image_url}, updated_at = NOW()
        WHERE clerk_id = ${id}
      `;
      break;
    }

    case 'user.deleted': {
      await sql`DELETE FROM users WHERE clerk_id = ${event.data.id}`;
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
