'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarItem, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Users, Building, LogOut, Wallet, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppDataContext, AppDataProvider, Transaction } from '@/context/AppDataContext';
import { FirebaseClientProvider, useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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


function GlobalDialogs() {
    const { 
        properties, tenants, transactions, addTransaction, updateTransaction,
        isAddTransactionOpen, setAddTransactionOpen, 
        isScanReceiptOpen, setScanReceiptOpen, 
        editingTransaction, setEditingTransaction,
        extractedData, setExtractedData,
    } = useContext(AppDataContext);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const [isDuplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
    const [stagedTransaction, setStagedTransaction] = useState<TransactionFormValues | null>(null);


    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            date: new Date(),
        }
    });

    useEffect(() => {
        if (isAddTransactionOpen && editingTransaction) {
            form.reset({
                ...editingTransaction,
                date: new Date(editingTransaction.date),
            });
        } else if (isAddTransactionOpen && extractedData) {
            form.reset({
                ...form.getValues(),
                ...extractedData,
                date: extractedData.date ? new Date(extractedData.date) : new Date(),
            });
        } else if (!isAddTransactionOpen) {
            setEditingTransaction(null);
            setExtractedData(null);
            form.reset({
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
    }, [isAddTransactionOpen, editingTransaction, extractedData, form, setEditingTransaction, setExtractedData]);
    
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
        if (editingTransaction) {
            await updateTransaction({
                ...editingTransaction,
                ...data,
                date: data.date.toISOString(),
            });
            toast({ title: 'Transaction Updated', description: 'Your transaction has been updated.' });
        } else {
            await addTransaction({
                ...data,
                date: data.date.toISOString(),
            });
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


    return (
        <>
            {/* AI Receipt Scanner Dialog */}
            <Dialog open={isScanReceiptOpen} onOpenChange={setScanReceiptOpen}>
                <DialogContent>
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
                        }}>Cancel</Button>
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
                if (extractedData && !open) {
                    return;
                }
                setAddTransactionOpen(open);
            }}>
                <DialogContent className="sm:max-w-md" 
                    onInteractOutside={(e) => {
                        if (extractedData) {
                            e.preventDefault();
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        if (extractedData) {
                            e.preventDefault();
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : (extractedData ? 'Confirm Transaction' : 'Add Transaction')}</DialogTitle>
                        <DialogDescription>
                            {editingTransaction ? 'Update the details for your transaction.' : (extractedData ? 'Review the details extracted by the AI and save.' : 'Fill in the details for the new transaction.')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6 -mx-6">
                        <div className="grid gap-2 px-6">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" {...form.register('title')} />
                            {form.formState.errors.title && <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-6">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input id="amount" type="number" step="0.01" {...form.register('amount')} />
                                {form.formState.errors.amount && <p className="text-red-500 text-xs">{form.formState.errors.amount.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Controller name="type" control={form.control} render={({ field }) => (
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
                                <Controller name="category" control={form.control} render={({ field }) => (
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
                                <Controller name="date" control={form.control} render={({ field }) => (
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
                                <Controller name="propertyId" control={form.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Property..."/></SelectTrigger>
                                        <SelectContent>
                                            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                                <Controller name="tenantId" control={form.control} render={({ field }) => (
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
                            <Textarea id="notes" {...form.register('notes')} />
                        </div>

                        <DialogFooter className="px-6 pt-4 border-t mt-4">
                             <Button type="button" variant="outline" onClick={() => {
                                if (extractedData) {
                                    setExtractedData(null);
                                }
                                setAddTransactionOpen(false);
                            }}>Cancel</Button>
                            <Button type="submit">Save Transaction</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function UserMenu() {
    const { user } = useUser();
    const auth = useAuth();

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
  const { setAddTransactionOpen, setScanReceiptOpen } = useContext(AppDataContext);
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
            <PopoverContent className="w-56 p-2 mb-2" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" className="justify-start" onClick={() => { setAddTransactionOpen(true); setIsFabOpen(false); }}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => { setScanReceiptOpen(true); setIsFabOpen(false); }}>
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
    const { setOpenMobile } = useSidebar();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" onClick={() => setOpenMobile(false)}>
                    <Link href="/">
                        <Home />
                        <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ledger" onClick={() => setOpenMobile(false)}>
                    <Link href="/ledger">
                        <Wallet />
                        <span>Ledger</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Tenants" onClick={() => setOpenMobile(false)}>
                    <Link href="/tenants">
                        <Users />
                        <span>Tenants</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Properties" onClick={() => setOpenMobile(false)}>
                    <Link href="/properties">
                        <Building />
                        <span>Properties</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
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
              <SidebarProvider>
                  <Sidebar>
                      <SidebarHeader>
                          <div className="flex items-center gap-2 p-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                  <span className="text-sm font-bold">FP</span>
                              </div>
                              <span className="text-2xl font-bold tracking-tight">FinProp</span>
                          </div>
                      </SidebarHeader>
                      <SidebarContent>
                          <NavMenu />
                      </SidebarContent>
                       <SidebarFooter>
                            <UserMenu />
                        </SidebarFooter>
                  </Sidebar>
                  <SidebarInset>
                      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                          <SidebarTrigger className="md:hidden"/>
                      </header>
                      {children}
                      <FloatingActionButton />
                      <GlobalDialogs />
                  </SidebarInset>
              </SidebarProvider>
          </AppDataProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
