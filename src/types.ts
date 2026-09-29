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

export interface FALScheduleStop {
  id_tratta: number;
  id_stazione: number;
  time_arrivo: string;
  time_partenza: string | null;
  ordine: number;
  facoltativa: string;
  orario_indicativo: string;
  note: string;
  nome: string;
}

export interface FALScheduleTrip {
  id: number;
  id_tratta: number;
  numero: string;
  time_arrivo: string;
  time_partenza: string;
  note: string;
  fermate: FALScheduleStop[];
}

export interface FALScheduleRoute {
  id_percorso: number;
  tratte: FALScheduleTrip[];
}

export interface FALScheduleResult {
  percorsi: FALScheduleRoute[];
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
