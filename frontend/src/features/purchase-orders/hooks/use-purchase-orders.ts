import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { PurchaseOrderFormData } from '../types/purchase-order';
import { getUser } from '../../../lib/utils/auth';

export function usePurchaseOrders() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const getCurrentUser = getUser();

  const createPurchaseOrder = async (data: PurchaseOrderFormData) => {
    try {
      setLoading(true);

      const response = await apiClient.post('/purchase-orders', data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to create purchase order');
      }

      showSuccess('Purchase order created successfully');
      return response.data;
    } catch (error: any) {
      console.error('PO creation error:', error.response || error); // Detailed error log

      // Handle specific error cases
      if (error.response?.status === 400) {
        showError('Invalid data provided. Please check your inputs.');
      } else if (error.response?.status === 401) {
        showError('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        showError('You do not have permission to create purchase orders.');
      } else {
        showError(error.response?.data?.message || 'Failed to create purchase order');
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async (id: string) => {
    try {
      setLoading(true);

      const response = await apiClient.post(`/purchase-orders/${id}/submit`);

      // Check for business logic errors in success response
      if (response.data?.data?.isSuccess === false) {
        throw new Error(response.data.data.error || 'Failed to submit purchase order');
      }

      // Check for API errors
      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to submit purchase order');
      }

      showSuccess('Purchase order submitted for approval');
      return response.data;
    } catch (error: any) {
      console.error('Submit for approval error:', error);

      // Handle specific error messages
      const errorMessage = error.response?.data?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to submit purchase order';

      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const markAsCompleted = async (id: string) => {
    try {
      setLoading(true);

      const response = await apiClient.patch(`/purchase-orders/${id}/status`, { status: 'COMPLETED' });
      console.log("Mark as completed response:", response);

      const api = response.data;

      // 🔍 Validate real business success, not just HTTP success
      if (!api || api.status !== 'success') {
        throw new Error(api?.message || "Unexpected API response");
      }

      // Some APIs wrap data like { status, data: { isSuccess, error } }
      const business = api.data;

      if (business?.isSuccess === false) {
        throw new Error(business?.error || "Action not allowed");
      }

      showSuccess("Purchase order marked as completed");
      return business;

    } catch (error: any) {
      console.error("Mark as completed error:", error);
      showError(error?.message || error?.response?.data?.message || "Failed to update status");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPurchaseOrders = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `/purchase-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch purchase orders');
      }

      // Get current user from context or auth state
      if (!getCurrentUser) {
        throw new Error('User not found');
      }
      const currentUser = getCurrentUser;
      const responseData = response.data?.data?.data || response.data?.data || {};
      const purchaseOrders = responseData.purchaseOrders || [];

      // Filter POs based on user role and ownership
      const filteredPOs = purchaseOrders.filter((po: any) => {
        if (currentUser.role === 'ADMIN') {
          return true; // Admins can see all POs
        }
        return po.createdById === currentUser.id; // Regular users can only see their own POs
      });

      return {
        purchaseOrders: filteredPOs,
        total: responseData.total || 0,
        page: responseData.page || 1,
        limit: responseData.limit || 10,
        totalPages: responseData.totalPages || 0
      };
    } catch (error: any) {
      console.error('Get POs error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch purchase orders');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPurchaseOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/purchase-orders/${id}`);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to fetch purchase order');
      }

      return response.data?.data?.data;
    } catch (error: any) {
      console.error('Get PO error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to fetch purchase order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePurchaseOrder = async (id: string, data: PurchaseOrderFormData) => {
    try {
      setLoading(true);

      const response = await apiClient.put(`/purchase-orders/${id}`, data);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to update purchase order');
      }

      showSuccess('Purchase order updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('PO update error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to update purchase order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/purchase-orders/${id}`);

      if (!response.data || response.data.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to delete purchase order');
      }

      showSuccess('Purchase order deleted successfully');
    } catch (error: any) {
      console.error('Delete PO error:', error.response || error);
      showError(error.response?.data?.message || 'Failed to delete purchase order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add a helper function to check if user can submit PO
  const canSubmitPurchaseOrder = (po: any) => {
    if (!getCurrentUser) {
      throw new Error('User not found');
    }
    const currentUser = getCurrentUser; // You'll need to implement this
    return currentUser.role === 'ADMIN' || po.createdById === currentUser.id;
  };

  return {
    loading,
    createPurchaseOrder,
    submitForApproval,
    markAsCompleted,
    getPurchaseOrders,
    getPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    canSubmitPurchaseOrder, // Export the helper function
  };
}