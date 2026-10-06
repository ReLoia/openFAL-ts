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
  FALPayResponse,
  FALScheduleSolutionDetail,
  FALWarning
} from "./types.js";

const NEW_API_BASE_URL = "https://app.ferrovieappulolucane.it/api";
const ETICKET_API_BASE_URL = "https://eticket.ferrovieappulolucane.it/b2capp";
const ETICKET_B2C_BASE_URL = "https://eticket.ferrovieappulolucane.it/b2c";

const hashMD5 = (input: string): string => crypto.createHash("md5").update(input).digest("hex");

const getStatus = (error: any): number | undefined =>
  error?.response?.status ?? error?.status ?? error?.statusCode;

async function emptyOn500<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error: any) {
    if (getStatus(error) === 500) return fallback;
    throw error;
  }
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export class FALSession {
  public email?: string;
  public readonly sessionFetch: $Fetch;

  constructor(public readonly token: string, baseFetch: $Fetch) {
    this.sessionFetch = baseFetch.create({ query: { token } });
    this.login().catch(() => {
    });
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const res = await this.sessionFetch<FALSessionTokenCheckResponse>(`${NEW_API_BASE_URL}/sessionTokens/check`);
      return res.status === true && res.data?.authenticated === true;
    } catch (error: any) {
      const status = getStatus(error);
      // 401 = not authenticated, 500 = empty body -> not logged in
      if (status === 401 || status === 500) return false;
      throw error;
    }
  }

  async login(email?: string, password?: string): Promise<UserInfo> {
    const query = email && password ? { username: email, password: hashMD5(password) } : {};

    const res = await this.sessionFetch<FALLoginResponse>(`${ETICKET_API_BASE_URL}/json/utente/login`, { query });

    if (res.operationCode !== 0 || !res.utente) {
      throw new Error(res.operationMessage || "Login failed");
    }

    const u = res.utente;
    this.email = u.email;

    return {
      responseCode: res.operationCode,
      firstname: u.nome,
      surname: u.cognome,
      birthdate: u.datanascita,
      email: u.email
    };
  }

  async getBuyUrl(
    idArticolo: string,
    nominativo: string,
    datanascita: string,
    codiceFiscale: string = ""
  ): Promise<string> {
    const cart = (path: string, options?: object) =>
      this.sessionFetch<any>(`${ETICKET_API_BASE_URL}/json/carrello/${path}`, options);

    const addSol = await cart("aggiungiSoluzione", {
      method: "POST",
      body: new URLSearchParams({ idSoluzione: idArticolo, qta: "1" })
    }) as FALCartResponse;

    if (addSol.operationCode !== 0) {
      throw new Error(`Failed to add to cart: ${JSON.stringify(addSol.errors)}`);
    }

    await cart("conta");

    const vedi = await cart("vedi") as FALCartResponse;
    const body = new URLSearchParams({
      parameters: JSON.stringify([{
        idArticolo: String(vedi.carrello.articoli[0].idArticolo),
        nominativo,
        codiceFiscale,
        datanascita
      }])
    });

    await cart("salva", { method: "POST", body });
    await cart("conta");

    let payRes: FALPayResponse;
    try {
      payRes = await cart("paga", { method: "POST", body });
    } catch {
      throw new Error("Payment endpoint failed or is down.");
    }

    if (payRes.operationCode !== 0 || !payRes.urlPayment) {
      throw new Error(`Failed to generate payment URL: ${JSON.stringify(payRes.errors)}`);
    }

    return payRes.urlPayment;
  }

  async getValidTickets(): Promise<FALTicket[]> {
    const res = await emptyOn500(
      () => this.sessionFetch<FALValidTicketsResponse>(`${NEW_API_BASE_URL}/tickets/valid`),
      {} as FALValidTicketsResponse
    );
    return asArray<FALTicket>(res?.data);
  }
}

export class FALClient {
  private readonly baseFetch: $Fetch = ofetch;

