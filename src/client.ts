import { ofetch } from "ofetch";
import { JSDOM } from "jsdom";
import {
  FALRTBusTrip, FALStation, FALRTTrainTrip, FALRTBusTripStation, FALRTTrainTripInfo, FALWarning,
  FALScheduleResult
} from "./types";

const BASE_URL = 'https://fal.ferrovieappulolucane.it/';

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
}
