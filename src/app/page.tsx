'use client';

import { useState } from 'react';
import { DollarSign, Users, Clock, MoreVertical, Upload, CheckCircle2, XCircle, Home as HomeIcon, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

type Tenant = {
  id: string;
  name: string;
  avatar: string;
  rent: number;
  status: 'paid' | 'pending';
  dueDate: string;
  whatsappNumber?: string;
};

const initialTenants: Tenant[] = [
  { id: '1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', rent: 1200, status: 'paid', dueDate: '1st May 2024', whatsappNumber: '1234567890' },
  { id: '2', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', rent: 950, status: 'pending', dueDate: '5th May 2024', whatsappNumber: '0987654321' },
  { id: '3', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', rent: 1500, status: 'paid', dueDate: '3rd May 2024' },
  { id: '4', name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', rent: 1100, status: 'pending', dueDate: '10th May 2024', whatsappNumber: '1122334455' },
];

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedReceipt, setGeneratedReceipt] = useState<string | null>(null);
  const { toast } = useToast();

  const totalIncome = tenants.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.rent, 0);
  const pendingRent = tenants.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.rent, 0);

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTenant) return;

    // AI-based tenant recognition and payment verification would go here.
    // For now, we'll just simulate a successful verification.
    toast({
      title: "Processing payment...",
      description: "Please wait while we verify the payment.",
    });

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    setTenants(tenants.map(t => t.id === selectedTenant.id ? {...t, status: 'paid'} : t));
    
    toast({
      title: "Payment Verified!",
      description: `Rent for ${selectedTenant.name} has been marked as paid.`,
    });

    setIsUploadDialogOpen(false);
    setSelectedFile(null);
    setSelectedTenant(null);
    
    // Automatically generate and show receipt
    await generateReceipt(selectedTenant, true);
  };

  const openUploadDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsUploadDialogOpen(true);
  };

  const generateReceipt = async (tenant: Tenant, openDialog: boolean = false) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const titleSize = 24;
    
    page.drawText('Rental Receipt', {
        x: 50,
        y: height - 4 * titleSize,
        font,
        size: titleSize,
        color: rgb(0.1, 0.1, 0.1),
    });

    const receiptText = `
      Date: ${new Date().toLocaleDateString()}
      
      Tenant: ${tenant.name}
      Amount: $${tenant.rent.toLocaleString()}
      Payment Status: Paid
      For rent of: May 2024

      Thank you for your payment!
    `;
    
    page.drawText(receiptText, {
        x: 50,
        y: height - 150,
        font,
        size: fontSize,
        lineHeight: 24,
        color: rgb(0.2, 0.2, 0.2),
    });

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
    if (receiptUri && navigator.share) {
        try {
            const response = await fetch(receiptUri);
            const blob = await response.blob();
            const file = new File([blob], `${tenant.name}-receipt.pdf`, { type: 'application/pdf' });

            await navigator.share({
                title: 'Rent Receipt',
                text: `Here is the rent receipt for ${tenant.name}.`,
                files: [file],
            });
        } catch (error) {
            console.error('Error sharing:', error);
            toast({
                variant: "destructive",
                title: "Sharing failed",
                description: "Could not share the receipt. Please try again.",
            });
        }
    } else {
        // Fallback for browsers that don't support Web Share API
        const whatsappUrl = `https://wa.me/${tenant.whatsappNumber}?text=Hi%20${tenant.name},%20your%20rent%20of%20$${tenant.rent}%20has%20been%20received.%20Your%20receipt%20is%20ready%20to%20download.`;
        window.open(whatsappUrl, '_blank');
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <div className="flex items-center gap-2">
                <HomeIcon className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">RentBox</h1>
            </div>
        </header>
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
                        <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants.length}</div>
                        <p className="text-xs text-muted-foreground">Total active tenants</p>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Tenants</CardTitle>
                        <CardDescription>Manage your tenants and their rent payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border">
                            {tenants.map((tenant) => (
                                <div key={tenant.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={tenant.avatar} />
                                            <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{tenant.name}</p>
                                            <p className="text-sm text-muted-foreground">Due on: {tenant.dueDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                           <p className="font-semibold text-lg">${tenant.rent.toLocaleString()}</p>
                                            <Badge variant={tenant.status === 'paid' ? 'default' : 'destructive'} className={tenant.status === 'paid' ? 'bg-green-500/80' : ''}>
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
                                                {tenant.status === 'paid' && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => generateReceipt(tenant, true)}>
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            <span>View Receipt</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleShare(tenant)}>
                                                            <Share2 className="mr-2 h-4 w-4" />
                                                            <span>Share Receipt</span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
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
                        <Input id="picture" type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFileUpload} disabled={!selectedFile}>
                        <Upload className="mr-2 h-4 w-4" /> Upload and Verify
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
    </div>
  );
}
