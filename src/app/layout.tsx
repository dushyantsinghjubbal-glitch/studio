'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Link from 'next/link';
import { Home, Users, Building, LogOut, Wallet, Plus, Receipt, FileText, User as UserIcon, Cog, Sun, Moon, Book, Menu } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';


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
                    className="sm:max-w-md bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-lg border-white/20"
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
                <AlertDialogContent className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-lg border-white/20">
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
                <DialogContent
                 className="sm:max-w-md bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-lg border-white/20"
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
                <DialogContent
                 className="sm:max-w-md bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-lg border-white/20"
                 onInteractOutside={(e) => { if (isGenerateReceiptOpen) e.preventDefault()}} onEscapeKeyDown={(e) => { if (isGenerateReceiptOpen) e.preventDefault()}}>
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

function SidebarNav() {
    const [darkMode, setDarkMode] = useState(false);
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setDarkMode(isDark);
    }, []);

    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
        setDarkMode(!darkMode);
    };
    
    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };

    const menuItems = [
      { name: "Dashboard", icon: Home, href: "/" },
      { name: "Ledger", icon: Book, href: "/ledger" },
      { name: "Tenants", icon: Users, href: "/tenants" },
      { name: "Properties", icon: Building, href: "/properties" },
    ];
    
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
        <aside className="fixed left-0 top-0 h-screen w-20 md:w-60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-lg shadow-lg flex flex-col items-center md:items-start py-6 px-2 rounded-r-3xl border-r border-purple-100 dark:border-gray-800 z-40">
            <motion.div
              className="mb-8 flex items-center gap-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
            >
              <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-2xl shadow-md text-white font-bold text-lg">
                FP
              </div>
              <span className="hidden md:block font-semibold text-gray-700 dark:text-gray-200">
                FinProp
              </span>
            </motion.div>

            <nav className="flex flex-col gap-4 w-full flex-1">
              {menuItems.map((item) => (
                <Link href={item.href} key={item.name}>
                  <motion.div
                    whileHover={{ scale: 1.07 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                  >
                    <item.icon
                      className="text-blue-500 bg-blue-100 dark:text-blue-300 dark:bg-gray-800 p-2 rounded-xl"
                      size={28}
                    />
                    <span className="hidden md:block font-medium">
                      {item.name}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                  title="Toggle dark mode"
                >
                    {darkMode ? (
                        <Sun className="text-yellow-400 bg-gray-800 p-2 rounded-xl" size={28} />
                    ) : (
                        <Moon className="text-indigo-500 bg-blue-100 p-2 rounded-xl" size={28} />
                    )}
                     <span className="hidden md:block font-medium">
                        Toggle Theme
                    </span>
                </button>
                
                {user && !user.isAnonymous && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <div
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                              >
                                <Avatar className="h-10 w-10 border-2 border-primary">
                                    <AvatarImage src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`} alt={user.displayName || user.email || 'User'} />
                                    <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                                </Avatar>
                                <div className="hidden md:flex flex-col">
                                     <span className="font-medium text-sm truncate max-w-28">{user.displayName || user.email}</span>
                                     <span className="text-xs text-muted-foreground">View Profile</span>
                                </div>
                              </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2 ml-2" align="start" side="right" forceMount>
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
                )}
            </div>
        </aside>
    )
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Button size="icon" variant="outline" className="sm:hidden" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
            </Button>
            <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-2 rounded-lg text-white font-bold text-base">
                    FP
                </div>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                    FinProp
                </span>
            </div>
        </header>
    );
}

const variants = {
    open: {
        x: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    },
    closed: {
        x: "-100%",
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    }
};

const itemVariants = {
    open: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
};


function MobileSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (open: boolean) => void }) {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setDarkMode(isDark);
    }, []);

    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
        setDarkMode(!darkMode);
    };

    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
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

    const menuItems = [
      { name: "Dashboard", icon: Home, href: "/" },
      { name: "Ledger", icon: Book, href: "/ledger" },
      { name: "Tenants", icon: Users, href: "/tenants" },
      { name: "Properties", icon: Building, href: "/properties" },
    ];
    
     const handleLinkClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.aside
                        variants={variants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="fixed left-0 top-0 h-screen w-64 bg-white/70 dark:bg-gray-900/60 backdrop-blur-lg shadow-lg flex flex-col py-6 px-4 rounded-r-3xl z-50"
                    >
                         <motion.div
                            className="mb-8 flex items-center gap-2"
                            variants={itemVariants}
                        >
                            <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-2xl shadow-md text-white font-bold text-lg">
                                FP
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                FinProp
                            </span>
                        </motion.div>
                        
                        <motion.nav
                            initial="closed"
                            animate="open"
                            variants={{ open: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
                            className="flex flex-col gap-4 w-full flex-1"
                        >
                            {menuItems.map((item) => (
                                <motion.div key={item.name} variants={itemVariants}>
                                    <button
                                        onClick={() => handleLinkClick(item.href)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                                    >
                                        <item.icon className="text-blue-500 bg-blue-100 dark:text-blue-300 dark:bg-gray-800 p-2 rounded-xl" size={28} />
                                        <span className="font-medium">{item.name}</span>
                                    </button>
                                </motion.div>
                            ))}
                        </motion.nav>
                         <motion.div
                            initial="closed"
                            animate="open"
                            variants={{ open: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } } }}
                            className="flex flex-col gap-2 w-full"
                        >
                            <motion.button variants={itemVariants}
                              onClick={toggleDarkMode}
                              className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                              title="Toggle dark mode"
                            >
                                {darkMode ? (
                                    <Sun className="text-yellow-400 bg-gray-800 p-2 rounded-xl" size={28} />
                                ) : (
                                    <Moon className="text-indigo-500 bg-blue-100 p-2 rounded-xl" size={28} />
                                )}
                                 <span className="font-medium">
                                    Toggle Theme
                                </span>
                            </motion.button>
                             {user && !user.isAnonymous && (
                                 <motion.div variants={itemVariants}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <div
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
                                              >
                                                <Avatar className="h-10 w-10 border-2 border-primary">
                                                    <AvatarImage src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`} alt={user.displayName || user.email || 'User'} />
                                                    <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col text-left">
                                                     <span className="font-medium text-sm truncate max-w-28">{user.displayName || user.email}</span>
                                                     <span className="text-xs text-muted-foreground">View Profile</span>
                                                </div>
                                              </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 mb-2 ml-2" align="start" side="right" forceMount>
                                             <DropdownMenuItem onClick={() => { handleLinkClick('/profile'); }}>
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
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
            <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-800 dark:text-gray-100 transition-colors duration-500 font-sans">
                <div className="hidden md:block">
                  <SidebarNav />
                </div>
                 <MobileSidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
                <div className="flex flex-col flex-1">
                    <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
                    <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
                        {children}
                    </main>
                </div>
                <FloatingActionButton />
            </div>
            <GlobalDialogs />
          </AppDataProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
