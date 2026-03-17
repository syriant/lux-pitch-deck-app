import { apiClient } from './client';

export interface ParsedPricingTool {
  version: string;
  metadata: {
    hotelName: string | null;
    destination: string | null;
    destinationDetail: string | null;
    grade: string | null;
    currency: string | null;
    fxRate: number | null;
    travelFrom: string | null;
    travelTo: string | null;
  };
  options: Array<{
    optionNumber: number;
    tierLabel: string;
    grossMargin: number | null;
    tier: number | null;
    dealOptions: Array<{
      name: string;
      sellPrice: number;
      roomType: string;
      costPrice: number;
      nights: number;
      nightlyCostPrice: number;
      nightlySellPrice: number;
      maxExtraNights: number;
      allocationPerDay: number;
    }>;
  }>;
  inclusions: Array<{
    assetName: string;
    type: string | null;
    description: string | null;
    prv: number | null;
    rrp: number | null;
  }>;
  surcharges: {
    seasonal: Array<{
      optionNumber: number;
      period: string;
      dates: string;
      supplement: number | null;
    }>;
    dayOfWeek: Array<{
      optionNumber: number;
      day: string;
      allYear: number;
      high: number;
      shoulder: number;
    }>;
  };
  blackoutDates: string[];
  warnings: string[];
}

export async function parsePricingTool(file: File): Promise<ParsedPricingTool> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ParsedPricingTool>('/parser/pricing-tool', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
