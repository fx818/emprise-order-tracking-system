// src/features/sites/hooks/use-sites.ts
import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import { Site, SiteStatus } from '../types/site';
import { LOA } from '../../loas/types/loa';
import { PurchaseOrder } from '../../purchase-orders/types/purchase-order';

// Types for form data
export interface CreateSiteFormData {
  name: string;
  location: string;
  zoneId: string;
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdateSiteFormData extends Partial<CreateSiteFormData> {
  status?: SiteStatus;
}

// API Response types
interface APIResponse<T> {
  status: string;
  data: T;
  message?: string;
}

interface SiteResponse {
  sites: Site[];
  total: number;
}

interface SiteStats {
  totalLoas: number;
  totalPurchaseOrders: number;
  totalValue: number;
  activeLoas: number;
  pendingPOs: number;
}

interface SiteDetails extends Site {
  stats: SiteStats;
}

// Parameters types
interface GetSitesParams {
  status?: string;
  zoneId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

interface GetSiteLoasParams extends DateRangeParams {
  status?: string;
}

interface GetSitePOsParams extends DateRangeParams {
  status?: string;
}

// Hook return type
interface SitesHookReturn {
  loading: boolean;
  createSite: (data: CreateSiteFormData) => Promise<Site>;
  updateSite: (id: string, data: UpdateSiteFormData) => Promise<Site>;
  getSite: (id: string) => Promise<Site>;
  getSites: (params?: GetSitesParams) => Promise<SiteResponse>;
  deleteSite: (id: string) => Promise<void>;
  getSiteDetails: (id: string) => Promise<SiteDetails>;
  getSiteLoas: (id: string, params?: GetSiteLoasParams) => Promise<LOA[]>;
  getSitePurchaseOrders: (id: string, params?: GetSitePOsParams) => Promise<PurchaseOrder[]>;
}

export function useSites(): SitesHookReturn {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const createSite = async (data: CreateSiteFormData): Promise<Site> => {
    try {
      setLoading(true);
      const response = await apiClient.post<APIResponse<Site>>('/sites', data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to create site');
      }

      showSuccess('Site created successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('Site creation error:', error.response.data.message || error);
      showError(error.response.data.message || 'Failed to create site here ');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSite = async (id: string, data: UpdateSiteFormData): Promise<Site> => {
    try {
      setLoading(true);
      const response = await apiClient.put<APIResponse<Site>>(`/sites/${id}`, data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to update site');
      }

      showSuccess('Site updated successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('Site update error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to update site');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSite = async (id: string): Promise<Site> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<Site>>(`/sites/${id}`);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch site');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get site error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch site');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSites = async (params?: GetSitesParams): Promise<SiteResponse> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<SiteResponse>>('/sites', {
        params: {
          ...params,
          search: params?.searchTerm
        }
      });

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch sites');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get sites error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch sites');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSite = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/sites/${id}`);

      if (response.status !== 204) {
        throw new Error('Failed to delete site');
      }

      showSuccess('Site deleted successfully');
    } catch (error: any) {
      console.error('Delete site error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to delete site');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSiteDetails = async (id: string): Promise<SiteDetails> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<SiteDetails>>(`/sites/${id}/details`);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch site details');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get site details error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch site details');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSiteLoas = async (id: string, params?: GetSiteLoasParams): Promise<LOA[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<LOA[]>>(`/sites/${id}/loas`, {
        params: {
          ...params,
          startDate: params?.startDate?.toISOString(),
          endDate: params?.endDate?.toISOString()
        }
      });

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch site LOAs');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get site LOAs error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch site LOAs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSitePurchaseOrders = async (id: string, params?: GetSitePOsParams): Promise<PurchaseOrder[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<PurchaseOrder[]>>(`/sites/${id}/purchase-orders`, {
        params: {
          ...params,
          startDate: params?.startDate?.toISOString(),
          endDate: params?.endDate?.toISOString()
        }
      });

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch site purchase orders');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get site POs error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch site purchase orders');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createSite,
    updateSite,
    getSite,
    getSites,
    deleteSite,
    getSiteDetails,
    getSiteLoas,
    getSitePurchaseOrders
  };
}