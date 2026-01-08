import { google } from 'googleapis';

export class CalendarService {
  constructor() {
    this.credentials = {
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'): undefined,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
    };
    this.calendarId = process.env.CALENDAR_ID;
    console.log('CalendarService initialized with calendarId:', this.credentials);
  }
  

getClient() {
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
  }

async createEvent(summary, startTime, endTime, attendees = [], timezone = 'Asia/Kolkata') {
    try {
        const calendar = this.getClient();
        
        const event = {
        summary,
        start: { dateTime: startTime, timeZone: timezone },
        end: { dateTime: endTime, timeZone: timezone },
        attendees: attendees.map(email => ({ email })),
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
        link: response.data.htmlLink
        };
    } catch (error) {
        console.error('Create event error:', error);
        return { success: false, error: error.message };
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
          start: e.start.dateTime || e.start.date,
          end: e.end.dateTime || e.end.date,
          description: e.description
        }))
      };
    } catch (error) {
      console.error('List events error:', error);
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
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

      const event = response.data.items?.find(e => 
        e.summary?.toLowerCase().includes(summary.toLowerCase())
      );
      
      return { success: true, event: event || null };
    } catch (error) {
      console.error('Find event error:', error);
      return { success: false, error: error.message };
    }
  }
}