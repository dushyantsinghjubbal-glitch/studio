'use client';

import { useState, useContext, useEffect } from 'react';
import { PlusCircle, Trash2, Edit, Building, Store, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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


const tenantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    rentAmount: z.coerce.number().min(1, 'Rent must be a positive number'),
    dueDate: z.date({ required_error: "Due date is required."}),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    propertyId: z.string().optional(), // Not required, but used for selection
    propertyName: z.string().min(1, 'Property name is required'),
    propertyAddress: z.string().min(1, 'Property address is required'),
    depositAmount: z.coerce.number().optional(),
    paymentMethod: z.enum(['cash', 'bank', 'upi', 'other']),
    notes: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export default function TenantsPage() {
  const { tenants, properties, addTenant, updateTenant, removeTenant, loading } = useContext(AppDataContext);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
        paymentMethod: 'bank',
    }
  });

  const selectedPropertyId = tenantForm.watch('propertyId');

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
  };

  const handleRemoveTenant = async (tenantId: string) => {
    await removeTenant(tenantId);
    toast({ variant: 'destructive', title: 'Tenant Removed', description: 'The tenant has been removed from your list.' });
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tenants</CardTitle>
                    <CardDescription>Manage your tenants and their information.</CardDescription>
                </div>
                <Button onClick={() => openTenantForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Tenant
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (<p>Loading tenants...</p>) : (
                    <div className="divide-y divide-border">
                        {tenants.map((tenant) => {
                            return (
                                <div key={tenant.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={`https://i.pravatar.cc/150?u=${tenant.id}`} />
                                            <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{tenant.name}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Building className="h-4 w-4" />
                                                <span>{tenant.propertyName}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Rent: ${tenant.rentAmount} | Due on: {format(new Date(tenant.dueDate), 'PPP')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openTenantForm(tenant)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit Tenant</span>
                                                </DropdownMenuItem>
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                                            <span className="text-red-500">Remove Tenant</span>
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently remove {tenant.name} and all their data.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveTenant(tenant.id)} className="bg-red-600 hover:bg-red-700">
                                                            Yes, remove tenant
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Tenant Add/Edit Dialog */}
        <Dialog open={isTenantFormOpen} onOpenChange={setIsTenantFormOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={tenantForm.handleSubmit(handleTenantFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tenant Name</Label>
                            <Input id="name" {...tenantForm.register('name')} />
                            {tenantForm.formState.errors.name && <p className="text-red-500 text-xs">{tenantForm.formState.errors.name.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone (for WhatsApp)</Label>
                            <Input id="phone" {...tenantForm.register('phone')} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input id="email" type="email" {...tenantForm.register('email')} />
                         {tenantForm.formState.errors.email && <p className="text-red-500 text-xs">{tenantForm.formState.errors.email.message}</p>}
                    </div>

                    {!editingTenant && (
                      <div className="grid gap-2">
                          <Label>Select Property</Label>
                          <Controller
                              name="propertyId"
                              control={tenantForm.control}
                              render={({ field }) => (
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Select a property to auto-fill" />
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
                            <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                            <Input id="depositAmount" type="number" {...tenantForm.register('depositAmount')} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Payment Method</Label>
                        <Controller
                            control={tenantForm.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a payment method" />
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
                         {tenantForm.formState.errors.paymentMethod && <p className="text-red-500 text-xs">{tenantForm.formState.errors.paymentMethod.message}</p>}
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
