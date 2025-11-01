'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarItem, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Users, Building, LogOut, Wallet, Plus, Receipt, FileText, User as UserIcon, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDataContext, AppDataProvider, Tenant, Transaction } from '@/context/AppDataContext';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { recognizeTransaction, RecognizeTransactionInput } from '@/ai/flows/recognize-tenant-payment';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const transactionSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    type: z.enum(['income', 'expense']),
    category: z.enum(['Rent Received', 'Utilities', 'Maintenance', 'Salary', 'Groceries', 'Other']),
    date: z.date(),
    notes: z.string().optional(),
    receipt: z.instanceof(File).optional(),
    propertyId: z.string().optional(),
    tenantId: z.string().optional(),
    merchant: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const receiptSchema = z.object({
    tenantId: z.string().min(1, "Please select a tenant."),
    paymentDate: z.date(),
    month: z.string().min(1, "Please select a month."),
});
type ReceiptFormValues = z.infer<typeof receiptSchema>;


function GlobalDialogs() {
    const { 
        properties, tenants, transactions, addTransaction, updateTransaction, triggerReceiptGeneration, userProfile,
        isAddTransactionOpen, setAddTransactionOpen, 
        isScanReceiptOpen, setScanReceiptOpen, 
        isGenerateReceiptOpen, setGenerateReceiptOpen,
        editingTransaction, setEditingTransaction,
        extractedData, setExtractedData,
    } = useContext(AppDataContext);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const [isDuplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
    const [stagedTransaction, setStagedTransaction] = useState<TransactionFormValues | null>(null);


    const transactionForm = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            date: new Date(),
        }
    });
    
    const receiptForm = useForm<ReceiptFormValues>({
        resolver: zodResolver(receiptSchema),
        defaultValues: {
            paymentDate: new Date(),
            month: format(new Date(), 'MMMM'),
        },
    });

    useEffect(() => {
        if (isAddTransactionOpen && editingTransaction) {
            transactionForm.reset({
                ...editingTransaction,
                date: new Date(editingTransaction.date),
            });
        } else if (isAddTransactionOpen && extractedData) {
            transactionForm.reset({
                ...transactionForm.getValues(),
                ...extractedData,
                date: extractedData.date ? new Date(extractedData.date) : new Date(),
            });
        } else if (!isAddTransactionOpen) {
            setEditingTransaction(null);
            setExtractedData(null);
            transactionForm.reset({
                type: 'expense',
                date: new Date(),
                title: '',
                amount: 0,
                category: 'Other',
                notes: '',
                receipt: undefined,
                propertyId: '',
                tenantId: '',
                merchant: '',
            });
        }
    }, [isAddTransactionOpen, editingTransaction, extractedData, transactionForm, setEditingTransaction, setExtractedData]);
    
    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    
    const checkForDuplicates = (data: Partial<TransactionFormValues>): Transaction | undefined => {
        return transactions.find(t => 
            t.amount === data.amount && 
            data.date && isSameDay(new Date(t.date), data.date)
        );
    }

    const handleAiSubmit = async () => {
        if (!selectedFile) return;
        setIsProcessing(true);
        toast({ title: 'Analyzing Receipt...', description: 'The AI is extracting transaction details.' });

        try {
            const photoDataUri = await fileToDataUri(selectedFile);
            const input: RecognizeTransactionInput = { photoDataUri, context: "Extract transaction details from this receipt. Determine if it is income (like rent) or an expense." };
            const result = await recognizeTransaction(input);
            
            const extracted = {
                title: result.title,
                amount: result.amount,
                date: result.date ? new Date(result.date) : new Date(),
                category: result.category,
                type: result.category === 'Rent Received' || result.category === 'Salary' ? 'income' : 'expense',
                merchant: result.merchant,
            };

            const duplicate = checkForDuplicates(extracted);
            if (duplicate) {
                setStagedTransaction(extracted as TransactionFormValues);
                setDuplicateAlertOpen(true);
            } else {
                setExtractedData(extracted);
                setScanReceiptOpen(false);
                setAddTransactionOpen(true);
            }
        } catch (error) {
            console.error("AI recognition failed:", error);
            toast({ variant: 'destructive', title: 'AI Error', description: 'Could not extract details from the receipt.' });
        } finally {
            setIsProcessing(false);
            setSelectedFile(null);
            if(!isDuplicateAlertOpen) setScanReceiptOpen(false);
        }
    };

    const handleFormSubmit = async (data: TransactionFormValues) => {
        if (!editingTransaction) {
            const duplicate = checkForDuplicates(data);
            if (duplicate) {
                setStagedTransaction(data);
                setDuplicateAlertOpen(true);
                return;
            }
        }
        await saveTransaction(data);
    };

    const saveTransaction = async (data: TransactionFormValues) => {
        const dataToSave = {
          ...data,
          date: data.date.toISOString(),
          receipt: data.receipt instanceof File ? data.receipt : undefined,
        };

        if (editingTransaction) {
            await updateTransaction({
                ...editingTransaction,
                ...dataToSave,
            });
            toast({ title: 'Transaction Updated', description: 'Your transaction has been updated.' });
        } else {
            await addTransaction(dataToSave);
            toast({ title: 'Transaction Saved', description: 'Your transaction has been recorded.' });
        }
        setAddTransactionOpen(false);
        setStagedTransaction(null);
    }
    
    const handleDuplicateConfirmation = async () => {
        if (stagedTransaction) {
            // If it came from AI scan
            if (isScanReceiptOpen) {
                 setExtractedData(stagedTransaction);
                 setScanReceiptOpen(false);
                 setAddTransactionOpen(true);
            } else { // From manual entry
                await saveTransaction(stagedTransaction);
            }
        }
        setDuplicateAlertOpen(false);
        setStagedTransaction(null);
    }

    const generatePdfReceipt = async (data: ReceiptFormValues) => {
        const tenant = tenants.find(t => t.id === data.tenantId);
        if (!tenant) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find selected tenant.' });
            return;
        }
    
        await triggerReceiptGeneration(tenant.id, data.month, data.paymentDate);
    
        const doc = new jsPDF();
        const businessName = userProfile?.businessName || 'FinProp';
        const ownerName = userProfile?.ownerName || '';
        const businessAddress = userProfile?.businessAddress || '';
        const businessPhone = userProfile?.businessPhone || '';
        const businessEmail = userProfile?.businessEmail || '';
        const upiId = userProfile?.upiId || '';
        const bankDetails = userProfile?.bankDetails || '';
    
        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName, 105, 20, { align: 'center' });
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (ownerName) doc.text(ownerName, 105, 26, { align: 'center' });
        if (businessAddress) doc.text(businessAddress, 105, 31, { align: 'center' });
    
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Rent Receipt", 105, 45, { align: 'center' });
    
        // Information
        doc.setFontSize(12);
        doc.text(`Receipt #: ${new Date().getTime()}`, 20, 60);
        doc.text(`Date: ${format(data.paymentDate, 'PPP')}`, 190, 60, { align: 'right' });
    
        // Line separator
        doc.setLineWidth(0.5);
        doc.line(20, 65, 190, 65);
    
        // Billed To Section
        doc.setFont('helvetica', 'bold');
        doc.text("BILLED TO:", 20, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(tenant.name, 20, 82);
        doc.text(tenant.propertyName, 20, 87);
        if (tenant.propertyAddress) {
            doc.text(tenant.propertyAddress, 20, 92);
        }
    
        // Payment Details Table
        (doc as any).autoTable({
            startY: 105,
            head: [['Description', 'Amount']],
            body: [
                [`Rent for the month of ${data.month}`, `₹${tenant.rentAmount.toLocaleString()}`],
                [`Maintenance Charges`, `₹0.00`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [33, 150, 243] },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 1) {
                    doc.setFont('helvetica', 'bold');
                }
            }
        });
    
        // Total
        let finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Total Amount:", 130, finalY + 15, { align: 'right' });
        doc.text(`₹${tenant.rentAmount.toLocaleString()}`, 190, finalY + 15, { align: 'right' });
    
        // Payment Instructions / Notes
        finalY = finalY + 30; // Add some space
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Notes / Payment Instructions:", 20, finalY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        let instructionY = finalY + 7;
        doc.text("Thank you for your timely payment.", 20, instructionY);
        instructionY += 5;

        if (upiId) {
            doc.text(`You can pay via UPI to: ${upiId}`, 20, instructionY);
            instructionY += 5;
        }
        if (bankDetails) {
            doc.text("Bank Details:", 20, instructionY);
            instructionY += 5;
            doc.text(bankDetails, 20, instructionY, { maxWidth: 170 });
        }
    
    
        // Footer
        finalY = doc.internal.pageSize.height - 30;
        doc.setLineWidth(0.5);
        doc.line(20, finalY, 190, finalY);
        doc.setFontSize(10);
        const contactInfo = [businessPhone, businessEmail].filter(Boolean).join(' | ');
        if(contactInfo) doc.text(contactInfo, 105, finalY + 10, { align: 'center' });
        doc.text("This is a computer-generated receipt and does not require a signature.", 105, finalY + 15, { align: 'center' });
    
        doc.save(`Receipt-${tenant.name.replace(' ', '_')}-${data.month}.pdf`);
    
        toast({ title: 'Receipt Generated', description: 'The PDF receipt has been downloaded.' });
        setGenerateReceiptOpen(false);
        receiptForm.reset();
    };

    return (
        <>
            {/* AI Receipt Scanner Dialog */}
            <Dialog open={isScanReceiptOpen} onOpenChange={(open) => { if (!open) setScanReceiptOpen(open); }}>
                <DialogContent 
                    onInteractOutside={(e) => { if (isProcessing || isScanReceiptOpen) e.preventDefault(); }}
                    onEscapeKeyDown={(e) => { if (isProcessing || isScanReceiptOpen) e.preventDefault(); }}
                >
                    <DialogHeader>
                        <DialogTitle>Scan Receipt with AI</DialogTitle>
                        <DialogDescription>Upload a receipt image and let AI extract the details for you.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="receipt-scan">Receipt Image</Label>
                            <Input id="receipt-scan" type="file" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setSelectedFile(file);
                                }
                            }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setScanReceiptOpen(false);
                            setSelectedFile(null);
                        }} disabled={isProcessing}>Cancel</Button>
                        <Button onClick={handleAiSubmit} disabled={!selectedFile || isProcessing}>
                            {isProcessing ? 'Analyzing...' : 'Extract Details'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Duplicate Transaction Alert */}
            <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setDuplicateAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Possible Duplicate Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                            This transaction looks similar to one you've already added. Are you sure you want to add it?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStagedTransaction(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDuplicateConfirmation}>Add Anyway</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Manual Transaction Form Dialog */}
            <Dialog open={isAddTransactionOpen} onOpenChange={(open) => {
                 if (!open) {
                     setAddTransactionOpen(false);
                     if (extractedData) setExtractedData(null);
                 } else {
                    setAddTransactionOpen(true);
                 }
             }}>
                <DialogContent className="sm:max-w-md" 
                 onInteractOutside={(e) => { if (isAddTransactionOpen) e.preventDefault()}}
                 onEscapeKeyDown={(e) => { if (isAddTransactionOpen) e.preventDefault()}}>
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : (extractedData ? 'Confirm Transaction' : 'Add Transaction')}</DialogTitle>
                        <DialogDescription>
                            {editingTransaction ? 'Update the details for your transaction.' : (extractedData ? 'Review the details extracted by the AI and save.' : 'Fill in the details for the new transaction.')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={transactionForm.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6 -mx-6">
                        <div className="grid gap-2 px-6">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" {...transactionForm.register('title')} />
                            {transactionForm.formState.errors.title && <p className="text-red-500 text-xs">{transactionForm.formState.errors.title.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input id="amount" type="number" step="0.01" {...transactionForm.register('amount')} />
                                {transactionForm.formState.errors.amount && <p className="text-red-500 text-xs">{transactionForm.formState.errors.amount.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Controller name="type" control={transactionForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Controller name="category" control={transactionForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Rent Received">Rent Received</SelectItem>
                                            <SelectItem value="Utilities">Utilities</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Salary">Salary</SelectItem>
                                            <SelectItem value="Groceries">Groceries</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Date</Label>
                                <Controller name="date" control={transactionForm.control} render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                    </Popover>
                                )} />
                            </div>
                        </div>
                        <div className="grid gap-2 px-6">
                            <Label>Related To (Optional)</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Controller name="propertyId" control={transactionForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Property..."/></SelectTrigger>
                                        <SelectContent>
                                            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                                <Controller name="tenantId" control={transactionForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Tenant..."/></SelectTrigger>
                                        <SelectContent>
                                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                        </div>
                        <div className="grid gap-2 px-6">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" {...transactionForm.register('notes')} />
                        </div>

                        <DialogFooter className="px-6 pt-4 border-t mt-4">
                             <Button type="button" variant="outline" onClick={() => {
                                setExtractedData(null);
                                setAddTransactionOpen(false);
                            }}>Cancel</Button>
                            <Button type="submit">Save Transaction</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Generate Receipt Dialog */}
            <Dialog open={isGenerateReceiptOpen} onOpenChange={(open) => {
                 if (!open) {
                     setGenerateReceiptOpen(false);
                     receiptForm.reset();
                 } else {
                    setGenerateReceiptOpen(true);
                 }
            }}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isGenerateReceiptOpen) e.preventDefault()}} onEscapeKeyDown={(e) => { if (isGenerateReceiptOpen) e.preventDefault()}}>
                    <DialogHeader>
                        <DialogTitle>Generate Rent Receipt</DialogTitle>
                        <DialogDescription>Select a tenant and payment details to generate a PDF receipt.</DialogDescription>
                    </DialogHeader>
                    <form id="receipt-form" onSubmit={receiptForm.handleSubmit(generatePdfReceipt)} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="tenantId-receipt">Tenant</Label>
                            <Controller
                                name="tenantId"
                                control={receiptForm.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="tenantId-receipt"><SelectValue placeholder="Select a tenant..." /></SelectTrigger>
                                        <SelectContent>
                                            {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} - {t.propertyName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {receiptForm.formState.errors.tenantId && <p className="text-red-500 text-xs">{receiptForm.formState.errors.tenantId.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Receipt Date</Label>
                                <Controller name="paymentDate" control={receiptForm.control} render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                )} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="month-receipt">Rent for Month</Label>
                                <Controller name="month" control={receiptForm.control} render={({ field }) => (
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="month-receipt"><SelectValue placeholder="Select month..." /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => format(new Date(0, i), 'MMMM')).map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}/>
                                {receiptForm.formState.errors.month && <p className="text-red-500 text-xs">{receiptForm.formState.errors.month.message}</p>}
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setGenerateReceiptOpen(false)}>Cancel</Button>
                        <Button type="submit" form="receipt-form">Generate PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function UserMenu() {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    if (!user || user.isAnonymous) {
        return (
            <Button asChild variant="outline">
                <Link href="/login">Login</Link>
            </Button>
        );
    }
    
    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
        }
    };
    
    const getInitials = (name?: string | null, email?: string | null) => {
        if (name) {
            const nameParts = name.split(' ');
            if (nameParts.length > 1) {
                return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        if (email) {
            return email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`} alt={user.displayName || user.email || 'User'} />
                        <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                 <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <Cog className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function FloatingActionButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { setAddTransactionOpen, setScanReceiptOpen, setGenerateReceiptOpen } = useContext(AppDataContext);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const getFabContent = () => {
    switch (pathname) {
      case '/properties':
        return (
          <Button className="h-16 w-16 rounded-full shadow-lg" size="icon" onClick={() => router.push('/properties?action=add')}>
            <Building className="mr-0 h-6 w-6" />
             <Plus className="absolute bottom-3 right-3 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
          </Button>
        );
      case '/tenants':
        return (
          <Button className="h-16 w-16 rounded-full shadow-lg" size="icon" onClick={() => router.push('/tenants?action=add')}>
            <Users className="mr-0 h-6 w-6" />
            <Plus className="absolute bottom-3 right-3 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0.5" />
          </Button>
        );
      default:
        return (
          <Popover open={isFabOpen} onOpenChange={setIsFabOpen}>
            <PopoverTrigger asChild>
              <Button className="h-16 w-16 rounded-full shadow-lg" size="icon">
                <Plus className="h-8 w-8" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2 mb-2" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" className="justify-start py-2 h-auto" onClick={() => { setGenerateReceiptOpen(true); setIsFabOpen(false); }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Receipt
                </Button>
                <Button variant="ghost" className="justify-start py-2 h-auto" onClick={() => { setAddTransactionOpen(true); setIsFabOpen(false); }}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
                <Button variant="ghost" className="justify-start py-2 h-auto" onClick={() => { setScanReceiptOpen(true); setIsFabOpen(false); }}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Scan Receipt
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
        {getFabContent()}
    </div>
  );
}

function NavMenu() {
    return (
        <></>
    )
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>FinProp - Finance Manager</title>
        <meta name="description" content="A simple app to manage rental properties and finances." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <FirebaseClientProvider>
          <AppDataProvider>
            {children}
            <FloatingActionButton />
            <GlobalDialogs />
          </AppDataProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
