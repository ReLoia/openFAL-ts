import { ofetch } from "ofetch";
import { JSDOM } from "jsdom";
import crypto from "crypto";
import {
  FALRealtimeTrip,
  FALRealtimeResponse,
  RawFALRealtimeTrip,
  FALScheduleSolution,
  FALStation,
  FALStationsResponse,
  FALWarning,
  UserInfo,
  FALSessionTokenStoreResponse,
  FALSessionTokenCheckResponse,
  FALLoginResponse,
  FALCartResponse,
  FALTicket,
  FALValidTicketsResponse
} from "./types.js";

const BASE_URL = 'https://fal.ferrovieappulolucane.it/';
const NEW_API_BASE_URL = 'https://app.ferrovieappulolucane.it/api';
const ETICKET_API_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2capp';
const ETICKET_B2C_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2c';

const hashMD5 = (input: string): string => crypto.createHash('md5').update(input).digest('hex');

/**
 * Session Manager to handle individual user sessions concurrently.
 */
export class FALSession {
  public readonly token: string;
  public email?: string;

  private readonly sessionFetch: typeof ofetch;

  constructor(token: string) {
    this.token = token;
    this.sessionFetch = ofetch.create({ query: { token } });
  }

  /** Checks if this session token is currently authenticated. */
  async isLoggedIn(): Promise<boolean> {
    const res = await this.sessionFetch<FALSessionTokenCheckResponse>(`${NEW_API_BASE_URL}/sessionTokens/check`);
    return res.status === true && res.data?.authenticated === true;
  }

  /** Logs in a user for this specific session. */
  async login(email: string, password: string): Promise<UserInfo> {
    const res = await this.sessionFetch<FALLoginResponse>(`${ETICKET_API_BASE_URL}/json/utente/login`, {
      query: { username: email, password: hashMD5(password) }
    });

    if (res.operationCode !== 0 || !res.utente) {
      throw new Error(res.operationMessage || "Login failed");
    }

    this.email = res.utente.email;

    return {
      responseCode: res.operationCode,
      firstname: res.utente.nome,
      surname: res.utente.cognome,
      birthdate: res.utente.datanascita,
      email: res.utente.email
    };
  }

  /** Generates a payment URL to buy a ticket (saves to cart, then initiates checkout) */
  async getBuyUrl(
    idArticolo: string | number,
    nominativo: string,
    datanascita: string,
    codiceFiscale: string = ""
  ): Promise<string> {
    const payload = JSON.stringify([{ idArticolo: String(idArticolo), nominativo, codiceFiscale, datanascita }]);
    const body = new URLSearchParams({ parameters: payload });

    const saveRes = await this.sessionFetch<FALCartResponse>(`${ETICKET_API_BASE_URL}/json/carrello/salva`, {
      method: 'POST',
      body
    });
    if (saveRes.operationCode !== 0) throw new Error(`Failed to save to cart: ${JSON.stringify(saveRes.errors)}`);
    
    const payRes = await this.sessionFetch<FALCartResponse>(`${ETICKET_API_BASE_URL}/json/carrello/paga`, {
      method: 'POST',
      body
    });
    if (payRes.operationCode !== 0 || !payRes.urlPayment) throw new Error(`Failed to generate payment URL: ${JSON.stringify(payRes.errors)}`);

    return payRes.urlPayment;
  }

  /** Retrieves all currently valid purchased tickets for the logged-in user. */
  async getValidTickets(): Promise<FALTicket[]> {
    const res = await this.sessionFetch<FALValidTicketsResponse>(`${NEW_API_BASE_URL}/tickets/valid`);
    return res.data || [];
  }
}

export class FALClient {
  /** Creates a new isolated authentication session. */
  async createSession(): Promise<FALSession> {
    const res = await ofetch<FALSessionTokenStoreResponse>(`${NEW_API_BASE_URL}/sessionTokens/store`, { method: 'POST' });
    if (!res.status || !res.data?.token) throw new Error("Failed to initialize session token");
    return new FALSession(res.data.token);
  }

  private enrichRealtimeTrip(raw: RawFALRealtimeTrip): FALRealtimeTrip {
    const stops = raw.stopTimes || [];
    const passedStops = stops.filter(s => s.passed);
    const lastPassed = passedStops.at(-1) || null;

    return {
      trip_id: raw.trip_id,
      trip_name: raw.trip_name,
      first_stop: stops[0]?.stop_name || '',
      last_stop: stops.at(-1)?.stop_name || '',
      is_departed: passedStops.length > 0,
      current_delay: lastPassed?.delay ?? (stops[0]?.delay || 0),
      last_passed_stop: lastPassed?.stop_name ?? null,
      current_lat: lastPassed?.lat ?? null,
      current_lng: lastPassed?.lng ?? null,
      stopTimes: stops
    };
  }

  /** Retrieves all available stations (both buses and trains) */
  async getStations(): Promise<FALStation[]> {
    const res = await ofetch<FALStationsResponse>(`${NEW_API_BASE_URL}/stations`);
    return res.data?.sites || [];
  }

  /** Get scheduled travel solutions between two stations */
  async getSchedules(
    from: string,
    to: string,
    when: string,
    time: string = "00:00",
    service: string = "T"
  ): Promise<FALScheduleSolution[]> {
    return ofetch<FALScheduleSolution[]>(`${ETICKET_B2C_BASE_URL}/json/cerca/soluzioni/`, {
      query: { from, to, when, time, service }
    });
  }

  async getRTTrainTrips(): Promise<FALRealtimeTrip[]> {
    const res = await ofetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/trains`, { method: 'POST' });
    return (res.data || []).map(this.enrichRealtimeTrip);
  }

  async getRTBusTrips(): Promise<FALRealtimeTrip[]> {
    const res = await ofetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'transport=3'
    });
    return (res.data || []).map(this.enrichRealtimeTrip);
  }

  private async getRTInfo(fetcher: () => Promise<FALRealtimeTrip[]>, targetId: string): Promise<FALRealtimeTrip | null> {
    const trips = await fetcher();
    return trips.find(t => t.trip_id === targetId || t.trip_name === targetId) || null;
  }

  async getRTTrainInfo(trainNumber: string): Promise<FALRealtimeTrip | null> {
    return this.getRTInfo(() => this.getRTTrainTrips(), String(trainNumber));
  }

  async getRTBusInfo(busId: string | number): Promise<FALRealtimeTrip | null> {
    return this.getRTInfo(() => this.getRTBusTrips(), String(busId));
  }

  async getWarnings(): Promise<FALWarning[]> {
    const res = await ofetch<string>(`${BASE_URL}app_geotourist.php?action=52`);
    const dom = new JSDOM(res, { contentType: "text/xml" });

    return Array.from(dom.window.document.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      date: item.querySelector('pubDate')?.textContent || '',
      link: item.querySelector('link')?.textContent || ''
    }));
  }
}
