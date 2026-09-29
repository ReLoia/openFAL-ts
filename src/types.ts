// Updated station interface to match the new API structure
export interface FALStation {
  codSite: string;
  operators: string[];
  name: string;
  lon: number;
  lat: number;
  services: string[]; // e.g. ["T"] for trains, ["B"] for buses
}

export interface FALStationsResponse {
  status: boolean;
  data: {
    operationCode: number;
    operationMessage: string;
    sites: FALStation[];
    processTime: number;
    elapsedTime: number;
  }
}

export interface FALRealtimeStopTime {
  stop_name: string;
  headsign: string;
  arrival_time: string;
  departure_time: string;
  delay: number;
  passed: boolean;
  lat: number;
  lng: number;
}

export interface RawFALRealtimeTrip {
  trip_id: string;
  trip_name: string;
  stopTimes: FALRealtimeStopTime[];
}

export interface FALRealtimeResponse {
  status: boolean;
  data: RawFALRealtimeTrip[];
}

export interface FALRealtimeTrip {
  trip_id: string;
  trip_name: string;
  first_stop: string;
  last_stop: string;
  is_departed: boolean;
  current_delay: number;
  last_passed_stop: string | null;
  current_lat: number | null;
  current_lng: number | null;
  stopTimes: FALRealtimeStopTime[];
}

export interface FALWarning {
  title: string;
  link: string;
  date: string;
}

export interface FALScheduleSolution {
  timeA: string;
  conBus: boolean;
  gestori: number;
  tratte: number;
  nomeA: string;
  durataSecondi: number;
  conServizioSostitutivo: boolean;
  tipologiaServizio: number;
  descrizione: string;
  elencoCorse: string[];
  conTreno: boolean;
  nomeP: string;
  cambi: number;
  timeP: string;
  idSoluzione: number;
  prezzo: number;
}

export interface UserInfo {
  responseCode: number;
  firstname: string;
  surname: string;
  birthdate: string;
  email: string;
}

export interface BoughtTicketInfo {
  numTicket: string;
  numVendita: string;
  stazioneFermataStart: string;
  stazioneFermataStop: string;
  type: string;
  transport: string;
  price: number;
  name: string;
  birthdate: string;
  validStart: string;
  validEnd: string;
  pnr: string;
  qrcode: string;
}

export interface TicketURLInfo {
  responseCode: number;
  numVendita: string;
  urlPayment: string;
}

export interface FALSessionTokenStoreResponse {
  status: boolean;
  message: string | null;
  data: {
    token: string;
  } | null;
}

export interface FALSessionTokenCheckResponse {
  status: boolean;
  message: string | null;
  data: {
    authenticated: boolean;
  } | null;
}

export interface FALLoginResponse {
  utente?: {
    localita: string;
    cognome: string;
    nome: string;
    language: string;
    login: string;
    telefonoFisso: string;
    codiceFiscale: string;
    tessere: any[];
    cap: string;
    partitaIva: string;
    nazione: string;
    datanascita: string;
    email: string;
  };
  operationCode: number;
  operationMessage: string;
  operationMessageInternal: string;
  processTime: number;
  elapsedTime: number;
}
