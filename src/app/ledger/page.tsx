'use client';

import { useState, useContext, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlusCircle, Upload, Edit, Trash2, MoreVertical, Search, Filter, FileDown, ArrowDown, ArrowUp, Briefcase, Droplets, Wrench, HandCoins, ShoppingCart, CircleHelp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppDataContext, Transaction } from '@/context/AppDataContext';
import Image from 'next/image';
import { recognizeTransaction, RecognizeTransactionInput } from '@/ai/flows/recognize-tenant-payment';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const LedgerContent = () => {
  const { transactions, properties, tenants, addTransaction, loading } = useContext(AppDataContext);
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<TransactionFormValues> | null>(null);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
        type: 'expense',
        date: new Date(),
    }
  });

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setIsFormOpen(true);
    } else if (action === 'scan') {
      setIsAiOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (extractedData) {
      form.reset(extractedData);
      setIsAiOpen(false);
      setIsFormOpen(true);
    }
  }, [extractedData, form]);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAiSubmit = async () => {
      if (!selectedFile) return;
      setIsProcessing(true);
      toast({ title: 'Analyzing Receipt...', description: 'The AI is extracting transaction details.' });

      try {
          const photoDataUri = await fileToDataUri(selectedFile);
          const input: RecognizeTransactionInput = { photoDataUri, context: "Extract transaction details from this receipt." };
          const result = await recognizeTransaction(input);

          setExtractedData({
              title: result.title,
              amount: result.amount,
              date: new Date(result.date),
              category: result.category,
              type: result.category === 'Rent Received' || result.category === 'Salary' ? 'income' : 'expense',
          });
          toast({ title: 'Success!', description: 'Please confirm the extracted details.' });
          
      } catch (error) {
          console.error("AI recognition failed:", error);
          toast({ variant: 'destructive', title: 'AI Error', description: 'Could not extract details from the receipt.' });
          setIsAiOpen(false);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleFormSubmit = async (data: TransactionFormValues) => {
      await addTransaction({
          ...data,
          date: data.date.toISOString(),
      });
      toast({ title: 'Transaction Saved', description: 'Your transaction has been recorded.' });
      setIsFormOpen(false);
      form.reset();
  };
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;


  const categoryIcons = {
    'Rent Received': <HandCoins className="h-full w-full" />,
    'Utilities': <Droplets className="h-full w-full" />,
    'Maintenance': <Wrench className="h-full w-full" />,
    'Salary': <Briefcase className="h-full w-full" />,
    'Groceries': <ShoppingCart className="h-full w-full" />,
    'Other': <CircleHelp className="h-full w-full" />,
  };
  
  const categoryColors = {
    'Rent Received': 'bg-green-100 text-green-800',
    'Utilities': 'bg-blue-100 text-blue-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Salary': 'bg-emerald-100 text-emerald-800',
    'Groceries': 'bg-orange-100 text-orange-800',
    'Other': 'bg-gray-100 text-gray-800',
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Financial Ledger</h2>
        </div>

         <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <ArrowUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-accent">${totalIncome.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                    <ArrowDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">${totalExpense.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-primary' : 'text-destructive'}`}>${netSavings.toLocaleString()}</div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>A list of all your income and expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading transactions...</p> : (
                    <div className="divide-y divide-border">
                        {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-4">
                                     <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg p-2', categoryColors[tx.category])}>
                                        {categoryIcons[tx.category]}
                                    </div>
                                    <div>
                                        <p className="font-medium">{tx.title}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(tx.date), 'PPP')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${tx.type === 'income' ? 'text-accent' : 'text-destructive'}`}>
                                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                                    </p>
                                    <Badge variant="outline">{tx.category}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* AI Receipt Scanner Dialog */}
        <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
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
                                setPreviewUrl(URL.createObjectURL(file));
                            }
                        }} />
                    </div>
                    {previewUrl && <Image src={previewUrl} alt="Receipt preview" width={400} height={400} className="rounded-md object-contain" />}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAiOpen(false)}>Cancel</Button>
                    <Button onClick={handleAiSubmit} disabled={!selectedFile || isProcessing}>
                        {isProcessing ? 'Analyzing...' : 'Extract Details'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Manual Transaction Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{extractedData ? 'Confirm Transaction' : 'Add Transaction'}</DialogTitle>
                    <DialogDescription>
                        {extractedData ? 'Review the details extracted by the AI and save.' : 'Fill in the details for the new transaction.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...form.register('title')} />
                        {form.formState.errors.title && <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>}
                    </div>

                     <div className="grid grid-cols-2 gap-4">
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

                     <div className="grid grid-cols-2 gap-4">
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
                     <div className="grid gap-2">
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
                     <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" {...form.register('notes')} />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit">Save Transaction</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </main>
  );
}


export default function LedgerPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LedgerContent />
        </Suspense>
    )
}
