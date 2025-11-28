export interface FALStation {
    id: number;
    stazione: number;
    nome: string;
}

export interface FALRTBusTrip {
    id_documento: number;
    descrizione_documento: string;
    id_mezzo: number;
    nome_mezzo: string;
    tratta: string;
    expected_start_date: string;
    expected_end_date: string;
    start_date: string;
    end_date: string;
    State: number;
    LineCode: string;
}

export interface FALRTTrainTrip {
    numero_treno: string;
    stazioni: {
        prima_stazione: string;
        ultima_stazione: string;
        partenza_schedulata_corsa: string;
        arrivoSchedulatoUltimaStazione: string;
    };
}

export interface FALRTTrainTripInfo {
    numero_treno: string;
    stazioni: {
        stazione: number;
        nome: string;
        time_partenza_schedulato: string;
        time_partenza_effettivo: string;
        time_arrivo_schedulato: string;
        time_arrivo_effettivo: string;
        ritardo: number;
        soppressa: string;
        partita: boolean;
        lat: number;
        lon: number;
    }[];
}

export interface FALRTBusTripStation {
    id_fermata: number;
    nome: string;
    id_documento: number;
    id_tipo_fermata: number;
    descrizione: string;
    expected_passing_date: string;
    passing_date: string;
    entering_date: string;
    leaving_date: string;
    ordine: number;
    lat: number;
    lon: number;
    passata: boolean;
    ritardo: number;
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