import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Edit, FileText, ArrowDownToLine, RefreshCcw, ArrowLeft, ExternalLink, CalendarIcon, Building2, Banknote } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { useTenders } from '../hooks/use-tenders';
import { Tender, TenderStatus, EMDReturnStatus } from '../types/tender';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { useLOAs } from '../../loas/hooks/use-loas';
import type { LOA } from '../../loas/types/loa';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from '../../../components/ui/label';

export function TenderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [associatedLoas, setAssociatedLoas] = useState<LOA[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLoas, setLoadingLoas] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TenderStatus | ''>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEMDReturnDialogOpen, setIsEMDReturnDialogOpen] = useState(false);
  const [selectedEMDReturnStatus, setSelectedEMDReturnStatus] = useState<EMDReturnStatus | ''>('');
  const [emdReturnDate, setEmdReturnDate] = useState<string>('');
  const [emdReturnAmount, setEmdReturnAmount] = useState<string>('');
  const [isUpdatingEMDStatus, setIsUpdatingEMDStatus] = useState(false);
  const navigate = useNavigate();
  const { getTenderById, updateTenderStatus, updateEMDReturnStatus } = useTenders();
  const { getLoasByTender } = useLOAs();

  useEffect(() => {
    let isMounted = true;

    const fetchTender = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getTenderById(id);
        if (isMounted) {
          setTender(data);
          setSelectedStatus(data.status);
        }
      } catch (error) {
        console.error('Failed to fetch tender', error);
        if (isMounted) {
          navigate('/tenders');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTender();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Fetch associated LOAs
  useEffect(() => {
    let isMounted = true;

    const fetchAssociatedLoas = async () => {
      if (!id) return;

      try {
        setLoadingLoas(true);
        const loas = await getLoasByTender(id);
        if (isMounted) {
          setAssociatedLoas(loas);
        }
      } catch (error) {
        console.error('Failed to fetch associated LOAs', error);
        if (isMounted) {
          setAssociatedLoas([]);
        }
      } finally {
        if (isMounted) {
          setLoadingLoas(false);
        }
      }
    };

    if (tender) {
      fetchAssociatedLoas();
    }

    return () => {
      isMounted = false;
    };
  }, [id, tender]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge>Active</Badge>;
      case 'RETENDERED':
        return <Badge variant="secondary">Retendered</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'AWARDED':
        return <Badge variant="outline">Awarded</Badge>;
      case 'NOT_AWARDED':
        return <Badge variant="secondary">Not Awarded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLoaStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <Badge variant="secondary">Not Started</Badge>;
      case 'IN_PROGRESS':
        return <Badge>In Progress</Badge>;
      case 'SUPPLY_WORK_COMPLETED':
        return <Badge variant="outline">Work Completed</Badge>;
      case 'CHASE_PAYMENT':
        return <Badge>Chase Payment</Badge>;
      case 'CLOSED':
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEMDReturnStatusBadge = (status: EMDReturnStatus | null | undefined) => {
    if (!status) return <Badge variant="secondary">Pending</Badge>;

    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'RELEASED':
        return <Badge className="bg-green-500">Released</Badge>;
      case 'RETAINED_AS_SD':
        return <Badge variant="outline">Retained as SD</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusUpdate = async () => {
    if (!id || !tender || !selectedStatus || selectedStatus === tender.status) {
      setIsStatusDialogOpen(false);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const updatedTender = await updateTenderStatus(id, selectedStatus);
      setTender(updatedTender);
      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error('Failed to update tender status', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEMDReturnStatusUpdate = async () => {
    if (!id || !tender || !selectedEMDReturnStatus) {
      setIsEMDReturnDialogOpen(false);
      return;
    }

    try {
      setIsUpdatingEMDStatus(true);
      const updatedTender = await updateEMDReturnStatus(
        id,
        selectedEMDReturnStatus,
        emdReturnDate ? new Date(emdReturnDate) : undefined,
        emdReturnAmount ? parseFloat(emdReturnAmount) : undefined
      );
      setTender(updatedTender);
      setIsEMDReturnDialogOpen(false);
      setEmdReturnDate('');
      setEmdReturnAmount('');
    } catch (error) {
      console.error('Failed to update EMD return status', error);
    } finally {
      setIsUpdatingEMDStatus(false);
    }
  };

  const openEMDReturnDialog = () => {
    setSelectedEMDReturnStatus(tender?.emdReturnStatus || 'PENDING');
    setEmdReturnDate(tender?.emdReturnDate ? format(new Date(tender.emdReturnDate), 'yyyy-MM-dd') : '');
    setEmdReturnAmount(tender?.emdReturnAmount?.toString() || '');
    setIsEMDReturnDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!tender) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">Tender not found</h2>
        <Button onClick={() => navigate('/tenders')}>Back to Tenders</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tender.tenderNumber} | Emprise Order Tracking</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/tenders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tenders
            </Button>
            <h1 className="text-2xl font-bold">{tender.tenderNumber}</h1>
            {getStatusBadge(tender.status)}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(true)}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Update Status
            </Button>
            <Button onClick={() => navigate(`/tenders/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Tender
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tender Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                  <p className="font-medium">{format(new Date(tender.dueDate), 'PPP')}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div>{getStatusBadge(tender.status)}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="whitespace-pre-wrap">{tender.description}</p>
              </div>

              {tender.site && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Site Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Site Name</p>
                        <p className="font-medium">{tender.site.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Site Code</p>
                        <p className="font-medium">{tender.site.code}</p>
                      </div>
                      {tender.site.zone && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Customer/Zone</p>
                          <p className="font-medium">{tender.site.zone.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {(tender.documentUrl || tender.nitDocumentUrl) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Documents</h3>
                    <div className="space-y-3">
                      {tender.documentUrl && (
                        <div className="flex gap-4">
                          <a
                            href={tender.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Tender Document
                          </a>
                          <a
                            href={tender.documentUrl}
                            download
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <ArrowDownToLine className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </div>
                      )}
                      {tender.nitDocumentUrl && (
                        <div className="flex gap-4">
                          <a
                            href={tender.nitDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View NIT Document
                          </a>
                          <a
                            href={tender.nitDocumentUrl}
                            download
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <ArrowDownToLine className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Created On</h3>
                  <p className="font-medium">{format(new Date(tender.createdAt), 'PPP')}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                  <p className="font-medium">{format(new Date(tender.updatedAt), 'PPP')}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tender.tags.length > 0 ? (
                    tender.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No tags</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* EMD Tracking Section */}
        {tender.hasEMD && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>EMD Details & Tracking</CardTitle>
                <div className="flex items-center gap-2">
                  {getEMDReturnStatusBadge(tender.emdReturnStatus)}
                  {tender.status === 'NOT_AWARDED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openEMDReturnDialog}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Update EMD Status
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EMD Amount */}
                <div className="flex items-start space-x-3">
                  <Banknote className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">EMD Amount</h3>
                    <p className="text-lg font-semibold">₹{tender.emdAmount?.toLocaleString('en-IN') || '0'}</p>
                  </div>
                </div>

                {/* Bank Name */}
                {tender.emdBankName && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Bank Name</h3>
                      <p className="font-medium">{tender.emdBankName}</p>
                    </div>
                  </div>
                )}

                {/* Submission Date */}
                {tender.emdSubmissionDate && (
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Submission Date</h3>
                      <p className="font-medium">{format(new Date(tender.emdSubmissionDate), 'PPP')}</p>
                    </div>
                  </div>
                )}

                {/* Maturity Date */}
                {tender.emdMaturityDate && (
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Maturity Date</h3>
                      <p className="font-medium">{format(new Date(tender.emdMaturityDate), 'PPP')}</p>
                    </div>
                  </div>
                )}

                {/* EMD Document */}
                {tender.emdDocumentUrl && (
                  <div className="flex items-start space-x-3 md:col-span-2">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">EMD Document</h3>
                      <div className="flex gap-4">
                        <a
                          href={tender.emdDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline text-sm"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Document
                        </a>
                        <a
                          href={tender.emdDocumentUrl}
                          download
                          className="inline-flex items-center text-primary hover:underline text-sm"
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* EMD Return Details - Only show for NOT_AWARDED */}
              {tender.status === 'NOT_AWARDED' && tender.emdReturnStatus && tender.emdReturnStatus !== 'PENDING' && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">EMD Return Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Return Status</h4>
                        <div>{getEMDReturnStatusBadge(tender.emdReturnStatus)}</div>
                      </div>
                      {tender.emdReturnDate && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-muted-foreground">Return Date</h4>
                          <p className="font-medium">{format(new Date(tender.emdReturnDate), 'PPP')}</p>
                        </div>
                      )}
                      {tender.emdReturnAmount && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-muted-foreground">Amount Returned</h4>
                          <p className="font-medium">₹{tender.emdReturnAmount.toLocaleString('en-IN')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Associated LOAs Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Associated LOAs</CardTitle>
              <Badge variant="outline">{associatedLoas.length} LOA{associatedLoas.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLoas ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : associatedLoas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No LOAs are currently associated with this tender.</p>
                <p className="text-sm mt-2">LOAs can be linked to this tender when creating or editing them.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOA Number</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associatedLoas.map((loa) => (
                    <TableRow key={loa.id}>
                      <TableCell className="font-medium">{loa.loaNumber}</TableCell>
                      <TableCell>{loa.site?.name || 'N/A'}</TableCell>
                      <TableCell>{loa.site?.zone?.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">₹{loa.loaValue.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{getLoaStatusBadge(loa.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/loas/${loa.id}`)}
                        >
                          View
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EMD Return Status Update Dialog */}
      <Dialog open={isEMDReturnDialogOpen} onOpenChange={setIsEMDReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update EMD Return Status</DialogTitle>
            <DialogDescription>
              Update the EMD return status for tender {tender.tenderNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emd-status" className="text-right">
                Status
              </Label>
              <Select
                value={selectedEMDReturnStatus}
                onValueChange={(value) => setSelectedEMDReturnStatus(value as EMDReturnStatus)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select EMD status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="RELEASED">Released</SelectItem>
                  <SelectItem value="RETAINED_AS_SD">Retained as SD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="return-date" className="text-right">
                Return Date
              </Label>
              <Input
                id="return-date"
                type="date"
                value={emdReturnDate}
                onChange={(e) => setEmdReturnDate(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="return-amount" className="text-right">
                Amount Returned
              </Label>
              <Input
                id="return-amount"
                type="number"
                placeholder="Enter amount"
                value={emdReturnAmount}
                onChange={(e) => setEmdReturnAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEMDReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEMDReturnStatusUpdate} disabled={isUpdatingEMDStatus || !selectedEMDReturnStatus}>
              {isUpdatingEMDStatus ? 'Updating...' : 'Update EMD Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Tender Status</DialogTitle>
            <DialogDescription>
              Change the status of tender {tender.tenderNumber}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as TenderStatus)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="RETENDERED">Retendered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="AWARDED">Awarded</SelectItem>
                  <SelectItem value="NOT_AWARDED">Not Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus || selectedStatus === tender.status}>
              {isUpdatingStatus ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 