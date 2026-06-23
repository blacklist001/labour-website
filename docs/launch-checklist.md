# LABOUR Launch Checklist

Use this before sharing the website publicly.

## Vercel

- Confirm the latest GitHub commit is deployed.
- Open the production URL and test the homepage.
- Add a custom domain if needed.
- Confirm HTTPS is active.
- Add the official support email or phone number when it is ready.

## Supabase Auth

- Add the Vercel production URL to Auth redirect URLs.
- Add localhost only for development.
- Turn email confirmation on for production.
- Test signup with a real email address.
- Test password reset with a real email address.

## Supabase Database

- Run the latest `database/schema.sql`.
- Confirm Row Level Security is enabled.
- Confirm services include Mechanic.
- Confirm an admin profile exists.
- Confirm no service role key is exposed in the frontend.

## Storage

- Confirm the `worker-photos` bucket exists.
- Upload a worker photo from the website.
- Confirm the photo appears on a public worker card.

## Admin

- Review pending workers.
- Approve at least one real worker.
- Reject a test worker.
- Confirm only verified workers appear publicly.

## Client Flow

- Create a client account.
- Search workers.
- Select a worker.
- Create a booking.
- Cancel a requested booking.

## Worker Flow

- Create a worker account.
- Save worker details.
- Accept a booking.
- Start a booking.
- Complete a booking.
- Decline a test booking.

## Reviews

- Submit a review for a completed job.
- Confirm rating average and rating count update.

## UI

- Test mobile.
- Test desktop.
- Test light mode.
- Test dark mode.
- Test the helper chatbot.
