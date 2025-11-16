import { useState, useCallback } from "react";
import { useToast } from "../../../hooks/use-toast-app";
import apiClient from "../../../lib/utils/api-client";
import type { Vendor, VendorFormData } from "../types/vendor";

export function useVendors() {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]); // ✅ NEW
  const { showSuccess, showError } = useToast();

  /**
   * ------------------------------------------------------
   * FETCH ALL VENDORS (stores list in state)
   * ------------------------------------------------------
   */
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/vendors");

      if (
        response.data?.status === "success" &&
        response.data?.data?.isSuccess
      ) {
        const list = response.data.data.data.vendors;
        setVendors(list); // ✅ store list
        return list;
      } else {
        console.error("Unexpected API response:", response.data);
        throw new Error("Invalid API structure");
      }
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      showError(error.response?.data?.message || "Failed to fetch vendors");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * ------------------------------------------------------
   * GET SINGLE VENDOR
   * ------------------------------------------------------
   */
  const getVendor = useCallback(
    async (id: string) => {
      try {
        const response = await apiClient.get(`/vendors/${id}`);

        if (
          response.data?.status === "success" &&
          response.data?.data?.isSuccess
        ) {
          return response.data.data.data;
        } else {
          console.error("Unexpected API response:", response.data);
          throw new Error("Invalid API response");
        }
      } catch (error: any) {
        console.error("Error fetching vendor detail:", error);
        showError(
          error.response?.data?.message || "Failed to fetch vendor details"
        );
        throw error;
      }
    },
    [showError]
  );

  /**
   * ------------------------------------------------------
   * CREATE VENDOR
   * ------------------------------------------------------
   */
  const createVendor = useCallback(
    async (data: VendorFormData) => {
      try {
        setLoading(true);

        const payload = {
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
            ifscCode: data.bankDetails.ifscCode,
          },
        };

        const response = await apiClient.post("/vendors", payload);

        if (response.data?.status === "success") {
          showSuccess("Vendor created successfully");
          // refresh vendor list automatically
          fetchVendors(); // ✅ NEW
          return response.data.data;
        } else {
          throw new Error(response.data?.message || "Vendor creation failed");
        }
      } catch (error: any) {
        console.error("Create vendor error:", error);
        showError(error.response?.data?.message || "Failed to create vendor");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showSuccess, showError, fetchVendors]
  );

  /**
   * ------------------------------------------------------
   * UPDATE VENDOR
   * ------------------------------------------------------
   */
  const updateVendor = useCallback(
    async (id: string, data: VendorFormData) => {
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
          },
        });

        if (response.data?.status === "success") {
          showSuccess("Vendor updated successfully");
          fetchVendors(); // ✅ NEW
          return response.data.data;
        } else {
          throw new Error("Failed to update vendor");
        }
      } catch (error: any) {
        console.error("Vendor update error:", error);
        showError(
          error.response?.data?.message || "Failed to update vendor"
        );
        throw error;
      }
    },
    [showSuccess, showError, fetchVendors]
  );

  /**
   * ------------------------------------------------------
   * UPDATE VENDOR STATUS
   * ------------------------------------------------------
   */
  const updateVendorStatus = useCallback(
    async (id: string, status: Vendor["status"]) => {
      try {
        setLoading(true);
        const response = await apiClient.patch(`/vendors/${id}/status`, {
          status,
        });

        if (
          response.data?.status === "success" &&
          response.data?.data?.isSuccess
        ) {
          showSuccess("Vendor status updated");
          fetchVendors(); // ✅ NEW
          return response.data.data.data;
        } else {
          throw new Error("Failed to update vendor status");
        }
      } catch (error: any) {
        showError(
          error.response?.data?.message || "Failed to update vendor status"
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showSuccess, showError, fetchVendors]
  );

  /**
   * ------------------------------------------------------
   * OTHER VENDOR-ITEM FUNCTIONS (UNCHANGED)
   * ------------------------------------------------------
   */
  const getVendorItems = useCallback(
    async (vendorId: string) => {
      try {
        const response = await apiClient.get(`/vendors/${vendorId}/items`);
        return response.data.data.data;
      } catch (error: any) {
        showError(
          error.response?.data?.message || "Failed to fetch vendor items"
        );
        throw error;
      }
    },
    [showError]
  );

  const addItem = useCallback(
    async (vendorId: string, data: { itemId: string; unitPrice: number }) => {
      try {
        setLoading(true);
        const response = await apiClient.post(`/vendors/${vendorId}/items`, data);
        showSuccess("Item added to vendor");
        return response.data.data.data;
      } catch (error: any) {
        showError(error.response?.data?.message || "Failed to add item");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showSuccess, showError]
  );

  const updateItemPrice = useCallback(
    async (vendorId: string, itemId: string, unitPrice: number) => {
      try {
        setLoading(true);
        const response = await apiClient.put(
          `/vendors/${vendorId}/items/${itemId}`,
          { unitPrice }
        );
        showSuccess("Item price updated");
        return response.data.data.data;
      } catch (error: any) {
        showError(error.response?.data?.message || "Failed to update price");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showSuccess, showError]
  );

  const removeItem = useCallback(
    async (vendorId: string, itemId: string) => {
      try {
        setLoading(true);
        await apiClient.delete(`/vendors/${vendorId}/items/${itemId}`);
        showSuccess("Item removed");
      } catch (error: any) {
        showError(error.response?.data?.message || "Failed to remove item");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showSuccess, showError]
  );

  const getItemVendors = useCallback(
    async (itemId: string) => {
      try {
        const response = await apiClient.get(`/items/${itemId}/vendors`);
        return response.data.data.data;
      } catch (error: any) {
        showError(
          error.response?.data?.message || "Failed to fetch item vendors"
        );
        throw error;
      }
    },
    [showError]
  );

  const deleteVendor = useCallback(
    async (id: string) => {
      try {
        setLoading(true);

        const response = await apiClient.delete(`/vendors/${id}`);
        console.log("Vendor Deletion Response:", response);

        // 1️⃣ Handle success for correctly returned 204 No Content
        if (response.status === 204) {
          showSuccess("Vendor deleted successfully");
          await fetchVendors();
          return { status: "success" };
        }

        // 2️⃣ Handle backend JSON success fallback (if server ever switches)
        if (response.data?.status === "success") {
          showSuccess("Vendor deleted successfully");
          await fetchVendors();
          return response.data;
        }

        // 3️⃣ If neither case above is true, treat as failure
        const backendMsg =
          response.data?.message ||
          response.data?.error ||
          response.data?.details ||
          response.data?.cause ||
          "Vendor deletion failed.";

        showError(backendMsg);
        throw new Error(backendMsg);
      }
      catch (error: any) {
        console.group("❌ Vendor Deletion Error - Full Trace");
        console.error("Raw error:", error);
        console.error("Axios response:", error?.response);
        console.error("Axios data:", error?.response?.data);
        console.groupEnd();

        let message = "Failed to delete vendor.";

        const res = error?.response;
        const data = res?.data;

        if (data) {
          message =
            data?.message ||
            data?.error ||
            data?.details ||
            data?.cause ||
            (Array.isArray(data?.errors)
              ? data.errors.map((e: any) => e.message).join(", ")
              : message);
        }

        // Foreign key / dependency constraint errors
        if (
          typeof data?.error === "string" &&
          data.error.toLowerCase().includes("foreign key")
        ) {
          message =
            "Vendor cannot be deleted because it is associated with existing Purchase Orders, Items or Transactions.";
        }

        // HTTP Status based messages
        if (res?.status === 403) message = "You do not have permission to delete this vendor.";
        if (res?.status === 404) message = "Vendor not found or already deleted.";

        // Network issues
        if (error?.code === "ERR_NETWORK") message = "Network error — please check your connection.";
        if (error?.code === "ECONNABORTED") message = "Request timeout. Server took too long.";

        showError(message);
        throw new Error(message);
      }
      finally {
        setLoading(false);
      }
    },
    [showSuccess, showError, fetchVendors]
  );



  /**
   * ------------------------------------------------------
   * RETURN API
   * ------------------------------------------------------
   */
  return {
    loading,
    vendors,       // ✅ added
    fetchVendors,  // ✅ added
    deleteVendor,
    getVendors: fetchVendors, // old raw fetch (still available)
    getVendor,
    createVendor,
    updateVendor,
    updateVendorStatus,
    getVendorItems,
    addItem,
    updateItemPrice,
    removeItem,
    getItemVendors,
  };
}
