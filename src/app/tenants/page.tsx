'use client';

import { useState, useContext } from 'react';
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
    rent: z.coerce.number().min(1, 'Rent must be a positive number'),
    dueDate: z.date({ required_error: "Due date is required."}),
    whatsappNumber: z.string().optional(),
    propertyId: z.string().min(1, 'Please select a property'),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export default function TenantsPage() {
  const { tenants, properties, addTenant, updateTenant, removeTenant, loading } = useContext(AppDataContext);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
  });

  const getPropertyForTenant = (tenant: Tenant) => properties.find(p => p.id === tenant.propertyId);

  const openTenantForm = (tenant: Tenant | null) => {
    setEditingTenant(tenant);
    if (tenant) {
        tenantForm.reset({
            name: tenant.name,
            rent: tenant.rent,
            dueDate: new Date(tenant.dueDate),
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
                                            <p className="text-sm text-muted-foreground">Rent: ${tenant.rent} | Due on: {format(new Date(tenant.dueDate), 'PPP')}</p>
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
