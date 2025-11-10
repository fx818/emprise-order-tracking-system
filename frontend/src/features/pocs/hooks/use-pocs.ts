// src/features/pocs/hooks/use-pocs.ts
import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import { POC, POCFormData } from '../types/poc';

// API Response types
interface APIResponse<T> {
  status: string;
  data: T;
  message?: string;
}

interface POCsResponse {
  pocs: POC[];
  total: number;
}

// Parameters types
interface GetPocsParams {
  searchTerm?: string;
  page?: number;
  limit?: number;
}

// Hook return type
interface PocsHookReturn {
  loading: boolean;
  createPoc: (data: POCFormData) => Promise<POC>;
  updatePoc: (id: string, data: POCFormData) => Promise<POC>;
  getPoc: (id: string) => Promise<POC>;
  getPocs: (params?: GetPocsParams) => Promise<POCsResponse>;
  deletePoc: (id: string) => Promise<void>;
}

export function usePocs(): PocsHookReturn {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const createPoc = async (data: POCFormData): Promise<POC> => {
    try {
      setLoading(true);
      const response = await apiClient.post<APIResponse<POC>>('/pocs', data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to create POC');
      }

      showSuccess('POC created successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('POC creation error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to create POC');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePoc = async (id: string, data: POCFormData): Promise<POC> => {
    try {
      setLoading(true);
      const response = await apiClient.put<APIResponse<POC>>(`/pocs/${id}`, data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to update POC');
      }

      showSuccess('POC updated successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('POC update error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to update POC');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPoc = async (id: string): Promise<POC> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<POC>>(`/pocs/${id}`);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch POC');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('POC fetch error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch POC');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPocs = async (params?: GetPocsParams): Promise<POCsResponse> => {
    try {
      setLoading(true);
      const response = await apiClient.get<APIResponse<POCsResponse>>('/pocs', {
        params: {
          search: params?.searchTerm,
          page: params?.page,
          limit: params?.limit || 1000, // High default limit for dropdown
        },
      });

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch POCs');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('POCs fetch error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch POCs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePoc = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await apiClient.delete(`/pocs/${id}`);
      showSuccess('POC deleted successfully');
    } catch (error: any) {
      console.error('POC deletion error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to delete POC');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPoc,
    updatePoc,
    getPoc,
    getPocs,
    deletePoc,
  };
}
