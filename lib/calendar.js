import { google } from 'googleapis';

// Read env vars more robustly: trim whitespace, strip accidental trailing commas,
// support GOOGLE_PRIVATE_KEY_B64 and restore escaped newlines
function getEnvVar(name) {
  let v = process.env[name];
  if (typeof v === 'string') {
    v = v.trim();
    // Remove one or more trailing commas and any trailing whitespace (some shells add commas)
    v = v.replace(/,+\s*$/, '');
    if (v === '') v = undefined;
  }
  return v;
}

let privateKey = getEnvVar('GOOGLE_PRIVATE_KEY');
if (!privateKey) {
  const b64 = getEnvVar('GOOGLE_PRIVATE_KEY_B64');
  if (b64) {
    try {
      privateKey = Buffer.from(b64, 'base64').toString('utf8');
    } catch (err) {
      console.error('Invalid base64 in GOOGLE_PRIVATE_KEY_B64');
      throw err;
    }
  }
}
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

const credentials = {
  type: getEnvVar('GOOGLE_TYPE'),
  project_id: getEnvVar('GOOGLE_PROJECT_ID'),
  private_key_id: getEnvVar('GOOGLE_PRIVATE_KEY_ID'),
  private_key: privateKey,
  client_email: getEnvVar('GOOGLE_CLIENT_EMAIL'),
  client_id: getEnvVar('GOOGLE_CLIENT_ID'),
  auth_uri: getEnvVar('GOOGLE_AUTH_URI'),
  token_uri: getEnvVar('GOOGLE_TOKEN_URI'),
  auth_provider_x509_cert_url: getEnvVar('GOOGLE_AUTH_PROVIDER_X509_CERT_URL'),
  client_x509_cert_url: getEnvVar('GOOGLE_CLIENT_X509_CERT_URL'),
  universe_domain: getEnvVar('GOOGLE_UNIVERSE_DOMAIN'),
};

const calendarId = (getEnvVar('CALENDAR_ID') || '');

// Validate required credentials up-front so we fail fast with clear messages
const REQUIRED_ENV = {
  client_email: credentials.client_email,
  private_key: credentials.private_key,
  calendar_id: calendarId,
};

const missing = Object.entries(REQUIRED_ENV)
  .filter(([_, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  const pretty = missing.join(', ');
  throw new Error(
    `Missing required Google Calendar environment variables or values: ${pretty}. ` +
      'Ensure `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (or `GOOGLE_PRIVATE_KEY_B64`), and `CALENDAR_ID` are set and have no trailing commas.'
  );
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

class CalendarService {
  constructor() {
    this.auth = auth;
    this.calendarId = calendarId;
  }

  getClient() {
    return google.calendar({
      version: 'v3',
      auth: this.auth,
    });
  }

  async createEvent(summary, startTime, endTime, attendees = [], timezone = 'Asia/Kolkata') {
    try {
      const calendar = this.getClient();

      const event = {
        summary,
        start: {
          dateTime: startTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endTime,
          timeZone: timezone,
        },
        attendees: (attendees || []).map(a => (typeof a === 'string' ? { email: a } : a)),
      };

      const response = await calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendUpdates: 'all',
      });

      return {
        success: true,
        eventId: response.data.id,
        summary: response.data.summary,
        link: response.data.htmlLink,
      };
    } catch (error) {
      console.error('Create event error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create event',
      };
    }
  }

  async listEvents(maxResults = 10) {
    try {
      const calendar = this.getClient();

      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      return {
        success: true,
        events: events.map(e => ({
          id: e.id,
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          description: e.description,
        })),
      };
    } catch (error) {
      console.error('List events error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to list events',
      };
    }
  }

  async deleteEvent(eventId) {
    try {
      const calendar = this.getClient();

      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      console.error('Delete event error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to delete event',
      };
    }
  }

  async findEvent(summary, date) {
    try {
      const calendar = this.getClient();

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
      });

      const event =
        response.data.items?.find(e =>
          e.summary?.toLowerCase().includes(summary.toLowerCase())
        ) || null;

      return { success: true, event };
    } catch (error) {
      console.error('Find event error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to find event',
      };
    }
  }
}


export const calendarService = new CalendarService();