  async createSession(token?: string): Promise<FALSession> {
    if (token) return new FALSession(token, this.baseFetch);

    const res = await this.baseFetch<FALSessionTokenStoreResponse>(`${NEW_API_BASE_URL}/sessionTokens/store`, { method: "POST" });
    if (!res.status || !res.data?.token) throw new Error("Failed to initialize session token");
    return new FALSession(res.data.token, this.baseFetch);
  }

  private enrichRealtimeTrip(raw: RawFALRealtimeTrip): FALRealtimeTrip {
    const stops = raw.stopTimes || [];
    const passed = stops.filter(s => s.passed);
    const lastPassed = passed.at(-1) ?? null;
    const first = stops[0];

    return {
      trip_id: raw.trip_id,
      trip_name: raw.trip_name,
      first_stop: first?.stop_name || "",
      last_stop: stops.at(-1)?.stop_name || "",
      is_departed: passed.length > 0,
      current_delay: lastPassed?.delay ?? (first?.delay || 0),
      last_passed_stop: lastPassed?.stop_name ?? null,
      current_lat: lastPassed?.lat ?? null,
      current_lng: lastPassed?.lng ?? null,
      stopTimes: stops
    };
  }

  async getStations(): Promise<FALStation[]> {
    const res = await emptyOn500(
      () => this.baseFetch<FALStationsResponse>(`${NEW_API_BASE_URL}/stations`),
      {} as FALStationsResponse
    );
    return asArray<FALStation>(res?.data?.sites);
  }

  async getSchedules(
    from: string,
    to: string,
    when: string,
    time: string = "00:00",
    service: string = "T"
  ): Promise<{ result: FALScheduleSolution[]; session: string }> {
    const session = await this.createSession();

    const raw = await emptyOn500(
      () => session.sessionFetch<FALScheduleSolution[]>(
        `${ETICKET_B2C_BASE_URL}/json/cerca/soluzioni/`,
        { query: { from, to, when, time, service } }
      ),
      [] as FALScheduleSolution[]
    );

    return { result: asArray<FALScheduleSolution>(raw), session: session.token };
  }

  async getScheduleInfo(solutionId: string | number, session: string): Promise<FALScheduleSolutionDetail | null> {
    const res = await emptyOn500<FALScheduleSolutionDetail | null>(
      () => this.baseFetch<FALScheduleSolutionDetail>(
        `${ETICKET_B2C_BASE_URL}/json/soluzioni/id/${solutionId}`,
        { query: { token: session } }
      ),
      null
    );

    return res && Object.keys(res).length > 0 ? res : null;
  }

  private async getRTTrips(type: "trains" | "buses"): Promise<FALRealtimeTrip[]> {
    const res = await emptyOn500(
      () => this.baseFetch<FALRealtimeResponse>(`${NEW_API_BASE_URL}/realtime/${type}`, { method: "POST" }),
      {} as FALRealtimeResponse
    );
    return asArray<RawFALRealtimeTrip>(res?.data).map(t => this.enrichRealtimeTrip(t));
  }

  private async getRTInfo(type: "trains" | "buses", id: string | number): Promise<FALRealtimeTrip | null> {
    const target = String(id);
    const trips = await this.getRTTrips(type);
    return trips.find(t => t.trip_id === target || t.trip_name === target) ?? null;
  }

  getRTTrainTrips = () => this.getRTTrips("trains");
  getRTBusTrips = () => this.getRTTrips("buses");
  getRTTrainInfo = (trainNumber: string | number) => this.getRTInfo("trains", trainNumber);
  getRTBusInfo = (busId: string | number) => this.getRTInfo("buses", busId);

  async getWarnings(limit: number = 5, offset: number = 0, language: string = "it"): Promise<FALWarning[]> {
    const res = await emptyOn500<any>(
      () => this.baseFetch<any>(`${NEW_API_BASE_URL}/news`, {
        method: "POST",
        body: new URLSearchParams({ language, limit: String(limit), offset: String(offset) })
      }),
      {}
    );

    return asArray<any>(res?.data);
  }
}
