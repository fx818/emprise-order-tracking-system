import { useState, useCallback } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { Tender, TenderFormData } from '../types/tender';

// Define more specific response interfaces to match API structure
interface TenderListResponse {
  status: string;
  data: Tender[];
}

interface PaginatedTenderResponse {
  status: string;
  data: {
    data: Tender[];
    total: number;
  };
}

interface SingleTenderResponse {
  status: string;
  data: Tender;
}

export function useTenders() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // GET /tenders - Get all tenders
  const getAllTenders = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (status && status !== 'ALL') {
        queryParams.append('status', status);
      }
      
      const queryString = queryParams.toString();
      const url = `/tenders${queryString ? `?${queryString}` : ''}`;
      
      // Use a more general type for the response to handle different structures
      const response = await apiClient.get<TenderListResponse | PaginatedTenderResponse>(url);
      
      // Handle different response structures
      if (response.data && typeof response.data === 'object') {
        if ('data' in response.data) {
          // Check if it's a paginated response
          if (typeof response.data.data === 'object' && 'data' in response.data.data) {
            return (response.data as PaginatedTenderResponse).data.data;
          }
          // Regular list response
          return (response.data as TenderListResponse).data;
        }
      }
      
      // If response doesn't match expected structure, return empty array
      return [];
    } catch (error: any) {
      console.error('Error fetching tenders:', error);
      showError(error.response?.data?.message || 'Failed to fetch tenders');
      return []; // Return empty array instead of throwing
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // GET /tenders/{id} - Get tender by ID
  const getTenderById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get<SingleTenderResponse>(`/tenders/${id}`);
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch tender details');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // POST /tenders - Create a new tender
  const createTender = useCallback(async (formData: TenderFormData) => {
    try {
      setLoading(true);

      // Create form data for file upload
      const form = new FormData();
      for (const key in formData) {
        if (key === 'documentFile' && formData.documentFile) {
          form.append('documentFile', formData.documentFile as File);
        } else if (key === 'nitDocumentFile' && formData.nitDocumentFile) {
          form.append('nitDocumentFile', formData.nitDocumentFile as File);
        } else if (key === 'emdDocumentFile' && formData.emdDocumentFile) {
          form.append('emdDocumentFile', formData.emdDocumentFile as File);
        } else if (key === 'tags' && Array.isArray(formData.tags)) {
          form.append('tags', JSON.stringify(formData.tags));
        } else if (key === 'emdSubmissionDate' || key === 'emdMaturityDate') {
          // Handle date fields
          const dateValue = formData[key];
          if (dateValue) {
            form.append(key, dateValue.toISOString());
          }
        } else if (formData[key as keyof TenderFormData] !== undefined && formData[key as keyof TenderFormData] !== null) {
          form.append(key, String(formData[key as keyof TenderFormData]));
        }
      }

      const response = await apiClient.post<SingleTenderResponse>('/tenders', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Tender created successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to create tender');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // PUT /tenders/{id} - Update a tender
  const updateTender = useCallback(async (id: string, formData: Partial<TenderFormData>) => {
    try {
      setLoading(true);

      // Create form data for file upload
      const form = new FormData();
      for (const key in formData) {
        if (key === 'documentFile' && formData.documentFile) {
          form.append('documentFile', formData.documentFile as File);
        } else if (key === 'nitDocumentFile' && formData.nitDocumentFile) {
          form.append('nitDocumentFile', formData.nitDocumentFile as File);
        } else if (key === 'emdDocumentFile' && formData.emdDocumentFile) {
          form.append('emdDocumentFile', formData.emdDocumentFile as File);
        } else if (key === 'tags' && Array.isArray(formData.tags)) {
          form.append('tags', JSON.stringify(formData.tags));
        } else if (key === 'emdSubmissionDate' || key === 'emdMaturityDate') {
          // Handle date fields
          const dateValue = formData[key];
          if (dateValue) {
            form.append(key, dateValue.toISOString());
          }
        } else if (formData[key as keyof Partial<TenderFormData>] !== undefined && formData[key as keyof Partial<TenderFormData>] !== null) {
          form.append(key, String(formData[key as keyof Partial<TenderFormData>]));
        }
      }

      const response = await apiClient.put<SingleTenderResponse>(`/tenders/${id}`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Tender updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update tender');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // DELETE /tenders/{id} - Delete a tender
  const deleteTender = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/tenders/${id}`);
      showSuccess('Tender deleted successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to delete tender');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // PATCH /tenders/{id}/status - Update tender status
  const updateTenderStatus = useCallback(async (id: string, status: string) => {
    try {
      setLoading(true);
      const response = await apiClient.patch<SingleTenderResponse>(`/tenders/${id}/status`, { status });
      showSuccess('Tender status updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update tender status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // PATCH /tenders/{id}/emd-return-status - Update EMD return status
  const updateEMDReturnStatus = useCallback(async (
    id: string,
    emdReturnStatus: string,
    emdReturnDate?: Date,
    emdReturnAmount?: number
  ) => {
    try {
      setLoading(true);
      const response = await apiClient.patch<SingleTenderResponse>(`/tenders/${id}/emd-return-status`, {
        emdReturnStatus,
        emdReturnDate: emdReturnDate?.toISOString(),
        emdReturnAmount
      });
      showSuccess('EMD return status updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update EMD return status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  return {
    loading,
    getAllTenders,
    getTenderById,
    createTender,
    updateTender,
    deleteTender,
    updateTenderStatus,
    updateEMDReturnStatus
  };
} 