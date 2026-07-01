# LABOUR Testing Checklist

Use this checklist on the live Vercel site after each deployment.

## Account

- Create a client account.
- Create a worker account.
- Confirm new accounts receive email confirmation and can use Resend Confirmation.
- Log out and log back in.
- Use Reset Password with a real email address.
- Open the password reset email, return to the site, and set a new password.
- Edit profile name, phone, and language.

## Worker Profile

- Log in as a worker.
- Save worker details with service, location, experience, price, working hours, and bio.
- Set worker availability and emergency job readiness.
- Upload a work photo.
- Confirm the worker appears in Supabase `worker_profiles`.
- Confirm the photo appears in Supabase Storage `worker-photos`.

## Admin

- Set one account role to `admin` in Supabase `profiles`.
- Log in as admin.
- Open the Admin section.
- Filter Pending, Verified, Rejected, and All workers.
- Reject a worker.
- Set a worker back to Verified if needed.

## Client Booking

- Log in as a client.
- Search by service across Home & Repair, Automotive, Cleaning, Moving, Farm, Garden, Technical, Domestic, and Construction categories.
- Select an available worker.
- Confirm domestic care bookings show and require the safety acknowledgement.
- Submit a booking with phone, location, preferred time, and job details.
- Confirm the booking appears in Supabase `bookings`.

## Payments

- Open `https://your-vercel-domain.vercel.app/api/payment-health` and confirm `ok` is `true`.
- Create a booking with Cash and confirm the job shows payment status `Unpaid`.
- Click Mark Paid on the cash booking and confirm payment status changes to `Paid`.
- Create a booking with M-Pesa and confirm the phone receives an STK Push.
- Complete the M-Pesa prompt on the phone.
- Confirm the job changes to payment status `Paid` and shows an M-Pesa reference.
- Confirm Supabase `bookings` has `checkout_request_id`, `payment_reference`, and `mpesa_result_description`.

## Jobs

- Log in as the client and confirm the booking appears in My Jobs.
- Log in as the worker and confirm the assigned booking appears in My Jobs.
- As worker, Accept the job.
- As worker, Start the job.
- As worker, Complete the job.
- As client, create another booking and Cancel it.
- As worker, create another booking flow and Decline it.

## Reviews

- After a job is completed, log in as the client.
- Submit a review and rating.
- Confirm a row appears in Supabase `reviews`.
- Confirm `worker_profiles.rating_average` and `rating_count` update.

## UI

- Test on mobile width.
- Test on desktop width.
- Toggle Dark and Light mode.
- Open the Help chatbot and ask about booking, worker signup, admin, password, jobs, and reviews.

## Supabase Production Settings

- Add your Vercel URL to Supabase Auth redirect URLs.
- Keep email confirmation on for production.
- Keep the service role key private.
- Confirm Row Level Security is enabled on all public tables.
- Run the latest `database/schema.sql` after every database-related code change.
