import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { FDR, FDRFormData, FDRResponse, BulkImportFDRResult } from '../types/fdr';

export function useFDRs() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // GET /fdrs - Get all FDRs
  const getAllFDRs = async (limit: number = 1000) => {
    try {
      setLoading(true);
      const response = await apiClient.get<FDRResponse>(`/fdrs?limit=${limit}`);
      // Handle the list response structure
      if ('data' in response.data.data) {
        return response.data.data.data || [];
      }
      return [];
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch FDRs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // GET /fdrs/{id} - Get FDR by ID
  const getFDRById = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get<FDRResponse>(`/fdrs/${id}`);
      // Handle the single FDR response structure
      return response.data.data as FDR;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch FDR details');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // POST /fdrs - Create new FDR
  const createFDR = async (data: FDRFormData) => {
    try {
      setLoading(true);
      // Create FormData for file upload
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value) {
          formData.append('documentFile', value); // Match backend field name
        } else if (key === 'tags') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null && value !== '') {
          // Only append if value exists and is not empty (prevents "undefined" string)
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.post('/fdrs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showSuccess('FDR created successfully');
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to create FDR');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // PUT /fdrs/{id} - Update an existing FDR
  const updateFDR = async (id: string, data: Partial<FDRFormData>) => {
    try {
      setLoading(true);
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value) {
          formData.append(key, value);
        } else if (key === 'tags') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null && value !== '') {
          // Only append if value exists and is not empty (prevents "undefined" string)
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.put(`/fdrs/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showSuccess('FDR updated successfully');
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update FDR');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // DELETE /fdrs/{id} - Delete FDR
  const deleteFDR = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/fdrs/${id}`);
      showSuccess('FDR deleted successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to delete FDR');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // PATCH /fdrs/{id}/status - Update FDR status
  const updateFDRStatus = async (id: string, status: FDR['status']) => {
    try {
      setLoading(true);
      const response = await apiClient.patch<FDRResponse>(`/fdrs/${id}/status`, { status });
      showSuccess('FDR status updated successfully');
      return response.data.data as FDR;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update FDR status');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // GET /fdrs/expiring/list - Get expiring FDRs
  const getExpiringFDRs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/fdrs/expiring/list');
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch expiring FDRs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // POST /fdrs/bulk-import - Bulk import FDRs from Excel
  const bulkImportFDRs = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{ status: string; message: string; data: BulkImportFDRResult }>('/fdrs/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data.data;
      if (result.successCount > 0) {
        showSuccess(`Successfully imported ${result.successCount} FDR(s)`);
      }
      if (result.failureCount > 0 || result.skippedCount > 0) {
        showError(`${result.failureCount} failed, ${result.skippedCount} skipped`);
      }

      return result;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to import FDRs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getAllFDRs,
    getFDRById,
    createFDR,
    updateFDR,
    deleteFDR,
    updateFDRStatus,
    getExpiringFDRs,
    bulkImportFDRs,
  };
}
