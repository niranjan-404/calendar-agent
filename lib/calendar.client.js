// Client-side shim that proxies calendar operations to the server API (/api/calendar).
// This avoids importing server-only packages like `googleapis` into the browser bundle.

export async function createEvent(summary, startTime, endTime, attendees = [], timezone = 'Asia/Kolkata') {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      params: { summary, startTime, endTime, attendees, timezone }
    })
  });
  return res.json();
}

export async function listEvents(maxResults = 10) {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', params: { maxResults } })
  });
  return res.json();
}

export async function deleteEvent(eventId) {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', params: { eventId } })
  });
  return res.json();
}

export async function findEvent(summary, date) {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'find', params: { summary, date } })
  });
  return res.json();
}
