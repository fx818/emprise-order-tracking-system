// src/features/items/hooks/use-items.ts
import { useState, useCallback } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { ItemFormData } from '../types/item';

export function useItems() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const getItems = useCallback(async () => {
    try {
      const response = await apiClient.get('/items');
      return response.data.data.data.items;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch items');
      throw error;
    }
  }, [showError]);

  const getItem = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/items/${id}`);
      return response.data.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch item');
      throw error;
    }
  }, [showError]);
  const createItem = useCallback(async (data: ItemFormData) => {
    try {
      setLoading(true);

      const payload = {
        name: data.name,
        description: data.description,
        uom: data.uom,
        hsnCode: data.hsnCode,
        vendors: data.vendors || [],   // ✅ IMPORTANT
      };

      const response = await apiClient.post("/items", payload);

      showSuccess("Item created successfully");
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to create item");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);


  // const createItem = useCallback(async (data: ItemFormData) => {
  //   try {
  //     const response = await apiClient.post('/items', {
  //       ...data,
  //       unitPrice: 0,
  //     });

  //     return response.data.data;

  //   } catch (error: any) {
  //     console.error("Create Item Error:", error);

  //     const res = error?.response?.data;

  //     // If backend sent validation errors (array)
  //     if (Array.isArray(res?.error) && res.error.length > 0) {
  //       const firstMsg = res.error[0].message;
  //       showError(firstMsg);
  //       throw error;
  //     }

  //     // If backend sent a simple message
  //     if (res?.message) {
  //       showError(res.message);
  //       throw error;
  //     }

  //     // Fallback
  //     showError("Failed to create item");
  //     throw error;
  //   }
  // }, [showError]);


  const updateItem = useCallback(async (id: string, data: ItemFormData) => {
    try {
      const response = await apiClient.put(`/items/${id}`, {
        ...data,
        unitPrice: 0
      });
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update item');
      throw error;
    }
  }, [showError]);
  const deleteItem = useCallback(async (id: string) => {
    try {
      setLoading(true);

      await apiClient.delete(`/items/${id}`);

      showSuccess("Item deleted successfully");
      return true;

    } catch (error: any) {
      let msg = "Failed to delete item";
      console.log("Delete Item Error:", error.response.data.message);
      // Backend AppError returns: { message: "..." }
      if (error.response.data.message) {
        msg = error.response.data.message;
      }

      // Prisma FK error message from backend
      if (
        msg.includes("purchase orders") ||
        msg.includes("P2003")
      ) {
        msg =
          "This item cannot be deleted because it is already used in purchase orders.";
      }

      showError(msg);
      return false;

    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);


  const addVendor = useCallback(async (itemId: string, data: { vendorId: string; unitPrice: number }) => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/items/${itemId}/vendors`, data);
      showSuccess('Vendor added successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to add vendor');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const updateVendor = useCallback(async (itemId: string, vendorId: string, data: { unitPrice: number }) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/vendors/${vendorId}/items/${itemId}`, data);
      showSuccess('Vendor price updated successfully');
      return response.data.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update vendor price');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const removeVendor = useCallback(async (itemId: string, vendorId: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/vendors/${vendorId}/items/${itemId}`);
      showSuccess('Vendor removed successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to remove vendor');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  return {
    loading,
    getItems,
    getItem,
    deleteItem,
    createItem,
    updateItem,
    addVendor,
    updateVendor,
    removeVendor,
  };
}