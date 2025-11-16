import { useState, useCallback } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { Vendor, VendorFormData } from '../types/vendor';

export function useVendors() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const getVendors = useCallback(async () => {
    try {
      const response = await apiClient.get('/vendors');

      // Check if the response has the expected structure
      if (response.data?.status === 'success' && response.data?.data?.isSuccess) {
        return response.data.data.data.vendors;
      } else {
        console.error('Unexpected API response structure:', response.data);
        throw new Error('Invalid API response structure');
      }
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      showError(error.response?.data?.message || 'Failed to fetch vendors');
      throw error;
    }
  }, [showError]);

  const getVendor = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/vendors/${id}`);

      if (response.data?.status === 'success' && response.data?.data?.isSuccess) {
        return response.data.data.data;
      } else {
        console.error('Unexpected API response structure:', response.data);
        throw new Error('Invalid API response structure');
      }
    } catch (error: any) {
      console.error('Error fetching vendor details:', error);
      showError(error.response?.data?.message || 'Failed to fetch vendor');
      throw error;
    }
  }, [showError]);

  const createVendor = useCallback(async (data: VendorFormData) => {
    try {
      setLoading(true);
      const vendorData = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        gstin: data.gstin || null,
        address: data.address,
        remarks: data.remarks,
        bankDetails: {
          accountNumber: data.bankDetails.accountNumber,
          accountName: data.bankDetails.accountName,
          bankName: data.bankDetails.bankName,
          branchName: data.bankDetails.branchName,
          ifscCode: data.bankDetails.ifscCode
        }
      };


      const response = await apiClient.post('/vendors', vendorData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.status === 'success') {
        showSuccess('Vendor created successfully');
        return response.data.data;
      } else {
        console.error('API Error Response:', response.data);
        throw new Error(response.data?.message || 'Failed to create vendor');
      }
    } catch (error: any) {
      console.error('Detailed error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      showError(error.response?.data?.message || error.message || 'Failed to create vendor');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const updateVendor = useCallback(async (id: string, data: VendorFormData) => {
    try {
      const response = await apiClient.put(`/vendors/${id}`, {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        address: data.address,
        gstin: data.gstin,
        remarks: data.remarks,
        bankDetails: {
          bankName: data.bankDetails.bankName,
          accountNumber: data.bankDetails.accountNumber,
          ifscCode: data.bankDetails.ifscCode,
          branchName: data.bankDetails.branchName,
        }
      });

      if (response.data?.status === 'success') {
        showSuccess('Vendor updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update vendor');
      }
    } catch (error: any) {
      console.error('Error updating vendor:', error.response || error);
      showError(error.response?.data?.message || 'Failed to update vendor');
      throw error;
    }
  }, [showSuccess, showError]);

  const updateVendorStatus = useCallback(async (id: string, status: Vendor['status']) => {
    try {
      setLoading(true);
      const response = await apiClient.patch(`/vendors/${id}/status`, { status });

      if (response.data?.status === 'success' && response.data?.data?.isSuccess) {
        showSuccess('Vendor status updated successfully');
        return response.data.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update vendor status');
      }
    } catch (error: any) {
      console.error('Error updating vendor status:', error);
      showError(error.response?.data?.message || 'Failed to update vendor status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // const rateVendorPerformance = async (
  //   id: string,
  //   rating: Omit<PerformanceRating, 'ratedAt' | 'ratedBy'>
  // ) => {
  //   try {
  //     setLoading(true);
  //     const response = await apiClient.post(`/vendors/${id}/ratings`, {
  //       ...rating,
  //     });
  //     showSuccess('Vendor rating submitted successfully');
  //     return response.data;
  //   } catch (error: any) {
  //     showError(error.response?.data?.message || 'Failed to submit vendor rating');
  //     throw error;
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getVendorItems = useCallback(async (vendorId: string) => {
    try {
      const response = await apiClient.get(`/vendors/${vendorId}/items`);
      return response.data.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch vendor items');
      throw error;
    }
  }, [showError]);

  const addItem = useCallback(async (vendorId: string, data: { itemId: string; unitPrice: number }) => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/vendors/${vendorId}/items`, data);
      showSuccess('Item added successfully');
      return response.data.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to add item');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const updateItemPrice = useCallback(async (vendorId: string, itemId: string, unitPrice: number) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/vendors/${vendorId}/items/${itemId}`, { unitPrice });
      showSuccess('Item price updated successfully');
      return response.data.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update item price');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const removeItem = useCallback(async (vendorId: string, itemId: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/vendors/${vendorId}/items/${itemId}`);
      showSuccess('Item removed successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to remove item');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const getItemVendors = useCallback(async (itemId: string) => {
    try {
      const response = await apiClient.get(`/items/${itemId}/vendors`);
      return response.data.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch item vendors');
      throw error;
    }
  }, [showError]);

  return {
    loading,
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    updateVendorStatus,
    // rateVendorPerformance,
    getVendorItems,
    addItem,
    updateItemPrice,
    removeItem,
    getItemVendors,
  };
}
