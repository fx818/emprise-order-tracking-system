// src/features/items/components/ItemList.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  MoreHorizontal,
  Package,
  Plus,
} from "lucide-react";
import {
  Card
} from "../../../components/ui/card";
import { useItems } from "../hooks/use-items";
import type { Item } from "../types/item";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { Column, DataTable } from "../../../components/data-display/DataTable";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";

export function ItemList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getItems } = useItems();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return; // Skip if already fetched

    async function loadItems() {
      try {
        setIsLoading(true);
        const data = await getItems();
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchedRef.current = true;
    loadItems();
  }, []); // Empty dependency array

  // const handleStatusToggle = async (itemId: string) => {
  //   try {
  //     await toggleItemStatus(itemId);
  //     // Refresh the items list after toggling status
  //     const updatedItems = await getItems();
  //     setItems(Array.isArray(updatedItems) ? updatedItems : []);
  //   } catch (error) {
  //     console.error("Failed to toggle item status:", error);
  //   }
  // };

  const columns = [
    {
      header: ({ sortable }: { sortable: boolean }) => (
        <div className="flex items-center">
          Item Name
          {sortable && (
            <Button variant="ghost" className="ml-2 h-8 w-8 p-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      accessor: (row: Item) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-muted-foreground">{row.description}</div>
        </div>
      ),
    },
    // {
    //   header: "Base Price",
    //   accessor: (row: Item) =>
    //     new Intl.NumberFormat("en-IN", {
    //       style: "currency",
    //       currency: "INR",
    //     }).format(row.unitPrice),
    // },
    {
      header: "HSN Code",
      accessor: "hsnCode",
    },
    {
      header: "Vendors",
      accessor: (row: Item) => (
        <div className="flex ml-3">
          <span>{row.vendors.length}</span>
          {/* {row.vendors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/items/${row.id}/vendors`);
              }}
            >
              View
            </Button>
          )} */}
        </div>
      ),
    },
    {
      header: "Actions",
      accessor: (row: Item) => (
        <div className="flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/items/${row.id}/edit`);
                }}
              >
                <Package className="mr-2 h-4 w-4" />
                Edit Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filteredData = (data: Item[]) => {
    if (!Array.isArray(data)) return [];
    
    return data.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, description, or HSN code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md"
            />
          </div>
          <Button onClick={() => navigate("/items/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Item
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns as Column<Item>[]}
          data={filteredData(items)}
          loading={isLoading}
          onRowClick={(row) => navigate(`/items/${row.id}`)}
        />
      )}
    </div>
  );
}