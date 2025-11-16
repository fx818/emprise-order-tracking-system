// src/features/purchase-orders/components/modals/ChargesEditModal.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

interface Props {
  charges: any[];
  onClose: () => void;
  onSave: (charges: any[]) => void;
}

export default function ChargesEditModal({ charges, onClose, onSave }: Props) {
  const [list, setList] = useState([...charges]);

  const addCharge = () => {
    setList([...list, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };

  const updateField = (i: number, key: string, val: any) => {
    const updated = [...list];
    updated[i][key] = val;
    setList(updated);
  };

  const deleteRow = (i: number) => setList(list.filter((_, idx) => idx !== i));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Additional Charges</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {list.map((c, i) => (
            <div key={c.id} className="p-3 border rounded space-y-2">
              <Input placeholder="Description" value={c.description}
                onChange={(e) => updateField(i, "description", e.target.value)} />

              <Input placeholder="Amount" type="number" value={c.amount}
                onChange={(e) => updateField(i, "amount", Number(e.target.value))} />

              <Button size="sm" variant="destructive" onClick={() => deleteRow(i)}>Remove</Button>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={addCharge}>+ Add Charge</Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(list); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
