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
  // ✅ Enhanced Tender Creation with Complete Error Handling
  const createTender = useCallback(async (formData: TenderFormData) => {
    try {
      setLoading(true);

      // --- Prepare form data (safe file + JSON handling)
      const form = new FormData();
      for (const key in formData) {
        const value = formData[key as keyof TenderFormData];

        if (key.endsWith('DocumentFile') && value instanceof File) {
          form.append(key, value);
        } else if (key === 'tags' && Array.isArray(value)) {
          form.append('tags', JSON.stringify(value));
        } else if (key === 'emdSubmissionDate' || key === 'emdMaturityDate') {
          if (value instanceof Date) form.append(key, value.toISOString());
        } else if (value !== undefined && value !== null) {
          form.append(key, String(value));
        }
      }

      // --- API Request
      const response = await apiClient.post<SingleTenderResponse>('/tenders', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Tender created successfully');
      return response.data.data;

    } catch (error: any) {
      console.error('Tender creation error:', error);

      // ✅ 1️⃣ Detect common network-level or Axios-level errors
      if (error.code === 'ERR_NETWORK') {
        showError('Network error: Please check your internet connection.');
      }
      else if (error.code === 'ECONNABORTED') {
        showError('Request timeout: The server took too long to respond.');
      }

      // ✅ 2️⃣ Handle API responses (4xx / 5xx)
      else if (error.response) {
        const { status, data } = error.response;
        const message =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : null) ||
          'An unknown server error occurred.';

        // More descriptive messages per status
        if (status === 400) {
          showError(`Validation failed: ${message}`);
        } else if (status === 401) {
          showError('Unauthorized: Please log in again.');
        } else if (status === 403) {
          showError('Forbidden: You do not have permission to perform this action.');
        } else if (status === 404) {
          showError('Endpoint not found: Please contact support.');
        } else if (status >= 500) {
          showError(`Server error (${status}): ${message}`);
        } else {
          showError(message);
        }

        // Optionally rethrow for upper-level handlers
        throw new Error(message);
      }

      // ✅ 3️⃣ Catch JSON parse / unexpected / frontend code errors
      else if (error instanceof SyntaxError) {
        showError('Invalid data format received from the server.');
      }
      else {
        showError(error.message || 'Unexpected error occurred while creating tender.');
      }

      throw error; // keep consistent with your original logic

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

  // PATCH /tenders/{id}/emd-release-status - Update EMD release status
  const updateEMDReleaseStatus = useCallback(async (
    id: string,
    emdReleaseStatus: string,
    emdReleaseDate?: Date,
    emdReleaseAmount?: number
  ) => {
    try {
      setLoading(true);
      const response = await apiClient.patch<SingleTenderResponse>(`/tenders/${id}/emd-release-status`, {
        emdReleaseStatus,
        emdReleaseDate: emdReleaseDate?.toISOString(),
        emdReleaseAmount
      });
      showSuccess('EMD release status updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update EMD release status');
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
    updateEMDReleaseStatus
  };
} 