'use client';

import { useState } from 'react';
import { MoreVertical, Upload, CheckCircle2, XCircle, FileText, Share2, Building, Store, DollarSign, Users, Clock, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { recognizeTenantPayment, type RecognizeTenantPaymentInput } from '@/ai/flows/recognize-tenant-payment';
import Image from 'next/image';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


const tenantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    rent: z.coerce.number().min(1, 'Rent must be a positive number'),
    dueDate: z.date({ required_error: "Due date is required."}),
    whatsappNumber: z.string().optional(),
    propertyId: z.string().min(1, 'Please select a property'),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

type Property = {
  id: string;
  name: string;
  type: 'apartment' | 'shop';
};

type Tenant = {
  id: string;
  name: string;
  avatar: string;
  rent: number;
  status: 'paid' | 'pending';
  dueDate: Date;
  whatsappNumber?: string;
  propertyId: string;
};

const initialProperties: Property[] = [
    { id: '1', name: 'Apt 101, Sunrise Building', type: 'apartment' },
    { id: '2', name: 'Groceries R Us', type: 'shop' },
    { id: '3', name: 'Apt 202, Sunrise Building', type: 'apartment' },
    { id: '4', name: 'The Corner Bookstore', type: 'shop' },
];

const initialTenants: Tenant[] = [
  { id: '1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', rent: 1200, status: 'paid', dueDate: new Date('2024-05-01'), whatsappNumber: '1234567890', propertyId: '1' },
  { id: '2', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', rent: 950, status: 'pending', dueDate: new Date('2024-05-05'), whatsappNumber: '0987654321', propertyId: '2' },
  { id: '3', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', rent: 1500, status: 'paid', dueDate: new Date('2024-05-03'), propertyId: '3' },
  { id: '4', name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', rent: 1100, status: 'pending', dueDate: new Date('2024-05-10'), whatsappNumber: '1122334455', propertyId: '4' },
];

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [properties] = useState<Property[]>(initialProperties);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<string | null>(null);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const totalIncome = tenants.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.rent, 0);
  const pendingRent = tenants.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.rent, 0);

  const getPropertyForTenant = (tenant: Tenant) => properties.find(p => p.id === tenant.propertyId);

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
  });

  const openTenantForm = (tenant: Tenant | null) => {
    setEditingTenant(tenant);
    if (tenant) {
        tenantForm.reset({
            name: tenant.name,
            rent: tenant.rent,
            dueDate: tenant.dueDate,
            whatsappNumber: tenant.whatsappNumber || '',
            propertyId: tenant.propertyId,
        });
    } else {
        tenantForm.reset({
            name: '',
            rent: 0,
            dueDate: undefined,
            whatsappNumber: '',
            propertyId: '',
        });
    }
    setIsTenantFormOpen(true);
  };

  const handleTenantFormSubmit = (data: TenantFormValues) => {
    if (editingTenant) {
        setTenants(tenants.map(t => t.id === editingTenant.id ? { ...editingTenant, ...data } : t));
        toast({ title: "Tenant Updated", description: `${data.name}'s details have been updated.` });
    } else {
        const newTenant: Tenant = {
            id: (tenants.length + 1 + Math.random()).toString(),
            ...data,
            status: 'pending',
            avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
        };
        setTenants([...tenants, newTenant]);
        toast({ title: "Tenant Added", description: `${data.name} has been added to your tenants list.` });
    }
    setIsTenantFormOpen(false);
    setEditingTenant(null);
  };


  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTenant) return;
    
    setIsProcessing(true);
    toast({
      title: "Processing payment...",
      description: "Our AI is verifying the payment screenshot. Please wait.",
    });

    try {
      const photoDataUri = await fileToDataUri(selectedFile);
      const recognitionInput: RecognizeTenantPaymentInput = {
        photoDataUri,
        tenants: tenants.map(t => ({ name: t.name, rentAmount: t.rent }))
      };
      
      const result = await recognizeTenantPayment(recognitionInput);

      const recognizedTenant = tenants.find(t => t.name.toLowerCase() === result.tenantName.toLowerCase());

      if (recognizedTenant && recognizedTenant.id === selectedTenant.id) {
         const updatedTenant = { ...recognizedTenant, status: 'paid' as 'paid' };
         setTenants(tenants.map(t => t.id === recognizedTenant.id ? updatedTenant : t));
        
        toast({
          title: "Payment Verified!",
          description: `Rent for ${recognizedTenant.name} for $${result.amount} has been confirmed and marked as paid.`,
        });
        
        await generateReceipt(updatedTenant, true);

      } else {
         throw new Error(`Recognition failed. AI identified '${result.tenantName}', but expected '${selectedTenant.name}'.`);
      }

    } catch (error: any) {
      console.error("AI recognition failed:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "The AI could not verify the payment from the screenshot. Please try again or update manually.",
      });
    } finally {
      setIsProcessing(false);
      setIsUploadDialogOpen(false);
      handleFileSelect(null);
    }
  };
  
  const handleManualPayment = async () => {
    if (!selectedTenant) return;
    const updatedTenant = { ...selectedTenant, status: 'paid' as 'paid' };

    setTenants(tenants.map(t => t.id === selectedTenant.id ? updatedTenant : t));

    toast({
      title: "Payment Marked as Paid",
      description: `Rent for ${selectedTenant.name} has been manually marked as paid.`,
    });
    
    setIsUploadDialogOpen(false);
    handleFileSelect(null);
    await generateReceipt(updatedTenant, true);
  };

  const openUploadDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsUploadDialogOpen(true);
  };
  
  const generateReceipt = async (tenant: Tenant, openDialog: boolean = false) => {
    const property = getPropertyForTenant(tenant);
    if (!property) return;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0/255, 122/255, 255/255);
    const grayColor = rgb(0.3, 0.3, 0.3);
    const lightGrayColor = rgb(0.5, 0.5, 0.5);

    page.drawText('RentBox', { x: 50, y: height - 60, font: boldFont, size: 28, color: primaryColor });
    page.drawText('Rental Payment Receipt', { x: 50, y: height - 90, font, size: 16, color: lightGrayColor });

    const infoY = height - 150;
    page.drawText('RECEIPT #', { x: 50, y: infoY, font, size: 10, color: lightGrayColor });
    page.drawText(`${new Date().getFullYear()}-${String(tenant.id).padStart(4, '0')}`, { x: 50, y: infoY - 15, font: boldFont, size: 12, color: grayColor });
    
    page.drawText('DATE', { x: 200, y: infoY, font, size: 10, color: lightGrayColor });
    page.drawText(new Date().toLocaleDateString(), { x: 200, y: infoY - 15, font: boldFont, size: 12, color: grayColor });

    page.drawLine({
        start: { x: 50, y: infoY - 40 },
        end: { x: width - 50, y: infoY - 40 },
        thickness: 1,
        color: rgb(0.9, 0.9, 0.9),
    });
    
    const billedToY = infoY - 70;
    page.drawText('BILLED TO', { x: 50, y: billedToY, font, size: 10, color: lightGrayColor });
    page.drawText(tenant.name, { x: 50, y: billedToY - 15, font: boldFont, size: 14, color: grayColor });
    page.drawText(property.name, { x: 50, y: billedToY - 30, font, size: 12, color: grayColor });

    const tableY = billedToY - 80;
    const tableHeaderY = tableY;
    page.drawText('DESCRIPTION', { x: 50, y: tableHeaderY, font, size: 10, color: lightGrayColor });
    page.drawText('AMOUNT', { x: width - 150, y: tableHeaderY, font, size: 10, color: lightGrayColor, });
    
    page.drawLine({
        start: { x: 50, y: tableHeaderY - 10 },
        end: { x: width - 50, y: tableHeaderY - 10 },
        thickness: 1,
        color: rgb(0.9, 0.9, 0.9),
    });

    const itemY = tableHeaderY - 30;
    page.drawText(`Monthly Rent - ${property.type === 'shop' ? 'Shop' : 'Apartment'}`, { x: 50, y: itemY, font, size: 12, color: grayColor });
    page.drawText(`$${tenant.rent.toLocaleString()}`, { x: width - 150, y: itemY, font: boldFont, size: 12, color: grayColor, });

    const totalY = itemY - 50;
     page.drawLine({
        start: { x: width - 200, y: totalY },
        end: { x: width - 50, y: totalY },
        thickness: 1,
        color: rgb(0.9, 0.9, 0.9),
    });
    page.drawText('TOTAL', { x: width - 200, y: totalY - 20, font: boldFont, size: 14, color: grayColor });
    page.drawText(`$${tenant.rent.toLocaleString()}`, { x: width - 150, y: totalY - 20, font: boldFont, size: 14, color: primaryColor });

    if (tenant.status === 'paid') {
      page.drawText('Thank you for your payment!', { x: 50, y: 80, font, size: 14, color: grayColor });
    }

    const statusText = `Status: ${tenant.status.toUpperCase()}`;
    const statusColor = tenant.status === 'paid' ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
    page.drawText(statusText, { x: 50, y: 60, font: boldFont, size: 12, color: statusColor });


    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    setGeneratedReceipt(pdfDataUri);
    if (openDialog) {
        setSelectedTenant(tenant);
        setIsReceiptDialogOpen(true);
    }
    return pdfDataUri;
  };
  
  const handleShare = async (tenant: Tenant) => {
    const receiptUri = await generateReceipt(tenant, false);
    if (!receiptUri) return;

    if (navigator.share) {
        try {
            const response = await fetch(receiptUri);
            const blob = await response.blob();
            const file = new File([blob], `${tenant.name}-receipt.pdf`, { type: 'application/pdf' });

            await navigator.share({
                title: `Rent Receipt for ${tenant.name}`,
                text: `Hi ${tenant.name},\n\nHere is your rent receipt for $${tenant.rent}.`,
                files: [file],
            });
        } catch (error) {
            console.error('Error sharing:', error);
            toast({
                variant: "destructive",
                title: "Sharing failed",
                description: "Could not share the receipt automatically.",
            });
        }
    } else {
      setSelectedTenant(tenant);
      setIsReceiptDialogOpen(true);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total rent collected this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Rent</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${pendingRent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total rent pending for this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Active Rentals</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{tenants.length}</div>
                    <p className="text-xs text-muted-foreground">Total active tenants</p>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tenant Payments</CardTitle>
                    <CardDescription>Manage your tenant payments and receipts.</CardDescription>
                </div>
                <Button onClick={() => openTenantForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Tenant
                </Button>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border">
                    {tenants.map((tenant) => {
                        const property = getPropertyForTenant(tenant);
                        return (
                            <div key={tenant.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={tenant.avatar} />
                                        <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{tenant.name}</p>
                                        {property && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {property.type === 'apartment' ? <Building className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                                                <span>{property.name}</span>
                                            </div>
                                        )}
                                        <p className="text-sm text-muted-foreground">Due on: {format(tenant.dueDate, 'PPP')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                       <p className="font-semibold text-lg">${tenant.rent.toLocaleString()}</p>
                                        <Badge variant={tenant.status === 'paid' ? 'default' : 'destructive'} className={tenant.status === 'paid' ? 'bg-green-500/80 hover:bg-green-500/90' : ''}>
                                            {tenant.status === 'paid' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                                            {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                                        </Badge>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {tenant.status === 'pending' && (
                                                <DropdownMenuItem onClick={() => openUploadDialog(tenant)}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    <span>Upload Payment</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => generateReceipt(tenant, true)}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>View Receipt</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleShare(tenant)}>
                                                <Share2 className="mr-2 h-4 w-4" />
                                                <span>Share Receipt</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Payment Screenshot</DialogTitle>
                    <DialogDescription>
                        Upload the payment proof for {selectedTenant?.name} or mark it as paid manually.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="picture">AI Verification</Label>
                        <Input id="picture" type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
                    </div>
                    {previewUrl && (
                        <div className="mt-4 relative aspect-video w-full">
                            <Image src={previewUrl} alt="Screenshot preview" layout="fill" objectFit="contain" />
                        </div>
                    )}
                </div>
                 <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
                    <Button variant="secondary" onClick={handleManualPayment}>
                       <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid Manually
                    </Button>
                    <div className="flex gap-2 self-end">
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleFileUpload} disabled={!selectedFile || isProcessing}>
                            {isProcessing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" /> Upload and Verify
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isReceiptDialogOpen} onOpenChange={(isOpen) => { setIsReceiptDialogOpen(isOpen); if (!isOpen) setSelectedTenant(null); }}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Rent Receipt for {selectedTenant?.name}</DialogTitle>
                    <DialogDescription>
                        Here is the generated rent receipt. You can download or share it.
                    </DialogDescription>
                </DialogHeader>
                <div className="h-[600px] w-full overflow-hidden rounded-md border">
                    {generatedReceipt && <iframe src={generatedReceipt} className="h-full w-full" title="Receipt" />}
                </div>
                 <DialogFooter className="flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <Button asChild>
                        <a href={generatedReceipt ?? '#'} download={`${selectedTenant?.name}-receipt.pdf`}>Download</a>
                    </Button>
                    {selectedTenant && <Button onClick={() => handleShare(selectedTenant)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isTenantFormOpen} onOpenChange={setIsTenantFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={tenantForm.handleSubmit(handleTenantFormSubmit)} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Tenant Name</Label>
                        <Input id="name" {...tenantForm.register('name')} />
                        {tenantForm.formState.errors.name && <p className="text-red-500 text-xs">{tenantForm.formState.errors.name.message}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Property</Label>
                        <Controller
                            control={tenantForm.control}
                            name="propertyId"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a property" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {tenantForm.formState.errors.propertyId && <p className="text-red-500 text-xs">{tenantForm.formState.errors.propertyId.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="rent">Rent Amount ($)</Label>
                            <Input id="rent" type="number" {...tenantForm.register('rent')} />
                            {tenantForm.formState.errors.rent && <p className="text-red-500 text-xs">{tenantForm.formState.errors.rent.message}</p>}
                        </div>
                        <div className="grid gap-2">
                           <Label htmlFor="dueDate">Due Date</Label>
                            <Controller
                                control={tenantForm.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {tenantForm.formState.errors.dueDate && <p className="text-red-500 text-xs">{tenantForm.formState.errors.dueDate.message}</p>}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="whatsappNumber">WhatsApp Number (Optional)</Label>
                        <Input id="whatsappNumber" {...tenantForm.register('whatsappNumber')} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">{editingTenant ? 'Save Changes' : 'Add Tenant'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </main>
  );
}

    