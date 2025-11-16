// src/features/purchase-orders/components/modals/ItemsEditModal.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

interface Props {
  items: any[];
  onClose: () => void;
  onSave: (items: any[]) => void;
}

export default function ItemsEditModal({ items, onClose, onSave }: Props) {
  const [list, setList] = useState([...items]);

  const updateItem = (index: number, key: string, value: any) => {
    const updated = [...list];
    updated[index][key] = value;
    setList(updated);
  };

  const addItem = () => {
    setList([...list, {
      id: crypto.randomUUID(),
      item: { name: "", description: "", unitPrice: 0, uom: "", hsnCode: "" },
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0
    }]);
  };

  const deleteItem = (index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const recalc = (index: number) => {
    const updated = [...list];
    updated[index].totalAmount = Number(updated[index].unitPrice) * Number(updated[index].quantity);
    setList(updated);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {list.map((row, i) => (
            <div key={row.id} className="border rounded-md p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Item Name" value={row.item.name}
                  onChange={(e) => updateItem(i, "item", { ...row.item, name: e.target.value })} />
                <Input placeholder="UOM" value={row.item.uom}
                  onChange={(e) => updateItem(i, "item", { ...row.item, uom: e.target.value })} />
              </div>

              <textarea
                className="w-full border rounded-md p-2"
                placeholder="Description"
                value={row.item.description}
                onChange={(e) => updateItem(i, "item", { ...row.item, description: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="Unit Price" value={row.unitPrice}
                  onChange={(e) => { updateItem(i, "unitPrice", e.target.value); recalc(i); }} />
                <Input type="number" placeholder="Qty" value={row.quantity}
                  onChange={(e) => { updateItem(i, "quantity", e.target.value); recalc(i); }} />
                <Input disabled value={row.totalAmount} />
              </div>

              <Button variant="destructive" size="sm" onClick={() => deleteItem(i)}>Delete</Button>
            </div>
          ))}

          <Button variant="outline" onClick={addItem} className="w-full">+ Add Item</Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(list); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
