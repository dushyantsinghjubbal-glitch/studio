'use client';

import { useState, useContext } from 'react';
import { PlusCircle, Trash2, Edit, Building, Store, Land, Briefcase, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppDataContext, Property } from '@/context/AppDataContext';
import { Badge } from '@/components/ui/badge';

const propertySchema = z.object({
    name: z.string().min(1, 'Property name is required'),
    type: z.enum(['shop', 'flat', 'land', 'office']),
    category: z.enum(['residential', 'commercial', 'agricultural']),
    address: z.string().min(1, 'Address is required'),
    rentAmount: z.coerce.number().min(0, 'Rent must be a positive number'),
    occupancyStatus: z.enum(['vacant', 'occupied', 'reserved']),
    areaSize: z.string().optional(),
    landmark: z.string().optional(),
    pinCode: z.string().optional(),
    depositAmount: z.coerce.number().optional(),
    maintenanceCharge: z.coerce.number().optional(),
    rentDueDate: z.date().optional(),
    availabilityDate: z.date().optional(),
    notes: z.string().optional(),
    currentTenantId: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function PropertiesPage() {
  const { properties, tenants, addProperty, updateProperty, removeProperty, loading } = useContext(AppDataContext);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const { toast } = useToast();
  
  const propertyForm = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
        type: 'flat',
        category: 'residential',
        occupancyStatus: 'vacant',
        rentAmount: 0,
        depositAmount: 0,
        maintenanceCharge: 0,
    }
  });

  const openPropertyForm = (property: Property | null) => {
    setEditingProperty(property);
    if (property) {
        propertyForm.reset({
            ...property,
            rentDueDate: property.rentDueDate ? new Date(property.rentDueDate) : undefined,
            availabilityDate: property.availabilityDate ? new Date(property.availabilityDate) : undefined,
        });
    } else {
        propertyForm.reset({
            name: '',
            type: 'flat',
            category: 'residential',
            address: '',
            rentAmount: 0,
            occupancyStatus: 'vacant',
            areaSize: '',
            landmark: '',
            pinCode: '',
            depositAmount: 0,
            maintenanceCharge: 0,
            rentDueDate: undefined,
            availabilityDate: undefined,
            notes: '',
            currentTenantId: '',
        });
    }
    setIsPropertyFormOpen(true);
  };

  const handlePropertyFormSubmit = async (data: PropertyFormValues) => {
      const propertyData = {
          ...data,
          currentTenantId: data.occupancyStatus === 'occupied' ? data.currentTenantId : '',
      };
      if (editingProperty) {
          await updateProperty({ ...editingProperty, ...propertyData });
          toast({ title: "Property Updated", description: `${data.name} has been updated.` });
      } else {
          await addProperty(propertyData);
          toast({ title: "Property Added", description: `${data.name} has been added.` });
      }
      setIsPropertyFormOpen(false);
      setEditingProperty(null);
  };
  
  const handleRemoveProperty = (propertyId: string) => {
    removeProperty(propertyId);
    toast({ variant: 'destructive', title: 'Property Removed', description: 'The property has been removed.' });
  };

  const getPropertyIcon = (type: Property['type']) => {
    switch (type) {
        case 'shop': return <Store className="h-8 w-8 text-muted-foreground" />;
        case 'flat': return <Building className="h-8 w-8 text-muted-foreground" />;
        case 'land': return <Land className="h-8 w-8 text-muted-foreground" />;
        case 'office': return <Briefcase className="h-8 w-8 text-muted-foreground" />;
        default: return <Building className="h-8 w-8 text-muted-foreground" />;
    }
  }

  const occupancyStatusColors = {
    vacant: 'bg-green-500/80 hover:bg-green-500/90',
    occupied: 'bg-yellow-500/80 hover:bg-yellow-500/90',
    reserved: 'bg-blue-500/80 hover:bg-blue-500/90',
  };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Properties</CardTitle>
                    <CardDescription>Manage your rental properties and their details.</CardDescription>
                </div>
                <Button onClick={() => openPropertyForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Property
                </Button>
            </CardHeader>
            <CardContent>
                 {loading ? (<p>Loading properties...</p>) : (
                    <div className="divide-y divide-border">
                        {properties.map((property) => (
                            <div key={property.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-4">
                                    {getPropertyIcon(property.type)}
                                    <div>
                                        <p className="font-medium">{property.name}</p>
                                        <p className="text-sm text-muted-foreground">{property.address}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={property.occupancyStatus === 'vacant' ? 'default' : 'secondary'} className={occupancyStatusColors[property.occupancyStatus]}>
                                                {property.occupancyStatus.charAt(0).toUpperCase() + property.occupancyStatus.slice(1)}
                                            </Badge>
                                             <p className="text-sm font-semibold">${property.rentAmount}/mo</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openPropertyForm(property)}>
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
                                                            This action cannot be undone. This will permanently remove the property.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveProperty(property.id)} className="bg-red-600 hover:bg-red-700">
                                                            Yes, remove property
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
        
        <Dialog open={isPropertyFormOpen} onOpenChange={setIsPropertyFormOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
                    <DialogDescription>
                        {editingProperty ? 'Update the details for your property.' : 'Enter the details for your new property.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={propertyForm.handleSubmit(handlePropertyFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Property Name</Label>
                            <Input id="name" {...propertyForm.register('name')} placeholder="e.g., Shop 2, Flat A-3" />
                            {propertyForm.formState.errors.name && <p className="text-red-500 text-xs">{propertyForm.formState.errors.name.message}</p>}
                        </div>
                         <div className="grid gap-2">
                            <Label>Property Type</Label>
                            <Controller name="type" control={propertyForm.control} render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shop">Shop</SelectItem>
                                        <SelectItem value="flat">Flat</SelectItem>
                                        <SelectItem value="land">Land</SelectItem>
                                        <SelectItem value="office">Office</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label>Category</Label>
                        <Controller name="category" control={propertyForm.control} render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="residential">Residential</SelectItem>
                                    <SelectItem value="commercial">Commercial</SelectItem>
                                    <SelectItem value="agricultural">Agricultural</SelectItem>
                                </SelectContent>
                            </Select>
                        )} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" {...propertyForm.register('address')} placeholder="Full postal address"/>
                        {propertyForm.formState.errors.address && <p className="text-red-500 text-xs">{propertyForm.formState.errors.address.message}</p>}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="areaSize">Area Size</Label>
                            <Input id="areaSize" {...propertyForm.register('areaSize')} placeholder="e.g., 450 sq ft" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input id="landmark" {...propertyForm.register('landmark')} placeholder="Near main bus stand"/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pinCode">Pin Code</Label>
                            <Input id="pinCode" {...propertyForm.register('pinCode')} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="rentAmount">Rent Amount ($)</Label>
                            <Input id="rentAmount" type="number" {...propertyForm.register('rentAmount')} />
                            {propertyForm.formState.errors.rentAmount && <p className="text-red-500 text-xs">{propertyForm.formState.errors.rentAmount.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                            <Input id="depositAmount" type="number" {...propertyForm.register('depositAmount')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="maintenanceCharge">Maintenance ($/mo)</Label>
                            <Input id="maintenanceCharge" type="number" {...propertyForm.register('maintenanceCharge')} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label>Occupancy Status</Label>
                            <Controller name="occupancyStatus" control={propertyForm.control} render={({ field }) => (
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    propertyForm.trigger('currentTenantId');
                                }} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vacant">Vacant</SelectItem>
                                        <SelectItem value="occupied">Occupied</SelectItem>
                                        <SelectItem value="reserved">Reserved</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                        {propertyForm.watch('occupancyStatus') === 'occupied' && (
                             <div className="grid gap-2">
                                <Label>Current Tenant</Label>
                                <Controller name="currentTenantId" control={propertyForm.control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                                        <SelectContent>
                                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                        )}
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label>Rent Due Date</Label>
                            <Controller name="rentDueDate" control={propertyForm.control} render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )} />
                        </div>
                        <div className="grid gap-2">
                           <Label>Next Availability Date</Label>
                            <Controller name="availabilityDate" control={propertyForm.control} render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            )} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" {...propertyForm.register('notes')} placeholder="e.g., needs repaint before next tenant" />
                    </div>

                    <DialogFooter className="border-t pt-4 mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">{editingProperty ? 'Save Changes' : 'Add Property'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </main>
  );
}
