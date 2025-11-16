// src/features/purchase-orders/components/modals/VendorEditModal.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";

interface Props {
  vendor: any;
  onClose: () => void;
  onSave: (vendor: any) => void;
}

export default function VendorEditModal({ vendor, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: vendor.name || "",
    address: vendor.address || "",
    gstin: vendor.gstin || "",
    mobile: vendor.mobile || "",
    email: vendor.email || ""
  });

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Vendor Name" />

          <Textarea rows={3} value={form.address}
            onChange={(e) => updateField("address", e.target.value)} placeholder="Address" />

          <Input value={form.gstin} onChange={(e) => updateField("gstin", e.target.value)} placeholder="GSTIN" />

          <Input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} placeholder="Mobile" />

          <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(form); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
