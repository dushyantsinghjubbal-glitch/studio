'use client';

import { useState, useContext, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Trash2, Edit, MoreVertical, Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppDataContext, Tenant } from '@/context/AppDataContext';
import { Badge } from '@/components/ui/badge';


const tenantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    rentAmount: z.coerce.number().min(1, 'Rent must be a positive number'),
    dueDate: z.date({ required_error: "Due date is required."}),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    propertyId: z.string().optional(),
    propertyName: z.string().min(1, 'Property name is required'),
    propertyAddress: z.string().min(1, 'Property address is required'),
    depositAmount: z.coerce.number().optional(),
    netTerms: z.coerce.number().optional(),
    paymentMethod: z.enum(['cash', 'bank', 'upi', 'other']),
    notes: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export default function TenantsPage() {
  const { tenants, properties, addTenant, updateTenant, removeTenant, loading } = useContext(AppDataContext);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
        paymentMethod: 'bank',
        netTerms: 0,
    }
  });

  const selectedPropertyId = tenantForm.watch('propertyId');

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openTenantForm(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPropertyId) {
        const selectedProperty = properties.find(p => p.id === selectedPropertyId);
        if (selectedProperty) {
            tenantForm.setValue('propertyName', selectedProperty.name);
            tenantForm.setValue('propertyAddress', selectedProperty.address);
            tenantForm.setValue('rentAmount', selectedProperty.rentAmount);
            if (selectedProperty.depositAmount) {
                tenantForm.setValue('depositAmount', selectedProperty.depositAmount);
            }
            if (selectedProperty.rentDueDate) {
                tenantForm.setValue('dueDate', new Date(selectedProperty.rentDueDate));
            }
        }
    }
  }, [selectedPropertyId, properties, tenantForm]);


  const openTenantForm = (tenant: Tenant | null) => {
    setEditingTenant(tenant);
    if (tenant) {
        tenantForm.reset({
            name: tenant.name,
            rentAmount: tenant.rentAmount,
            dueDate: new Date(tenant.dueDate),
            phone: tenant.phone || '',
            email: tenant.email || '',
            propertyName: tenant.propertyName,
            propertyAddress: tenant.propertyAddress,
            depositAmount: tenant.depositAmount || 0,
            netTerms: tenant.netTerms || 0,
            paymentMethod: tenant.paymentMethod,
            notes: tenant.notes || '',
        });
    } else {
        tenantForm.reset({
            name: '',
            rentAmount: 0,
            dueDate: undefined,
            phone: '',
            email: '',
            propertyName: '',
            propertyAddress: '',
            depositAmount: 0,
            netTerms: 0,
            paymentMethod: 'bank',
            notes: '',
            propertyId: '',
        });
    }
    setIsTenantFormOpen(true);
  };

  const handleTenantFormSubmit = async (data: TenantFormValues) => {
    if (editingTenant) {
        await updateTenant({ ...editingTenant, ...data });
        toast({ title: "Tenant Updated", description: `${data.name}'s details have been updated.` });
    } else {
        await addTenant(data);
        toast({ title: "Tenant Added", description: `${data.name} has been added to your tenants list.` });
    }
    setIsTenantFormOpen(false);
    setEditingTenant(null);
    router.replace('/tenants'); // clean up query param
  };

  const handleRemoveTenant = async (tenantId: string) => {
    await removeTenant(tenantId);
    toast({ variant: 'destructive', title: 'Tenant Removed', description: 'The tenant has been removed from your list.' });
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tenants</CardTitle>
                    <CardDescription>Manage your tenants and their information.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (<p>Loading tenants...</p>) : tenants.length === 0 ? (
                    <div className="text-center py-12">
                        <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No tenants found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first tenant.</p>
                        <Button className="mt-6" onClick={() => openTenantForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Tenant
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tenants.map((tenant) => (
                            <Card key={tenant.id} className="flex flex-col">
                                <CardHeader className="flex-row gap-4 items-start">
                                    <Avatar className="h-12 w-12 border">
                                        <AvatarImage src={`https://i.pravatar.cc/150?u=${tenant.id}`} />
                                        <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold text-lg">{tenant.name}</p>
                                        <p className="text-sm text-muted-foreground">{tenant.propertyName}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openTenantForm(tenant)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Remove</span>
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently remove {tenant.name}.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRemoveTenant(tenant.id)} className="bg-red-600 hover:bg-red-700">
                                                        Remove Tenant
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                     <div className="text-sm text-muted-foreground">
                                        Rent: <span className="font-semibold text-foreground">${tenant.rentAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Due on: <span className="font-semibold text-foreground">{format(new Date(tenant.dueDate), 'do MMMM')}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Badge 
                                        className={cn(
                                            'capitalize transition-all',
                                            tenant.paymentStatus === 'paid' && 'bg-green-100 text-green-800 border-green-200',
                                            tenant.paymentStatus === 'due' && 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse',
                                            tenant.paymentStatus === 'overdue' && 'bg-red-100 text-red-800 border-red-200 animate-bounce',
                                            tenant.paymentStatus === 'partial' && 'bg-orange-100 text-orange-800 border-orange-200'
                                        )}
                                        variant="outline"
                                    >
                                        {tenant.paymentStatus}
                                    </Badge>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Tenant Add/Edit Dialog */}
        <Dialog open={isTenantFormOpen} onOpenChange={(isOpen) => {
            setIsTenantFormOpen(isOpen);
            if (!isOpen) router.replace('/tenants');
        }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={tenantForm.handleSubmit(handleTenantFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">
                    {!editingTenant && (
                      <div className="grid gap-2 p-4 bg-muted/50 rounded-lg">
                          <Label>Auto-fill from Property</Label>
                          <Controller
                              name="propertyId"
                              control={tenantForm.control}
                              render={({ field }) => (
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Select a property..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.address}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              )}
                          />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tenant Name</Label>
                            <Input id="name" {...tenantForm.register('name')} />
                            {tenantForm.formState.errors.name && <p className="text-red-500 text-xs">{tenantForm.formState.errors.name.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone (Optional)</Label>
                            <Input id="phone" {...tenantForm.register('phone')} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input id="email" type="email" {...tenantForm.register('email')} />
                         {tenantForm.formState.errors.email && <p className="text-red-500 text-xs">{tenantForm.formState.errors.email.message}</p>}
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="propertyName">Property Name</Label>
                            <Input id="propertyName" {...tenantForm.register('propertyName')} />
                            {tenantForm.formState.errors.propertyName && <p className="text-red-500 text-xs">{tenantForm.formState.errors.propertyName.message}</p>}
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="propertyAddress">Property Address</Label>
                            <Input id="propertyAddress" {...tenantForm.register('propertyAddress')} />
                            {tenantForm.formState.errors.propertyAddress && <p className="text-red-500 text-xs">{tenantForm.formState.errors.propertyAddress.message}</p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="rentAmount">Rent Amount ($)</Label>
                            <Input id="rentAmount" type="number" {...tenantForm.register('rentAmount')} />
                            {tenantForm.formState.errors.rentAmount && <p className="text-red-500 text-xs">{tenantForm.formState.errors.rentAmount.message}</p>}
                        </div>
                        <div className="grid gap-2">
                           <Label htmlFor="dueDate">Due Date</Label>                            <Controller
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
                         <div className="grid gap-2">
                            <Label htmlFor="depositAmount">Deposit ($)</Label>
                            <Input id="depositAmount" type="number" {...tenantForm.register('depositAmount')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Payment Method</Label>
                            <Controller
                                control={tenantForm.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="bank">Bank Transfer</SelectItem>
                                            <SelectItem value="upi">UPI</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                         <div className="grid gap-2">
                            <Label>Net Terms (Grace Period)</Label>
                            <Controller
                                control={tenantForm.control}
                                name="netTerms"
                                render={({ field }) => (
                                    <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} defaultValue={String(field.value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select grace period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            {[...Array(11)].map((_, i) => (
                                                <SelectItem key={i+5} value={String(i + 5)}>Net {i + 5}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                     <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input id="notes" {...tenantForm.register('notes')} />
                    </div>

                    <DialogFooter className="border-t pt-4 mt-4">
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
