export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  source?: 'google' | 'local';
}

export interface GoogleCalendarServiceState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  events: GoogleCalendarEvent[];
}

export interface ListEventsParams {
  maxResults?: number;
  timeMin?: string;
  timeMax?: string;
  calendarId?: string;
}

export interface CreateEventParams {
  summary: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  calendarId?: string;
}
