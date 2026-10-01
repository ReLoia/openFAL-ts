import { ofetch, $Fetch } from "ofetch";
import crypto from "crypto";
import {
  FALRealtimeTrip,
  FALRealtimeResponse,
  RawFALRealtimeTrip,
  FALScheduleSolution,
  FALStation,
  FALStationsResponse,
  UserInfo,
  FALSessionTokenStoreResponse,
  FALSessionTokenCheckResponse,
  FALLoginResponse,
  FALCartResponse,
  FALTicket,
  FALValidTicketsResponse,
  FALPayResponse
} from "./types.js";

const NEW_API_BASE_URL = 'https://app.ferrovieappulolucane.it/api';
const ETICKET_API_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2capp';
const ETICKET_B2C_BASE_URL = 'https://eticket.ferrovieappulolucane.it/b2c';

const hashMD5 = (input: string): string => crypto.createHash('md5').update(input).digest('hex');

export class FALSession {
  public readonly token: string;
  public email?: string;
  private readonly sessionFetch: $Fetch;

  constructor(token: string, baseFetch: $Fetch) {
    this.token = token;
    this.sessionFetch = baseFetch.create({
      query: { token }
    });
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const res = await this.sessionFetch<FALSessionTokenCheckResponse>(`${NEW_API_BASE_URL}/sessionTokens/check`);
      return res.status === true && res.data?.authenticated === true;
    } catch (error: any) {
      if (error.response?.status === 401) return false;
      throw error;
    }
  }

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

  async getBuyUrl(
    idArticolo: string,
    nominativo: string,
    datanascita: string,
    codiceFiscale: string = ""
  ): Promise<string> {
    const addSol = await this.sessionFetch<FALCartResponse>(`${ETICKET_API_BASE_URL}/json/carrello/aggiungiSoluzione`, {
      method: 'POST',
      body: new URLSearchParams({ idSoluzione: idArticolo, qta: "1" })
    });

    if (addSol.operationCode !== 0) {
      throw new Error(`Failed to add to cart: ${JSON.stringify(addSol.errors)}`);
    }

    await this.sessionFetch(`${ETICKET_API_BASE_URL}/json/carrello/conta`);

    const vedi = await this.sessionFetch<FALCartResponse>(`${ETICKET_API_BASE_URL}/json/carrello/vedi`);

    const payload = JSON.stringify([{ idArticolo: String(vedi.carrello.articoli[0].idArticolo), nominativo, codiceFiscale, datanascita }]);
    const body = new URLSearchParams({ parameters: payload });

    await this.sessionFetch(`${ETICKET_API_BASE_URL}/json/carrello/salva`, { method: 'POST', body });
    await this.sessionFetch(`${ETICKET_API_BASE_URL}/json/carrello/conta`);

    try {
      const payRes = await this.sessionFetch<FALPayResponse>(`${ETICKET_API_BASE_URL}/json/carrello/paga`, {
        method: 'POST',
        body
      });

      if (payRes.operationCode !== 0 || !payRes.urlPayment) {
        throw new Error(`Failed to generate payment URL: ${JSON.stringify(payRes.errors)}`);
      }

      return payRes.urlPayment;
    } catch (e: any) {
      throw new Error("Payment endpoint failed or is down.");
    }
  }

  async getValidTickets(): Promise<FALTicket[]> {
    const res = await this.sessionFetch<FALValidTicketsResponse>(`${NEW_API_BASE_URL}/tickets/valid`);
    return res.data || [];
  }
}

export class FALClient {
  private readonly baseFetch: $Fetch = ofetch;

  async createSession(): Promise<FALSession> {
    const res = await this.baseFetch<FALSessionTokenStoreResponse>(`${NEW_API_BASE_URL}/sessionTokens/store`, { method: 'POST' });
    if (!res.status || !res.data?.token) throw new Error("Failed to initialize session token");
    return new FALSession(res.data.token, this.baseFetch);
  }

  private enrichRealtimeTrip(raw: RawFALRealtimeTrip): FALRealtimeTrip {
    const stops = raw.stopTimes || [];
    const passedStops = stops.filter(s => s.passed);
    const lastPassed = passedStops.at(-1) || null;
    const firstStop = stops[0];

    return {
      trip_id: raw.trip_id,
      trip_name: raw.trip_name,
      first_stop: firstStop?.stop_name || '',
      last_stop: stops.at(-1)?.stop_name || '',
      is_departed: passedStops.length > 0,
      current_delay: lastPassed?.delay ?? (firstStop?.delay || 0),
      last_passed_stop: lastPassed?.stop_name ?? null,
      current_lat: lastPassed?.lat ?? null,
      current_lng: lastPassed?.lng ?? null,
      stopTimes: stops
    };
  }

  async getStations(): Promise<FALStation[]> {
    const res = await this.baseFetch<FALStationsResponse>(`${NEW_API_BASE_URL}/stations`);
    return res.data?.sites || [];
  }

  async getSchedules(
    from: string,
    to: string,
    when: string,
    time: string = "00:00",
    service: string = "T"
  ): Promise<FALScheduleSolution[]> {
    return this.baseFetch<FALScheduleSolution[]>(`${ETICKET_B2C_BASE_URL}/json/cerca/soluzioni/`, {
      query: { from, to, when, time, service }
    });
  }

  private async getRawRealtimeTrips(type: 'trains' | 'buses'): Promise<RawFALRealtimeTrip[]> {
    const res = await this.baseFetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/${type}`, { method: 'POST' });
    return res.data || [];
  }

  async getRTTrainTrips(): Promise<FALRealtimeTrip[]> {
    const raw = await this.getRawRealtimeTrips('trains');
    return raw.map(t => this.enrichRealtimeTrip(t));
  }

  async getRTBusTrips(): Promise<FALRealtimeTrip[]> {
    const raw = await this.getRawRealtimeTrips('buses');
    return raw.map(t => this.enrichRealtimeTrip(t));
  }

  private async getRTInfo(type: 'trains' | 'buses', targetId: string): Promise<FALRealtimeTrip | null> {
    const rawTrips = await this.getRawRealtimeTrips(type);
    const target = rawTrips.find(t => t.trip_id === targetId || t.trip_name === targetId);
    return target ? this.enrichRealtimeTrip(target) : null;
  }

  async getRTTrainInfo(trainNumber: string | number): Promise<FALRealtimeTrip | null> {
    return this.getRTInfo('trains', String(trainNumber));
  }

  async getRTBusInfo(busId: string | number): Promise<FALRealtimeTrip | null> {
    return this.getRTInfo('buses', String(busId));
  }

  async getWarnings(limit: number = 5, offset: number = 0, language: string = "en"): Promise<any[]> {
    const res = await this.baseFetch<any>(`${NEW_API_BASE_URL}/news`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        language,
        limit: String(limit),
        offset: String(offset)
      })
    });

    return res.data || [];
  }
}
