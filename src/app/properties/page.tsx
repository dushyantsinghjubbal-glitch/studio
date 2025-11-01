'use client';

import { useState, useContext, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Trash2, Edit, Building, Store, Trees, Briefcase, Calendar as CalendarIcon, MoreVertical, Search, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { AppDataContext, Property } from '@/context/AppDataContext';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


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
    maintenanceCharge: z.coerce.number().optional(),
    notes: z.string().optional(),
    currentTenantId: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

const PropertiesContent = () => {
  const { properties, tenants, addProperty, updateProperty, removeProperty, loading } = useContext(AppDataContext);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const propertyForm = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
        type: 'flat',
        category: 'residential',
        occupancyStatus: 'vacant',
        rentAmount: 0,
        maintenanceCharge: 0,
    }
  });

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openPropertyForm(null);
    }
  }, [searchParams]);

  const openPropertyForm = (property: Property | null) => {
    setEditingProperty(property);
    if (property) {
        propertyForm.reset(property);
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
            maintenanceCharge: 0,
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
          await addProperty(propertyData as Omit<Property, 'id' | 'createdAt' | 'updatedAt'>);
          toast({ title: "Property Added", description: `${data.name} has been added.` });
      }
      setIsPropertyFormOpen(false);
      setEditingProperty(null);
      router.replace('/properties'); // clean up query param
  };
  
  const handleRemoveProperty = (propertyId: string) => {
    removeProperty(propertyId);
    toast({ variant: 'destructive', title: 'Property Removed', description: 'The property has been removed.' });
  };

  const getPropertyIcon = (type: Property['type']) => {
    const props = { className: "h-6 w-6 text-muted-foreground" };
    switch (type) {
        case 'shop': return <Store {...props} />;
        case 'flat': return <Building {...props} />;
        case 'land': return <Trees {...props} />;
        case 'office': return <Briefcase {...props} />;
        default: return <Building {...props} />;
    }
  }

  const occupancyStatusColors: { [key in Property['occupancyStatus']]: string } = {
    vacant: 'bg-green-100 text-green-800 border-green-200',
    occupied: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    reserved: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const filteredProperties = properties.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Properties</CardTitle>
                    <CardDescription>Manage your rental properties and their details.</CardDescription>
                </div>
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search properties..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 {loading ? (<p>Loading properties...</p>) : filteredProperties.length === 0 ? (
                    <div className="text-center py-12">
                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No properties found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{searchTerm ? 'Try adjusting your search.' : 'Get started by adding your first property.'}</p>
                        <Button className="mt-6" onClick={() => openPropertyForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Property
                        </Button>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProperties.map((property) => (
                            <Card key={property.id} className="flex flex-col">
                                <CardHeader className="flex-row gap-4 items-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                        {getPropertyIcon(property.type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-lg">{property.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/properties/${property.id}`)}>
                                                <BarChart2 className="mr-2 h-4 w-4" />
                                                <span>View Details</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
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
                                                            This will permanently remove the property.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveProperty(property.id)} className="bg-red-600 hover:bg-red-700">
                                                            Yes, remove
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                     <div className="text-sm font-semibold text-primary">
                                        ₹{property.rentAmount}/month
                                    </div>
                                    <div className="text-sm text-muted-foreground capitalize">
                                        Category: {property.category}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <Badge variant="outline" className={cn("capitalize", occupancyStatusColors[property.occupancyStatus])}>
                                        {property.occupancyStatus}
                                    </Badge>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Dialog open={isPropertyFormOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsPropertyFormOpen(false);
                router.replace('/properties');
            }
        }}>
            <DialogContent 
                className="sm:max-w-3xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
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

                    <div className="grid md:grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="rentAmount">Rent Amount (₹)</Label>
                            <Input id="rentAmount" type="number" {...propertyForm.register('rentAmount')} />
                            {propertyForm.formState.errors.rentAmount && <p className="text-red-500 text-xs">{propertyForm.formState.errors.rentAmount.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="maintenanceCharge">Maintenance (₹/mo)</Label>
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

export default function PropertiesPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><p>Loading Properties...</p></div>}>
            <PropertiesContent />
        </Suspense>
    )
}
