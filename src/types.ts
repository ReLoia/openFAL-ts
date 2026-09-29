export interface FALStation {
  id: number;
  stazione: number;
  nome: string;
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

// The raw format returned by the new API
export interface RawFALRealtimeTrip {
  trip_id: string;
  trip_name: string;
  stopTimes: FALRealtimeStopTime[];
}

export interface FALRealtimeResponse {
  status: boolean;
  data: RawFALRealtimeTrip[];
}

// Enriched model to easily access the current status of the trip
export interface FALRealtimeTrip {
  trip_id: string;
  trip_name: string;

  // Enriched summary data (calculated from stopTimes)
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
