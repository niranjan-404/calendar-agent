import { NextResponse } from 'next/server';
import { CalendarService } from '@/lib/calendar';

const calendar = new CalendarService();

export async function POST(request) {
  try {
    const { action, params } = await request.json();
    
    console.log('Calendar API called:', action, params);
    
    let result;
    
    switch (action) {
      case 'create':
        result = await calendar.createEvent(
          params.summary,
          params.startTime,
          params.endTime,
          params.attendees,
          params.timezone
        );
        break;
        
      case 'list':
        result = await calendar.listEvents(params.maxResults || 10);
        break;
        
      case 'delete':
        result = await calendar.deleteEvent(params.eventId);
        break;
        
      case 'find':
        result = await calendar.findEvent(params.summary, params.date);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
