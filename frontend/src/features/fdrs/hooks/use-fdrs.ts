import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type {
  FDR,
  FDRFormData,
  FDRResponse,
  BulkImportFDRResult,
} from '../types/fdr';

/**
 * useFDRs - Hook to manage all CRUD and bulk FDR operations with full error safety.
 */
export function useFDRs() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // 🧠 Helper to safely extract error messages
  const getErrorMessage = (error: any, fallback: string): string => {
    if (!error) return fallback;

    // Network / timeout errors
    if (error.message?.includes('Network Error')) {
      return 'Network error. Please check your connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    // Server-side response messages
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      fallback;

    return typeof message === 'string' ? message : fallback;
  };

  // -------------------- FETCH ALL --------------------
  const getAllFDRs = async (limit: number = 1000): Promise<FDR[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get<FDRResponse>(`/fdrs?limit=${limit}`);
      const data = response.data?.data;

      if (data && 'data' in data && Array.isArray(data.data)) {
        return data.data;
      }

      return [];
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to fetch FDRs.');
      console.error('getAllFDRs error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- FETCH BY ID --------------------
  const getFDRById = async (id: string): Promise<FDR> => {
    try {
      setLoading(true);
      const response = await apiClient.get<FDRResponse>(`/fdrs/${id}`);
      return response.data?.data as FDR;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to fetch FDR details.');
      console.error('getFDRById error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- CREATE --------------------
  const createFDR = async (data: FDRFormData) => {
    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value instanceof File) {
          formData.append('documentFile', value);
        } else if (key === 'tags') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.post('/fdrs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccess('FDR created successfully');
      return response.data;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to create FDR.');
      console.error('createFDR error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- UPDATE --------------------
  const updateFDR = async (id: string, data: Partial<FDRFormData>) => {
    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value instanceof File) {
          formData.append('documentFile', value);
        } else if (key === 'tags') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.put(`/fdrs/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccess('FDR updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to update FDR.');
      console.error('updateFDR error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- DELETE --------------------
  const deleteFDR = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/fdrs/${id}`);
      showSuccess('FDR deleted successfully');
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to delete FDR.');
      console.error('deleteFDR error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- STATUS UPDATE --------------------
  const updateFDRStatus = async (id: string, status: FDR['status']) => {
    try {
      setLoading(true);
      const response = await apiClient.patch<FDRResponse>(`/fdrs/${id}/status`, {
        status,
      });
      showSuccess('FDR status updated successfully');
      return response.data?.data as FDR;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to update FDR status.');
      console.error('updateFDRStatus error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- EXPIRING FDRs --------------------
  const getExpiringFDRs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/fdrs/expiring/list');
      return response.data;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to fetch expiring FDRs.');
      console.error('getExpiringFDRs error:', error);
      showError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- BULK IMPORT --------------------
  const bulkImportFDRs = async (file: File): Promise<BulkImportFDRResult> => {
    try {
      if (!file) throw new Error('No file selected for import.');
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('File too large. Please upload files below 15MB.');
      }

      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{
        status: string;
        message: string;
        data: BulkImportFDRResult;
      }>('/fdrs/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data?.data;

      // Show user-friendly summaries
      if (result.successCount > 0)
        showSuccess(`✅ Imported ${result.successCount} FDR(s) successfully.`);
      if (result.failureCount > 0 || result.skippedCount > 0)
        showError(
          `⚠️ ${result.failureCount} failed, ${result.skippedCount} skipped.`
        );

      return result;
    } catch (error: any) {
      const msg = getErrorMessage(error, 'Failed to import FDRs.');
      console.error('bulkImportFDRs error:', error);
      showError(msg);
      throw new Error(msg);
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
