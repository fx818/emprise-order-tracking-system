import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useVendors } from "../hooks/use-vendors";
import { useToast } from "../../../hooks/use-toast-app";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import type { VendorFormData } from "../types/vendor";

const initialFormState: VendorFormData = {
  name: "",
  email: "",
  mobile: "",
  gstin: "",
  address: "",
  remarks: "",
  bankDetails: {
    accountNumber: "",
    accountName: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
  }
};

export function VendorForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVendor, createVendor, updateVendor } = useVendors();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingVendor, setFetchingVendor] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(initialFormState);

  // Fetch vendor data if editing
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!id) return;

      try {
        setFetchingVendor(true);
        const vendorData = await getVendor(id);
        setFormData({
          name: vendorData.name,
          email: vendorData.email,
          mobile: vendorData.mobile,
          gstin: vendorData.gstin || "",
          address: vendorData.address,
          remarks: vendorData.remarks || "",
          bankDetails: {
            accountNumber: vendorData.bankDetails?.accountNumber || "",
            accountName: vendorData.bankDetails?.accountName || "",
            bankName: vendorData.bankDetails?.bankName || "",
            branchName: vendorData.bankDetails?.branchName || "",
            ifscCode: vendorData.bankDetails?.ifscCode || "",
          },
        });
      } catch (error) {
        console.error("Error fetching vendor:", error);
        showError("Failed to fetch vendor details");
        navigate("/vendors");
      } finally {
        setFetchingVendor(false);
      }
    };

    fetchVendorData();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        showError('Vendor name is required');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showError('Please enter a valid email address');
        return;
      }

      // Mobile validation (10 digits)
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(formData.mobile)) {
        showError('Please enter a valid 10-digit mobile number');
        return;
      }

      // Address validation
      if (!formData.address.trim()) {
        showError('Address is required');
        return;
      }

      // GSTIN validation (optional)
      if (formData.gstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstin)) {
          showError('Please enter a valid GSTIN');
          return;
        }
      }

      // Bank Details validation
      if (!formData.bankDetails.accountNumber.trim()) {
        showError('Account number is required');
        return;
      }

      if (!formData.bankDetails.accountName.trim()) {
        showError('Account name is required');
        return;
      }

      if (!formData.bankDetails.bankName.trim()) {
        showError('Bank name is required');
        return;
      }

      if (!formData.bankDetails.branchName.trim()) {
        showError('Branch name is required');
        return;
      }

      // IFSC validation
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(formData.bankDetails.ifscCode)) {
        showError('Please enter a valid IFSC code');
        return;
      }

      setLoading(true);
      if (id) {
        await updateVendor(id, formData);
      } else {
        await createVendor(formData);
      }
      showSuccess(id ? 'Vendor updated successfully' : 'Vendor created successfully');
      navigate("/vendors");
    } catch (error) {
      console.error("Error saving vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("bankDetails.")) {
      const bankField = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [bankField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (fetchingVendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => navigate("/vendors")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {id ? "Edit Vendor" : "Add New Vendor"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit Vendor Details" : "Vendor Details"}</CardTitle>
          <CardDescription>
            {id ? "Update the vendor information below" : "Enter the vendor information below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Vendor Name *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter vendor name"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mobile *</label>
                  <Input
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">GSTIN</label>
                  <Input
                    name="gstin"
                    value={formData.gstin || ""}
                    onChange={handleInputChange}
                    placeholder="Enter GSTIN"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Remarks</label>
                  <Input
                    name="remarks"
                    value={formData.remarks || ""}
                    onChange={handleInputChange}
                    placeholder="Enter remarks"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Address *</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter complete address"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Account Name *</label>
                  <Input
                    name="bankDetails.accountName"
                    value={formData.bankDetails.accountName}
                    onChange={handleInputChange}
                    placeholder="Enter account name"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Account Number *</label>
                  <Input
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter account number"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bank Name *</label>
                  <Input
                    name="bankDetails.bankName"
                    value={formData.bankDetails.bankName}
                    onChange={handleInputChange}
                    placeholder="Enter bank name"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch Name *</label>
                  <Input
                    name="bankDetails.branchName"
                    value={formData.bankDetails.branchName}
                    onChange={handleInputChange}
                    placeholder="Enter branch name"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">IFSC Code *</label>
                  <Input
                    name="bankDetails.ifscCode"
                    value={formData.bankDetails.ifscCode}
                    onChange={handleInputChange}
                    placeholder="Enter IFSC code"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/vendors")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {id ? "Updating..." : "Create"}
                  </>
                ) : (
                  id ? "Update" : "Create"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}