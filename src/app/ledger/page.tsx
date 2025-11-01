'use client';

import { useState, useContext, useEffect, Suspense } from 'react';
import { MoreVertical, Search, Edit, Trash2, ArrowDown, ArrowUp, Briefcase, Droplets, Wrench, HandCoins, ShoppingCart, CircleHelp, Wallet, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, add } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppDataContext, Tenant, Transaction } from '@/context/AppDataContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const LedgerContent = () => {
  const { transactions, tenants, removeTransaction, loading, setAddTransactionOpen, setEditingTransaction } = useContext(AppDataContext);
  const { toast } = useToast();

  const openTransactionForm = (tx: Transaction | null) => {
    setEditingTransaction(tx);
    setAddTransactionOpen(true);
  };
  
  const handleRemoveTransaction = (transactionId: string) => {
    removeTransaction(transactionId);
    toast({ variant: 'destructive', title: 'Transaction Removed' });
  };
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  const pendingReceipts = tenants.filter(t => t.paymentStatus === 'due' || t.paymentStatus === 'overdue');

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
  
  const getBrandLogo = (merchant?: string) => {
      if (!merchant) return null;
      const domain = merchant.toLowerCase().replace(/\s+/g, '') + '.com';
      return `https://logo.clearbit.com/${domain}`;
  }
  
  const paymentStatusColors: { [key in Tenant['paymentStatus']]: string } = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    partial: 'bg-orange-100 text-orange-800 border-orange-200',
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
                    <div className="text-2xl font-bold text-accent">₹{totalIncome.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                    <ArrowDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">₹{totalExpense.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-primary' : 'text-destructive'}`}>₹{netSavings.toLocaleString()}</div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Generated Rental Receipts</CardTitle>
                <CardDescription>Status of pending rent payments for which receipts have been generated.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading receipts...</p> : pendingReceipts.length === 0 ? (
                     <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Pending Receipts</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Generate a receipt from the dashboard to start a payment cycle.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {pendingReceipts.map(tenant => {
                            const dueDate = tenant.lastReceiptGenerationDate ? add(new Date(tenant.lastReceiptGenerationDate), { days: tenant.netTerms || 0 }) : null;
                            return (
                                <div key={tenant.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border">
                                          <AvatarImage src={`https://i.pravatar.cc/150?u=${tenant.id}`} />
                                          <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                          <p className="font-medium">{tenant.name}</p>
                                          {dueDate && 
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3"/>
                                                Due by {format(dueDate, 'PPP')}
                                            </p>
                                          }
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="font-semibold text-primary">₹{tenant.rentAmount.toLocaleString()}</p>
                                            <Badge variant="outline" className={cn("capitalize", paymentStatusColors[tenant.paymentStatus])}>
                                                {tenant.paymentStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>

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
                                     <Avatar className="h-10 w-10 rounded-lg">
                                        <AvatarImage src={getBrandLogo(tx.merchant)} alt={tx.merchant || tx.category} />
                                        <AvatarFallback className={cn('flex items-center justify-center rounded-lg p-2', categoryColors[tx.category])}>
                                            {categoryIcons[tx.category]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{tx.title}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(tx.date), 'PPP')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.type === 'income' ? 'text-accent' : 'text-destructive'}`}>
                                            {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </p>
                                        <Badge variant="outline">{tx.category}</Badge>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openTransactionForm(tx)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the transaction: "{tx.title}".
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveTransaction(tx.id)} className="bg-red-600 hover:bg-red-700">
                                                            Yes, delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </main>
  );
}


export default function LedgerPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><p>Loading Ledger...</p></div>}>
            <LedgerContent />
        </Suspense>
    )
}

    