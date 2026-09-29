import { ofetch } from "ofetch";
import { JSDOM } from "jsdom";
import crypto from "crypto";
import {
  BoughtTicketInfo,
  FALRealtimeTrip,
  FALRealtimeResponse,
  RawFALRealtimeTrip,
  FALScheduleSolution,
  FALStation,
  FALStationsResponse,
  FALWarning,
  TicketURLInfo,
  UserInfo,
  FALSessionTokenStoreResponse,
  FALSessionTokenCheckResponse,
  FALLoginResponse
} from "./types.js";

const BASE_URL = 'https://fal.ferrovieappulolucane.it/';
const NEW_API_BASE_URL = 'https://app.ferrovieappulolucane.it/api';
const ETICKET_API_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2capp';
const ETICKET_B2C_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2c';

function hashMD5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Session Manager to handle individual user sessions concurrently.
 */
export class FALSession {
  public readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Checks if this session token is currently authenticated.
   */
  async isLoggedIn(): Promise<boolean> {
    const res = await ofetch<FALSessionTokenCheckResponse>(`${NEW_API_BASE_URL}/sessionTokens/check`, {
      method: 'GET',
      query: { token: this.token },
      responseType: 'json',
    });

    return res.status === true && res.data?.authenticated === true;
  }

  /**
   * Logs in a user for this specific session.
   */
  async login(email: string, password: string): Promise<UserInfo> {
    const res = await ofetch<FALLoginResponse>(`${ETICKET_API_BASE_URL}//json/utente/login`, {
      method: 'GET',
      query: {
        token: this.token,
        username: email,
        password: hashMD5(password)
      },
      responseType: 'json'
    });

    if (res.operationCode !== 0 || !res.utente) {
      throw new Error(res.operationMessage || "Login failed");
    }

    return {
      responseCode: res.operationCode,
      firstname: res.utente.nome,
      surname: res.utente.cognome,
      birthdate: res.utente.datanascita,
      email: res.utente.email
    };
  }
}

export class FALClient {
  private async request<T>(urlArgs: string, options: any = {}): Promise<T> {
    return ofetch<T>('app_geotourist.php' + urlArgs, {
      baseURL: BASE_URL,
      ...options,
    });
  }

  /**
   * Creates a new isolated authentication session.
   */
  async createSession(): Promise<FALSession> {
    const res = await ofetch<FALSessionTokenStoreResponse>(`${NEW_API_BASE_URL}/sessionTokens/store`, {
      method: 'POST',
      responseType: 'json'
    });

    if (!res.status || !res.data?.token) {
      throw new Error("Failed to initialize session token");
    }

    return new FALSession(res.data.token);
  }

  private enrichRealtimeTrip(raw: RawFALRealtimeTrip): FALRealtimeTrip {
    const stops = raw.stopTimes || [];
    const passedStops = stops.filter(s => s.passed);
    const lastPassed = passedStops.length > 0 ? passedStops[passedStops.length - 1] : null;

    return {
      trip_id: raw.trip_id,
      trip_name: raw.trip_name,
      first_stop: stops[0]?.stop_name || '',
      last_stop: stops[stops.length - 1]?.stop_name || '',
      is_departed: passedStops.length > 0,
      current_delay: lastPassed ? lastPassed.delay : (stops[0]?.delay || 0),
      last_passed_stop: lastPassed ? lastPassed.stop_name : null,
      current_lat: lastPassed ? lastPassed.lat : null,
      current_lng: lastPassed ? lastPassed.lng : null,
      stopTimes: stops
    };
  }

  /**
   * Retrieves all available stations (both buses and trains)
   * To filter them, check the `services` array in the returned objects
   * (e.g. `services.includes("T")` for trains or `"B"` for buses).
   */
  async getStations(): Promise<FALStation[]> {
    const res = await ofetch<FALStationsResponse>(`${NEW_API_BASE_URL}/stations`, {
      method: 'GET',
      responseType: 'json'
    });
    return res.data?.sites || [];
  }

  /**
   * Get scheduled travel solutions between two stations
   * @param from Origin station code (e.g., "S02115")
   * @param to Destination station code (e.g., "S02110")
   * @param when Date of travel in "YYYY-MM-DD" format
   * @param time Time of travel in "HH:mm" format (defaults to "00:00")
   * @param service Transport service type, e.g., "T" for trains (defaults to "T")
   */
  async getSchedules(
    from: string,
    to: string,
    when: string,
    time: string = "00:00",
    service: string = "T"
  ): Promise<FALScheduleSolution[]> {
    return ofetch<FALScheduleSolution[]>(`${ETICKET_B2C_BASE_URL}/json/cerca/soluzioni/`, {
      method: 'GET',
      query: {
        from,
        to,
        when,
        time,
        service
      },
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
        warnings.push({ title: title.textContent || '', date: date?.textContent || '', link: link?.textContent || '' } );
      }
    });

    return warnings;
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
