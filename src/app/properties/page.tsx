'use client';

import { useState, useContext } from 'react';
import { PlusCircle, Trash2, Edit, Building, Store } from 'lucide-react';
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
import Link from 'next/link';
import { AppDataContext, Property } from '@/context/AppDataContext';

const propertySchema = z.object({
    name: z.string().min(1, 'Property name is required'),
    type: z.enum(['apartment', 'shop']),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function PropertiesPage() {
  const { properties, setProperties, tenants } = useContext(AppDataContext);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const { toast } = useToast();
  
  const propertyForm = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: { type: 'apartment' }
  });

  const openPropertyForm = (property: Property | null) => {
    setEditingProperty(property);
    if(property) {
        propertyForm.reset({
            name: property.name,
            type: property.type,
        });
    } else {
        propertyForm.reset({
            name: '',
            type: 'apartment',
        });
    }
    setIsPropertyFormOpen(true);
  };

  const handlePropertyFormSubmit = (data: PropertyFormValues) => {
      if (editingProperty) {
          setProperties(properties.map(p => p.id === editingProperty.id ? { ...editingProperty, ...data } : p));
          toast({ title: "Property Updated", description: `${data.name} has been updated.` });
      } else {
          const newProperty: Property = {
              id: (properties.length + 1 + Math.random()).toString(),
              name: data.name,
              type: data.type
          };
          setProperties([...properties, newProperty]);
          toast({ title: "Property Added", description: `${data.name} has been added.` });
      }
      setIsPropertyFormOpen(false);
      setEditingProperty(null);
  };
  
  const handleRemoveProperty = (propertyId: string) => {
    if (tenants.some(t => t.propertyId === propertyId)) {
        toast({ variant: 'destructive', title: 'Cannot Remove Property', description: 'This property is currently assigned to a tenant.' });
        return;
    }
    setProperties(properties.filter(p => p.id !== propertyId));
    toast({ variant: 'destructive', title: 'Property Removed', description: 'The property has been removed.' });
  };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
            <Button onClick={() => openPropertyForm(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Property
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Properties</CardTitle>
                <CardDescription>Manage your rental properties.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border">
                    {properties.map((property) => (
                        <div key={property.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-4">
                                {property.type === 'apartment' ? <Building className="h-8 w-8 text-muted-foreground" /> : <Store className="h-8 w-8 text-muted-foreground" />}
                                <div>
                                    <p className="font-medium">{property.name}</p>
                                    <p className="text-sm text-muted-foreground">{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openPropertyForm(property)}>
                                    <Edit className="mr-2 h-3 w-3" /> Edit
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-3 w-3" /> Remove
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. You can only remove properties that are not assigned to any tenant.
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
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
        
        {/* Property Add/Edit Dialog */}
        <Dialog open={isPropertyFormOpen} onOpenChange={setIsPropertyFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={propertyForm.handleSubmit(handlePropertyFormSubmit)} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="propertyName">Property Name / Address</Label>
                        <Input id="propertyName" {...propertyForm.register('name')} />
                        {propertyForm.formState.errors.name && <p className="text-red-500 text-xs">{propertyForm.formState.errors.name.message}</p>}
                    </div>
                     <div className="grid gap-2">
                        <Label>Property Type</Label>
                        <Controller
                            control={propertyForm.control}
                            name="type"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select property type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="apartment">Apartment</SelectItem>
                                        <SelectItem value="shop">Shop</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {propertyForm.formState.errors.type && <p className="text-red-500 text-xs">{propertyForm.formState.errors.type.message}</p>}
                    </div>
                    <DialogFooter>
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
