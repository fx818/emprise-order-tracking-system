import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { Invoice, BillStatus } from '../../loas/types/loa';

export interface CreateBillData {
  invoiceNumber?: string;
  invoiceAmount?: number;
  totalReceivables?: number;
  actualAmountReceived?: number;
  amountDeducted?: number;
  amountPending?: number;
  deductionReason?: string;
  billLinks?: string;
  remarks?: string;
  status?: BillStatus;
  invoicePdfFile?: File;
}

export interface UpdateBillData extends CreateBillData {}

export function useBills() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleError = (error: any, defaultMessage: string) => {
    console.error('API Error:', error);

    if (error?.response?.data?.message) {
      showError(error.response.data.message);
    } else {
      showError(defaultMessage);
    }

    throw error;
  };

  // Get all bills for an LOA
  const getBillsByLoaId = async (loaId: string): Promise<Invoice[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/loas/${loaId}/bills`);
      return response.data || [];
    } catch (error: any) {
      handleError(error, 'Failed to fetch bills');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get single bill by ID
  const getBillById = async (id: string): Promise<Invoice | null> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/bills/${id}`);
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to fetch bill');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new bill
  const createBill = async (loaId: string, data: CreateBillData): Promise<Invoice> => {
    try {
      setLoading(true);

      const formData = new FormData();

      if (data.invoiceNumber) formData.append('invoiceNumber', data.invoiceNumber);
      if (data.invoiceAmount !== undefined) formData.append('invoiceAmount', data.invoiceAmount.toString());
      if (data.totalReceivables !== undefined) formData.append('totalReceivables', data.totalReceivables.toString());
      if (data.actualAmountReceived !== undefined) formData.append('actualAmountReceived', data.actualAmountReceived.toString());
      if (data.amountDeducted !== undefined) formData.append('amountDeducted', data.amountDeducted.toString());
      if (data.amountPending !== undefined) formData.append('amountPending', data.amountPending.toString());
      if (data.deductionReason) formData.append('deductionReason', data.deductionReason);
      if (data.billLinks) formData.append('billLinks', data.billLinks);
      if (data.remarks) formData.append('remarks', data.remarks);
      if (data.status) formData.append('status', data.status);
      if (data.invoicePdfFile) formData.append('invoicePdfFile', data.invoicePdfFile);

      const response = await apiClient.post(`/loas/${loaId}/bills`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Bill created successfully');
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to create bill');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update a bill
  const updateBill = async (id: string, data: UpdateBillData): Promise<Invoice> => {
    try {
      setLoading(true);

      const formData = new FormData();

      if (data.invoiceNumber !== undefined) formData.append('invoiceNumber', data.invoiceNumber);
      if (data.invoiceAmount !== undefined) formData.append('invoiceAmount', data.invoiceAmount.toString());
      if (data.totalReceivables !== undefined) formData.append('totalReceivables', data.totalReceivables.toString());
      if (data.actualAmountReceived !== undefined) formData.append('actualAmountReceived', data.actualAmountReceived.toString());
      if (data.amountDeducted !== undefined) formData.append('amountDeducted', data.amountDeducted.toString());
      if (data.amountPending !== undefined) formData.append('amountPending', data.amountPending.toString());
      if (data.deductionReason !== undefined) formData.append('deductionReason', data.deductionReason);
      if (data.billLinks !== undefined) formData.append('billLinks', data.billLinks);
      if (data.remarks !== undefined) formData.append('remarks', data.remarks);
      if (data.status) formData.append('status', data.status);
      if (data.invoicePdfFile) formData.append('invoicePdfFile', data.invoicePdfFile);

      const response = await apiClient.put(`/bills/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Bill updated successfully');
      return response.data;
    } catch (error: any) {
      handleError(error, 'Failed to update bill');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete a bill
  const deleteBill = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await apiClient.delete(`/bills/${id}`);
      showSuccess('Bill deleted successfully');
    } catch (error: any) {
      handleError(error, 'Failed to delete bill');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getBillsByLoaId,
    getBillById,
    createBill,
    updateBill,
    deleteBill,
  };
}
