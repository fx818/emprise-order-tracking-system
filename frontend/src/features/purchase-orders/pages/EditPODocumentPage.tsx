// src/features/purchase-orders/pages/EditPODocumentPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Loader2, ArrowLeft, Edit } from "lucide-react";

import apiClient from "../../../lib/utils/api-client";
import { useToast } from "../../../hooks/use-toast-app";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";

import VendorEditModal from "../components/modals/VendorEditModal";
import ItemsEditModal from "../components/modals/ItemsEditModal";
import ChargesEditModal from "../components/modals/ChargesEditModal";

export default function EditPODocumentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [po, setPo] = useState<any>(null);

    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [showChargesModal, setShowChargesModal] = useState(false);

    const [unsaved, setUnsaved] = useState(false);

    const form = useForm({
        defaultValues: {
            titleText: "",
            requirementDesc: "",
            termsConditions: "",
            notes: "",
            shipToAddress: "",
            taxAmount: 0,
            totalAmount: 0   // <-- ADD THIS
        },
    });

    const markUnsaved = useCallback(() => setUnsaved(true), []);

    // Load PO
    useEffect(() => {
        async function fetchPO() {
            try {
                const res = await apiClient.get(`/purchase-orders/${id}`);
                const data = res.data.data.data;
                setPo(data);

                form.reset({
                    titleText: data.requirementDesc || "",
                    requirementDesc: data.requirementDesc || "",
                    termsConditions: data.termsConditions || "",
                    notes: data.notes || "",
                    shipToAddress: data.shipToAddress || "",
                    taxAmount: data.taxAmount,
                    totalAmount: data.totalAmount // <--- ADD THIS
                });
            } catch {
                showError("Failed to load purchase order");
            } finally {
                setLoading(false);
            }
        }
        fetchPO();
    }, [id]);

    // Warn before leaving unsaved page
    useEffect(() => {
        const warn = (event: any) => {
            if (unsaved) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [unsaved]);

    // Submit (Override PDF generation call)
    async function onSubmit(values: any) {
        try {
            setSaving(true);

            const overridePayload = {
                overrides: {
                    titleText: values.titleText,
                    requirementDesc: values.requirementDesc,
                    termsConditions: values.termsConditions,
                    notes: values.notes,
                    shipToAddress: values.shipToAddress,
                    taxAmount: Number(values.taxAmount),
                    totalAmount: Number(values.totalAmount), // <--- ADD THIS
                    vendor: po.vendor,
                    items: po.items,
                    additionalCharges: po.additionalCharges,
                }
            };

            const regen = await apiClient.post(`/purchase-orders/${id}/generate-pdf`, overridePayload);
            const newUrl = regen.data.data.url;

            showSuccess("PDF regenerated successfully");

            setPo((prev: any) => ({ ...prev, documentUrl: newUrl }));
            setUnsaved(false);

        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || "Failed to regenerate PDF");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <>
            {/* Vendor Modal */}
            {showVendorModal && (
                <VendorEditModal
                    vendor={po.vendor}
                    onClose={() => setShowVendorModal(false)}
                    onSave={(updatedVendor) => {
                        setPo((prev: any) => ({ ...prev, vendor: updatedVendor }));
                        markUnsaved();
                    }}
                />
            )}

            {/* Items Modal */}
            {showItemsModal && (
                <ItemsEditModal
                    items={po.items}
                    onClose={() => setShowItemsModal(false)}
                    onSave={(updatedItems) => {
                        setPo((prev: any) => ({ ...prev, items: updatedItems }));
                        markUnsaved();
                    }}
                />
            )}

            {/* Charges Modal */}
            {showChargesModal && (
                <ChargesEditModal
                    charges={po.additionalCharges}
                    onClose={() => setShowChargesModal(false)}
                    onSave={(updatedCharges) => {
                        setPo((prev: any) => ({ ...prev, additionalCharges: updatedCharges }));
                        markUnsaved();
                    }}
                />
            )}

            <div className="p-4 md:p-6 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate(`/purchase-orders/${id}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    {unsaved && <p className="text-sm text-red-600 font-medium animate-pulse">Unsaved changes…</p>}
                </div>

                {/* Layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* PDF Preview */}
                    <Card className="h-[85vh]">
                        <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                        <CardContent className="h-full">
                            {po?.documentUrl ? (
                                <iframe src={po.documentUrl} className="w-full h-full rounded border" />
                            ) : (
                                <div className="text-center text-muted-foreground mt-10">No PDF generated</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Form */}
                    <Card className="h-[85vh] overflow-y-auto">
                        <CardHeader><CardTitle>Edit Content</CardTitle></CardHeader>
                        <CardContent className="space-y-6">

                            {/* External Editors */}
                            <div className="flex flex-col gap-2">
                                <Button variant="outline" onClick={() => setShowVendorModal(true)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Vendor
                                </Button>

                                <Button variant="outline" onClick={() => setShowItemsModal(true)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Items
                                </Button>

                                <Button variant="outline" onClick={() => setShowChargesModal(true)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Charges
                                </Button>
                            </div>

                            {/* Editable fields */}

                            {/* <div>
                                <label className="font-medium block mb-1">Document Title</label>
                                <Textarea {...form.register("titleText")} onChange={markUnsaved} />
                            </div> */}

                            <div>
                                <label className="font-medium block mb-1">Requirement Description</label>
                                <Textarea rows={3} {...form.register("requirementDesc")} onChange={markUnsaved} />
                            </div>

                            <div>
                                <label className="font-medium block mb-1">Terms & Conditions</label>
                                <RichTextEditor
                                    value={form.watch("termsConditions")}
                                    onChange={(html) => { form.setValue("termsConditions", html); markUnsaved(); }}
                                />
                            </div>

                            <div>
                                <label className="font-medium block mb-1">Notes</label>
                                <RichTextEditor
                                    value={form.watch("notes")}
                                    onChange={(html) => { form.setValue("notes", html); markUnsaved(); }}
                                />
                            </div>

                            <div>
                                <label className="font-medium block mb-1">Shipping Address</label>
                                <Textarea rows={3} {...form.register("shipToAddress")} onChange={markUnsaved} />
                            </div>

                            <div>
                                <label className="font-medium block mb-1">Tax Amount (₹)</label>
                                <input
                                    type="number"
                                    className="border rounded p-2 w-full"
                                    {...form.register("taxAmount")}
                                    onChange={markUnsaved}
                                />
                            </div>

                            {/* Total Amount */}
                            <div>
                                <label className="font-medium mb-1 block">Total Amount (₹)</label>
                                <input
                                    type="number"
                                    className="border rounded p-2 w-full"
                                    {...form.register("totalAmount")}
                                    onChange={markUnsaved}
                                />
                            </div>


                            <Button className="w-full" disabled={saving} onClick={form.handleSubmit(onSubmit)}>
                                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating…</> : "Save & Regenerate"}
                            </Button>

                        </CardContent>
                    </Card>

                </div>
            </div>
        </>
    );
}
