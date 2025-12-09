import { ofetch } from "ofetch";
import { JSDOM } from "jsdom";
import crypto from "crypto";
import {
  BoughtTicketInfo,
  FALRTBusTrip,
  FALRTBusTripStation,
  FALRTTrainTrip,
  FALRTTrainTripInfo,
  FALScheduleResult,
  FALStation,
  FALWarning, TicketURLInfo,
  UserInfo
} from "./types.js";

const BASE_URL = 'https://fal.ferrovieappulolucane.it/';

function hashMD5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Action:
 * 40 - get my tickets
 * 
 */
export class FALClient {
  private async request<T>(urlArgs: string, options: any = {}): Promise<T> {
    return ofetch<T>('app_geotourist.php' + urlArgs, {
      baseURL: BASE_URL,
      ...options,
    });
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
  
  async getRTTrainTrips(): Promise<FALRTTrainTrip[]> {
    return this.request<FALRTTrainTrip[]>('?action=30', {
      method: 'GET',
      responseType: 'json'
    });
  }
  
  async getRTBusTrips(): Promise<FALRTBusTrip[]> {
    return this.request<FALRTBusTrip[]>('?action=34', {
      method: 'GET',
      responseType: 'json'
    });
  }
  
  async getRTTrainInfo(trainNumber: string): Promise<FALRTTrainTripInfo | null> {
    return this.request<FALRTTrainTripInfo | null>(`?action=31&numero_treno=${trainNumber}`, {
      method: 'GET',
      responseType: 'json'
    });
  }
  
  async getRTBusInfo(busId: number): Promise<FALRTBusTripStation[] | null> {
    return this.request<FALRTBusTripStation[] | null>(`?action=35&travel_document_id=${busId}`, {
      method: 'GET',
      responseType: 'json'
    });
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
