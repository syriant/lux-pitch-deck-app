import { apiClient } from './client';

export interface CaseStudy {
  id: string;
  title: string;
  hotelName: string;
  destination: string | null;
  propertyType: string | null;
  roomNights: number | null;
  revenue: string | null;
  adr: string | null;
  alos: string | null;
  leadTime: number | null;
  bookings: number | null;
  packagesSold: number | null;
  upgradePercentage: string | null;
  roomTypeBreakdowns: { roomType: string; count: number; percentage: number }[] | null;
  customerRegions: { region: string; percentage: number }[] | null;
  metricsRefreshedAt: string | null;
  metricsSource: string | null;
  narrative: string | null;
  pcmNotes: string | null;
  images: string[] | null;
  tags: string[] | null;
  compSetTags: string[] | null;
  dealId: string | null;
  locale: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudyListResponse {
  data: CaseStudy[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCaseStudyRequest {
  title: string;
  hotelName: string;
  destination?: string;
  propertyType?: string;
  roomNights?: number;
  revenue?: number;
  adr?: number;
  alos?: number;
  leadTime?: number;
  bookings?: number;
  packagesSold?: number;
  upgradePercentage?: number;
  roomTypeBreakdowns?: { roomType: string; count: number; percentage: number }[];
  customerRegions?: { region: string; percentage: number }[];
  narrative?: string;
  pcmNotes?: string;
  images?: string[];
  tags?: string[];
  compSetTags?: string[];
  dealId?: string;
}

export interface UpdateCaseStudyRequest {
  title?: string;
  hotelName?: string;
  destination?: string | null;
  propertyType?: string | null;
  roomNights?: number | null;
  revenue?: number | null;
  adr?: number | null;
  alos?: number | null;
  leadTime?: number | null;
  bookings?: number | null;
  packagesSold?: number | null;
  upgradePercentage?: number | null;
  roomTypeBreakdowns?: { roomType: string; count: number; percentage: number }[] | null;
  customerRegions?: { region: string; percentage: number }[] | null;
  narrative?: string | null;
  pcmNotes?: string | null;
  images?: string[] | null;
  tags?: string[] | null;
  compSetTags?: string[] | null;
  dealId?: string | null;
}

export async function getCaseStudies(params?: {
  destination?: string;
  propertyType?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CaseStudyListResponse> {
  const res = await apiClient.get<CaseStudyListResponse>('/case-studies', { params });
  return res.data;
}

export async function getCaseStudy(id: string): Promise<CaseStudy> {
  const res = await apiClient.get<CaseStudy>(`/case-studies/${id}`);
  return res.data;
}

export async function createCaseStudy(data: CreateCaseStudyRequest): Promise<CaseStudy> {
  const res = await apiClient.post<CaseStudy>('/case-studies', data);
  return res.data;
}

export async function updateCaseStudy(id: string, data: UpdateCaseStudyRequest): Promise<CaseStudy> {
  const res = await apiClient.patch<CaseStudy>(`/case-studies/${id}`, data);
  return res.data;
}

export async function deleteCaseStudy(id: string): Promise<void> {
  await apiClient.delete(`/case-studies/${id}`);
}
