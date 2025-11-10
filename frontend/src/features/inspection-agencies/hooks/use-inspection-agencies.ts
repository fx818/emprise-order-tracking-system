import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { InspectionAgency, InspectionAgencyFormData } from '../types/inspection-agency';

export function useInspectionAgencies() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const createInspectionAgency = async (data: InspectionAgencyFormData): Promise<InspectionAgency> => {
    try {
      setLoading(true);
      const response = await apiClient.post('/inspection-agencies', data);
      showSuccess('Inspection agency created successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating inspection agency:', error);
      showError(error.response?.data?.message || 'Failed to create inspection agency');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateInspectionAgency = async (id: string, data: InspectionAgencyFormData): Promise<InspectionAgency> => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/inspection-agencies/${id}`, data);
      showSuccess('Inspection agency updated successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating inspection agency:', error);
      showError(error.response?.data?.message || 'Failed to update inspection agency');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteInspectionAgency = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await apiClient.delete(`/inspection-agencies/${id}`);
      showSuccess('Inspection agency deleted successfully');
    } catch (error: any) {
      console.error('Error deleting inspection agency:', error);
      showError(error.response?.data?.message || 'Failed to delete inspection agency');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getInspectionAgency = async (id: string): Promise<InspectionAgency> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/inspection-agencies/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching inspection agency:', error);
      showError(error.response?.data?.message || 'Failed to fetch inspection agency');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getInspectionAgencies = async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ inspectionAgencies: InspectionAgency[]; total: number }> => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/inspection-agencies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching inspection agencies:', error);
      showError(error.response?.data?.message || 'Failed to fetch inspection agencies');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createInspectionAgency,
    updateInspectionAgency,
    deleteInspectionAgency,
    getInspectionAgency,
    getInspectionAgencies,
  };
}
