import { ofetch } from "ofetch";
import { JSDOM } from "jsdom";
import crypto from "crypto";
import {
  BoughtTicketInfo,
  FALRealtimeTrip,
  FALRealtimeResponse,
  RawFALRealtimeTrip,
  FALScheduleResult,
  FALStation,
  FALWarning,
  TicketURLInfo,
  UserInfo
} from "./types.js";

const BASE_URL = 'https://fal.ferrovieappulolucane.it/';
const NEW_API_BASE_URL = 'https://app.ferrovieappulolucane.it/api/';

function hashMD5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export class FALClient {
  private async request<T>(urlArgs: string, options: any = {}): Promise<T> {
    return ofetch<T>('app_geotourist.php' + urlArgs, {
      baseURL: BASE_URL,
      ...options,
    });
  }

  /**
   * Helper function to map raw API responses into an enriched Trip object
   * with easy access to current delay, location, and trip boundaries.
   */
  private enrichRealtimeTrip(raw: RawFALRealtimeTrip): FALRealtimeTrip {
    const stops = raw.stopTimes || [];

    const passedStops = stops.filter(s => s.passed);
    const lastPassed = passedStops.length > 0 ? passedStops[passedStops.length - 1] : null;

    return {
      trip_id: raw.trip_id,
      trip_name: raw.trip_name,
      first_stop: stops[0]?.stop_name || '',
      last_stop: stops[stops.length - 1]?.stop_name || '',

      // If it hasn't passed any stops, it hasn't departed.
      // If it hasn't departed, use the predicted delay of the first stop (or 0).
      is_departed: passedStops.length > 0,
      current_delay: lastPassed ? lastPassed.delay : (stops[0]?.delay || 0),
      last_passed_stop: lastPassed ? lastPassed.stop_name : null,
      current_lat: lastPassed ? lastPassed.lat : null,
      current_lng: lastPassed ? lastPassed.lng : null,

      stopTimes: stops
    };
  }

  async getTrainStations(): Promise<FALStation[]> {
    return this.request<FALStation[]>('?action=22&isTreno=true', {
      method: 'GET',
      responseType: 'json'
    });
  }

  async getBusStations(): Promise<FALStation[]> {
    return this.request<FALStation[]>('?action=22&isTreno=false', {
      method: 'GET',
      responseType: 'json'
    });
  }

  async getSchedules(from: string | number, to: string | number, date: Date): Promise<FALScheduleResult> {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    return this.request<FALScheduleResult>(`?action=21&idstart=${from}&idstop=${to}&date=${dateStr}&isSingleTicket=true`, {
      method: 'GET',
      responseType: 'json'
    });
  }

  async getRTTrainTrips(): Promise<FALRealtimeTrip[]> {
    const res = await ofetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/trains`, {
      method: 'POST',
      responseType: 'json'
    });
    return (res.data || []).map(this.enrichRealtimeTrip);
  }

  async getRTBusTrips(): Promise<FALRealtimeTrip[]> {
    const res = await ofetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/buses`, {
      method: 'POST',
      responseType: 'json',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'transport=3'
    });
    return (res.data || []).map(this.enrichRealtimeTrip);
  }

  async getRTTrainInfo(trainNumber: string): Promise<FALRealtimeTrip | null> {
    const trips = await this.getRTTrainTrips();
    return trips.find(t => t.trip_id === trainNumber || t.trip_name === trainNumber) || null;
  }

  async getRTBusInfo(busId: string | number): Promise<FALRealtimeTrip | null> {
    const trips = await this.getRTBusTrips();
    const targetId = String(busId);
    return trips.find(t => t.trip_id === targetId || t.trip_name === targetId) || null;
  }

  async getWarnings(): Promise<FALWarning[]> {
    const res = await this.request<string>('?action=52', {
      method: 'GET',
      responseType: 'text'
    });

    const dom = new JSDOM(res, { contentType: "text/xml" });
    const items = dom.window.document.querySelectorAll('item');
    const warnings: FALWarning[] = [];

    items.forEach((item: any) => {
      const title = item.querySelector('title');
      const date = item.querySelector('pubDate');
      const link = item.querySelector('link');
      if (title) {
        warnings.push({ title: title.textContent || '', date: date?.textContent || '', link: link?.textContent || '' });
      }
    });

    return warnings;
  }

  async login(email: string, password: string): Promise<UserInfo> {
    return await this.request<UserInfo>('?action=37', {
      method: 'POST',
      responseType: 'json',
      body: {
        email,
        password: hashMD5(password)
      }
    })
  }

  async getUserTickets(email: string, password: string): Promise<BoughtTicketInfo[]> {
    return await this.request<BoughtTicketInfo[]>('?action=40', {
      method: 'POST',
      responseType: 'json',
      body: {
        email,
        password: hashMD5(password)
      }
    })
  }

  async genTicketURL(
    idstart: string | number,
    idstop: string | number,
    date: Date,
    name: string,
    birthdate: string,
    email: string,
    password: string
  ): Promise<TicketURLInfo> {
    return await this.request<TicketURLInfo>('?action=53', {
      method: 'POST',
      responseType: 'json',
      body: {
        idstart,
        idstop,
        date: date.toISOString().split('T')[0].replace(/-/g, ''),
        name,
        birthdate,
        email,
        password: hashMD5(password),
        ticket_type: "3",
        treno_plus_bus: "false"
      }
    })
  }
}
