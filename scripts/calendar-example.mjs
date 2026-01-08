/*
 Example: server-side script that uses `calendarService` directly.

 Usage:
  - Ensure these environment variables are set (for development use a test calendar):
      - GOOGLE_CLIENT_EMAIL
      - GOOGLE_PRIVATE_KEY (preserve newlines or use literal '\n' sequences)
      - CALENDAR_ID
  - Run this script with Node (node v14+ recommended):
      node scripts/calendar-example.mjs

 Windows (PowerShell example):
   $env:GOOGLE_CLIENT_EMAIL = "..."
   $env:GOOGLE_PRIVATE_KEY = "-----BEGIN...\n...\n-----END..."
   $env:CALENDAR_ID = "your-calendar-id@group.calendar.google.com"
   node .\scripts\calendar-example.mjs

 IMPORTANT: This will create and delete a real event in your calendar. Use a test calendar for development.
*/

import { calendarService } from '../lib/calendar.js';

if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.CALENDAR_ID) {
  console.error('\nERROR: Missing required environment variables.\nPlease set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY and CALENDAR_ID before running.\n');
  process.exit(1);
}

async function run() {
  console.log('\n== Calendar Service Example ==\n');

  console.log('1) Listing next 5 events...');
  const listRes = await calendarService.listEvents(5);
  console.log('List result:', JSON.stringify(listRes, null, 2));

  console.log('\n2) Creating test event (1 hour from now)...');
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const createRes = await calendarService.createEvent(
    'Example Script Test Event',
    startISO,
    endISO,
    [], // attendees
    timezone
  );
  console.log('Create result:', JSON.stringify(createRes, null, 2));

  if (createRes.success && createRes.eventId) {
    console.log('\n3) Finding the created event by summary and date...');
    const date = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const findRes = await calendarService.findEvent('Example Script Test Event', date);
    console.log('Find result:', JSON.stringify(findRes, null, 2));

    console.log('\n4) Deleting the created event...');
    const delRes = await calendarService.deleteEvent(createRes.eventId);
    console.log('Delete result:', JSON.stringify(delRes, null, 2));
  } else {
    console.warn('Create failed; skipping find & delete.');
  }

  console.log('\n== Done ==\n');
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
