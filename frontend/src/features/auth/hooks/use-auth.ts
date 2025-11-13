import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../lib/stores/auth-store';

import apiClient from '../../../lib/utils/api-client';
import { getDefaultRouteForRole, setAuthToken, setUser } from '../../../lib/utils/auth';
import type { LoginFormData, RegisterFormData } from '../types/auth';
import { useToast } from '../../../hooks/use-toast';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser: setStoreUser, setIsAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const handleError = (error: any, fallbackTitle = "Error") => {
    console.error("Auth error:", error);

    const backendMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong. Please try again.";

    toast({
      variant: "destructive",
      title: fallbackTitle,
      description: backendMessage,
    });
  };


  const login = async (credentials: LoginFormData) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/login', credentials);
      const { token, user } = response.data;

      setAuthToken(token);
      setUser(user);
      setStoreUser(user);
      setIsAuthenticated(true);

      toast({
        title: "Success",
        description: "Successfully logged in. Welcome back!",
      });

      const defaultRoute = getDefaultRouteForRole(user.role);
      navigate(defaultRoute);
    } catch (error: any) {
      handleError(error, "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/register', data);
      const { token, user } = response.data;

      setAuthToken(token);
      setUser(user);
      setStoreUser(user);
      setIsAuthenticated(true);

      toast({
        title: "Success",
        description: "Account created successfully. Welcome!",
      });

      const defaultRoute = getDefaultRouteForRole(user.role);
      navigate(defaultRoute);
    } catch (error: any) {
      handleError(error, "Registration Failed");
    } finally {
      setLoading(false);
    }
  };


  return {
    login,
    register,
    loading,
  };
}