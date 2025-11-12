import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { LOA, LOAFormData, AmendmentFormData } from '../types/loa';

export function useLOAs() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleError = (error: any, defaultMessage: string) => {
    console.error('API Error:', error);
    
    if (error?.response?.data?.message) {
      showError(error.response.data.message);
    } else if (error?.code === 'P2002') {
      // Handle unique constraint violation
      showError('This LOA number already exists. Please use a different one.');
    } else {
      showError(defaultMessage);
    }
    
    throw error;
  };

  // Get all LOAs
  const getLOAs = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    siteId?: string;
    zoneId?: string;
    tenderId?: string;
    status?: string;
    minValue?: number;
    maxValue?: number;
    hasEMD?: boolean;
    hasSecurity?: boolean;
    hasPerformanceGuarantee?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.siteId) queryParams.append('siteId', params.siteId);
      if (params?.zoneId) queryParams.append('zoneId', params.zoneId);
      if (params?.tenderId) queryParams.append('tenderId', params.tenderId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.minValue !== undefined) queryParams.append('minValue', params.minValue.toString());
      if (params?.maxValue !== undefined) queryParams.append('maxValue', params.maxValue.toString());
      if (params?.hasEMD !== undefined) queryParams.append('hasEMD', params.hasEMD.toString());
      if (params?.hasSecurity !== undefined) queryParams.append('hasSecurity', params.hasSecurity.toString());
      if (params?.hasPerformanceGuarantee !== undefined) queryParams.append('hasPerformanceGuarantee', params.hasPerformanceGuarantee.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `/loas${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);

      if (!response.data || !response.data.data) {
        console.warn('Unexpected API response structure:', response);
        return { loas: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      }

      // Ensure all LOAs have a status value
      const loas = response.data.data.loas || [];
      loas.forEach((loa: any) => {
        if (!loa.status) {
          loa.status = "NOT_STARTED"; // Default to NOT_STARTED if status is missing
        }
      });

      return {
        loas,
        total: response.data.data.total || 0,
        page: response.data.data.page || 1,
        limit: response.data.data.limit || 10,
        totalPages: response.data.data.totalPages || 0
      };
    } catch (error: any) {
      console.error('Error in getLOAs:', error);
      showError(error.response?.data?.message || 'Failed to fetch LOAs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get single LOA by ID
  const getLOAById = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/loas/${id}`);
      
      const loaData = response.data.data;

      // Ensure status is present in the response
      if (!loaData.status) {
        loaData.status = "NOT_STARTED"; // Default to NOT_STARTED if status is missing
      }
      
      return loaData;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch LOA details');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createLOA = async (data: LOAFormData) => {
    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value) {
          formData.append(key, value);
        } else if (key === 'securityDepositFile' && value && data.hasSd) {
          formData.append(key, value);
        } else if (key === 'performanceGuaranteeFile' && value && data.hasPg) {
          formData.append(key, value);
        } else if (key === 'invoicePdfFile' && value) {
          formData.append(key, value);
        } else if (key === 'deliveryPeriod') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'tags') {
          const uniqueTags = Array.from(new Set(value))
            .map((tag: any) => tag.trim())
            .filter(Boolean);
          formData.append(key, JSON.stringify(uniqueTags));
        } else if (key === 'hasEmd' || key === 'hasSd' || key === 'hasPg') {
          formData.append(key, String(value));
        } else if (key === 'emdAmount' && data.hasEmd) {
          formData.append(key, String(value || 0));
        } else if (key === 'securityDepositAmount' && data.hasSd) {
          formData.append(key, String(value || 0));
        } else if (key === 'performanceGuaranteeAmount' && data.hasPg) {
          formData.append(key, String(value || 0));
        } else if (key === 'invoiceAmount' || key === 'totalReceivables' || key === 'actualAmountReceived' ||
                   key === 'amountDeducted' || key === 'amountPending') {
          // Handle invoice amount fields - only append if they have a value
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, String(value));
          }
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.post('/loas', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // The server response from LoaController
      // Check if the response has a status field (indicating it's in the new format)
      if (response.data && response.data.status === 'success') {
        showSuccess('LOA created successfully');
        return response.data.data;
      } else if (response.data) {
        // Handle legacy or different response format
        showSuccess('LOA created successfully');
        return response.data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error in createLOA:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create LOA';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createAmendment = async (loaId: string, data: AmendmentFormData) => {
    try {
      setLoading(true);
      const formData = new FormData();
    
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value) {
          formData.append(key, value);
        } else if (key === 'tags') {
          const uniqueTags = Array.from(new Set(value))
            .map((tag: any) => tag.trim())
            .filter(Boolean);
          formData.append(key, JSON.stringify(uniqueTags));
        } else {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.post(`/loas/${loaId}/amendments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showSuccess('Amendment created successfully');
      return response.data.data;
    } catch (error: any) {
      handleError(error, 'Failed to create amendment');
    } finally {
      setLoading(false);
    }
  };

  const updateLOAStatus = async (id: string, status: LOA['status'], reason?: string) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/loas/${id}/status`, { status, reason });
      showSuccess('LOA status updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update LOA status');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateLOA = async (id: string, data: Partial<LOAFormData> & { status?: string }) => {
    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'documentFile' && value) {
          formData.append(key, value);
        } else if (key === 'securityDepositFile' && value && data.hasSd) {
          formData.append(key, value);
        } else if (key === 'performanceGuaranteeFile' && value && data.hasPg) {
          formData.append(key, value);
        } else if (key === 'invoicePdfFile' && value) {
          formData.append(key, value);
        } else if (key === 'deliveryPeriod') {
          const formattedPeriod = {
            start: value.start instanceof Date ? value.start.toISOString() : value.start,
            end: value.end instanceof Date ? value.end.toISOString() : value.end
          };
          formData.append(key, JSON.stringify(formattedPeriod));
        } else if (key === 'tags') {
          let tagsToSend = [];
          if (Array.isArray(value)) {
            tagsToSend = value.filter(tag => tag && tag.trim()).map(tag => tag.trim());
          }
          formData.append(key, JSON.stringify(tagsToSend));
        } else if (key === 'hasEmd' || key === 'hasSd' || key === 'hasPg') {
          formData.append(key, String(value));
        } else if (key === 'emdAmount' && data.hasEmd) {
          formData.append(key, String(value || 0));
        } else if (key === 'securityDepositAmount' && data.hasSd) {
          formData.append(key, String(value || 0));
        } else if (key === 'performanceGuaranteeAmount' && data.hasPg) {
          formData.append(key, String(value || 0));
        } else if (key === 'invoiceAmount' || key === 'totalReceivables' || key === 'actualAmountReceived' ||
                   key === 'amountDeducted' || key === 'amountPending') {
          // Handle invoice amount fields - only append if they have a value
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, String(value));
          }
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      const response = await apiClient.put(`/loas/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('LOA updated successfully');
      return response.data.data;
    } catch (error: any) {
      handleError(error, 'Failed to update LOA');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteLOA = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/loas/${id}`);
      showSuccess('LOA deleted successfully');
    } catch (error: any) {
      handleError(error, 'Failed to delete LOA');
    } finally {
      setLoading(false);
    }
  };

  const deleteAmendment = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/loas/amendments/${id}`);
      showSuccess('Amendment deleted successfully');
    } catch (error: any) {
      handleError(error, 'Failed to delete amendment');
    } finally {
      setLoading(false);
    }
  };

  // Modify the function to return an empty array without making an API call
  const getAvailableEMDs = async () => {
    // EMD module has been removed, so return an empty array
    return [];
  };

  const bulkImportLOAs = async (file: File) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/loas/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data.data;

      // Show summary message
      if (result.successCount > 0) {
        showSuccess(
          `Import completed: ${result.successCount} LOAs created successfully${
            result.failureCount > 0 || result.skippedCount > 0
              ? `, ${result.failureCount} failed, ${result.skippedCount} skipped`
              : ''
          }`
        );
      } else {
        showError('Import failed: No LOAs were created. Please check the file and try again.');
      }

      return result;
    } catch (error: any) {
      console.error('Error in bulkImportLOAs:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to import LOAs';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get LOAs by tender ID
  const getLoasByTender = async (tenderId: string) => {
    try {
      setLoading(true);
      const result = await getLOAs({ tenderId, limit: 1000 }); // Get all LOAs for the tender
      return result.loas;
    } catch (error: any) {
      console.error('Error in getLoasByTender:', error);
      // Silently return empty array - don't show error toast
      // This handles cases where tender exists but has no LOAs
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create other document
  const createOtherDocument = async (loaId: string, data: { title: string; documentFile: File }) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('documentFile', data.documentFile);

      const response = await apiClient.post(`/loas/${loaId}/other-documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Other document uploaded successfully');
      return response.data.data;
    } catch (error: any) {
      handleError(error, 'Failed to upload other document');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update other document
  const updateOtherDocument = async (id: string, data: { title?: string; documentFile?: File }) => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (data.title) formData.append('title', data.title);
      if (data.documentFile) formData.append('documentFile', data.documentFile);

      const response = await apiClient.put(`/loas/other-documents/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Other document updated successfully');
      return response.data.data;
    } catch (error: any) {
      handleError(error, 'Failed to update other document');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete other document
  const deleteOtherDocument = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/loas/other-documents/${id}`);
      showSuccess('Other document deleted successfully');
    } catch (error: any) {
      handleError(error, 'Failed to delete other document');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get LOA with complete financial calculations
  const getLoaWithFinancials = async (id: string): Promise<LOA | null> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/loas/${id}/financials`);
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to fetch LOA financials');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update pending split (recoverable vs payment)
  const updatePendingSplit = async (
    id: string,
    recoverablePending: number,
    paymentPending: number
  ): Promise<LOA | null> => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/loas/${id}/pending-split`, {
        recoverablePending,
        paymentPending,
      });
      showSuccess('Pending split updated successfully');
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to update pending split');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update manual financial overrides (for historical data entry)
  const updateManualFinancials = async (
    id: string,
    manualTotalBilled?: number,
    manualTotalReceived?: number,
    manualTotalDeducted?: number,
    recoverablePending?: number
  ): Promise<LOA | null> => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/loas/${id}/manual-financials`, {
        manualTotalBilled,
        manualTotalReceived,
        manualTotalDeducted,
        recoverablePending,
      });
      showSuccess('Financial data updated successfully');
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to update financial data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getLOAs,
    getLOAById,
    getLoasByTender,
    createLOA,
    updateLOA,
    deleteLOA,
    createAmendment,
    deleteAmendment,
    createOtherDocument,
    updateOtherDocument,
    deleteOtherDocument,
    updateLOAStatus,
    getAvailableEMDs,
    bulkImportLOAs,
    getLoaWithFinancials,
    updatePendingSplit,
    updateManualFinancials,
  };
}