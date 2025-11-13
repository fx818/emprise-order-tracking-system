import { useState, useCallback } from 'react';
import { useToast } from '../../../hooks/use-toast-app';
import apiClient from '../../../lib/utils/api-client';
import type { Offer, OfferFormData } from '../types/Offer';
import { getUser } from '../../../lib/utils/auth';

interface OffersResponse {
  offers: Offer[];
  total: number;
  pages: number;
}

export function useOffers() {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const getCurrentUser = getUser();

  const createOffer = async (data: OfferFormData) => {
    try {
      setLoading(true);
      
      if (!getCurrentUser) {
        throw new Error('User not found');
      }
      console.log("the data is", data);
      const apiData = {
        ...data,
        status: 'DRAFT'
      };
      
      const response = await apiClient.post('/budgetary-offers', apiData);
      console.log("the response is", response);
      showSuccess('Budgetary offer created successfully');
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to create budgetary offer');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateOffer = async (id: string, data: OfferFormData) => {
    try {
      setLoading(true);
      
      const apiData = {
        ...data
      };
      
      const response = await apiClient.put(`/budgetary-offers/${id}`, apiData);
      showSuccess('Budgetary offer updated successfully');
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to update budgetary offer');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async (id: string, options?: { 
    isAdminAutoApproval?: boolean;
    skipEmail?: boolean;
  }) => {
    try {
      setLoading(true);
      
      if (!getCurrentUser) {
        throw new Error('User not found');
      }
      const currentUser = getCurrentUser;

      // If admin is submitting their own offer, auto-approve it
      const isAdminSelfApproval = currentUser.role === 'ADMIN' && 
        options?.isAdminAutoApproval;

      await apiClient.post(`/budgetary-offers/${id}/submit`, {
        ...options,
        isAdminSelfApproval,
        skipEmail: isAdminSelfApproval ? true : options?.skipEmail
      });
      
      const message = isAdminSelfApproval
        ? 'Budgetary offer submitted and auto-approved'
        : 'Budgetary offer submitted for approval';
      
      showSuccess(message);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to submit budgetary offer');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (id: string, emailData: {
    to: string[];
    cc?: string[];
    subject: string;
    content: string;
  }) => {
    try {
      setLoading(true);
      await apiClient.post(`/budgetary-offers/${id}/send-email`, emailData);
      showSuccess('Email sent successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to send email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<OffersResponse>('/budgetary-offers');
      return response.data.offers;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch budgetary offers');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const getOffer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/budgetary-offers/${id}`);
      return response.data;
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch budgetary offer');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOffer = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/budgetary-offers/${id}`);
      showSuccess('Budgetary offer deleted successfully');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to delete budgetary offer');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createOffer,
    updateOffer,
    submitForApproval,
    sendEmail,
    getOffer,
    getOffers,
    deleteOffer,
  };
}