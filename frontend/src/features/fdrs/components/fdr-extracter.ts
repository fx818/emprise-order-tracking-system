import apiClient from "../../../lib/utils/api-client";

interface FDRExtractionResult {
  depositAmount: number | null;
  maturityValue: number | null;
  bankName: string | null;
  maturityDate: string | null;
  dateOfDeposit: string | null;
  accountNo: string | null;
  fdrNumber: string | null;
  accountName: string | null;
}

export async function extractFDRData(file: File): Promise<FDRExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    // ✅ API request
    const response = await apiClient.post<{ status: string; data: FDRExtractionResult }>(
      "/fdrs/extract-from-file",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    // ✅ Validate response structure
    if (!response?.data?.data) {
      console.error("Invalid API response:", response.data);
      throw new Error("Invalid response from server. Please try again.");
    }

    return response.data.data;
  } catch (error: any) {
    console.error("Error during FDR extraction:", error);

    // ✅ Handle common error cases
    if (error.response) {
      // Server responded with an error
      const message =
        error.response.data?.message ||
        `Server error: ${error.response.statusText || "Unknown"}`;
      throw new Error(message);
    } else if (error.request) {
      // No response received
      throw new Error("No response from server. Please check your internet connection.");
    } else {
      // Something else went wrong
      throw new Error(error.message || "Unexpected error during FDR data extraction.");
    }
  }
}
