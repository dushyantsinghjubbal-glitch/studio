'use client';

import { useState } from 'react';
import { MoreVertical, Upload, CheckCircle2, XCircle, FileText, Share2, Building, Store, DollarSign, Users, Clock } from 'lucide-react';
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
  const { toast } = useToast();

  const totalIncome = tenants.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.rent, 0);
  const pendingRent = tenants.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.rent, 0);

  const getPropertyForTenant = (tenant: Tenant) => properties.find(p => p.id === tenant.propertyId);

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
         setTenants(tenants.map(t => t.id === recognizedTenant.id ? {...t, status: 'paid'} : t));
        
        toast({
          title: "Payment Verified!",
          description: `Rent for ${recognizedTenant.name} for $${result.amount} has been confirmed and marked as paid.`,
        });
        
        await generateReceipt({...recognizedTenant, status: 'paid'}, true);

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
      setSelectedTenant(null);
    }
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
    const receiptUri = await generateReceipt(tenant);
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
            if (tenant.whatsappNumber) {
                 const whatsappUrl = `https://wa.me/${tenant.whatsappNumber}?text=Hi%20${tenant.name},%20here%20is%20your%20rent%20receipt%20for%20$${tenant.rent}.%20You%20can%20download%20it.`;
                 window.open(whatsappUrl, '_blank');
            } else {
                 toast({
                    variant: "destructive",
                    title: "Sharing failed",
                    description: "Could not share the receipt automatically.",
                });
            }
        }
    } else if (tenant.whatsappNumber) {
        const whatsappUrl = `https://wa.me/${tenant.whatsappNumber}?text=Hi%20${tenant.name},%20here%20is%20your%20rent%20receipt%20for%20$${tenant.rent}.%20You%20can%20download%20it.`;
        window.open(whatsappUrl, '_blank');
    } else {
        toast({
            variant: "destructive",
            title: "Cannot Share",
            description: "Sharing is not supported on this browser and no WhatsApp number is available.",
        });
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
            <CardHeader>
                <CardTitle>Tenant Payments</CardTitle>
                <CardDescription>Manage your tenant payments and receipts.</CardDescription>
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
                        Upload the payment proof for {selectedTenant?.name}. Our AI will verify it.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="picture">Payment Screenshot</Label>
                        <Input id="picture" type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
                    </div>
                    {previewUrl && (
                        <div className="mt-4 relative aspect-video w-full">
                            <Image src={previewUrl} alt="Screenshot preview" layout="fill" objectFit="contain" />
                        </div>
                    )}
                </div>
                <DialogFooter>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
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
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Close</Button>
                    <Button asChild>
                        <a href={generatedReceipt ?? '#'} download={`${selectedTenant?.name}-receipt.pdf`}>Download</a>
                    </Button>
                    {selectedTenant && <Button onClick={() => handleShare(selectedTenant)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}
