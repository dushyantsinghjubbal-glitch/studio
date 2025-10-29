'use client';

import { useState } from 'react';
import { DollarSign, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Tenant = {
  id: string;
  name: string;
  avatar: string;
  rent: number;
  status: 'paid' | 'pending';
  dueDate: Date;
  whatsappNumber?: string;
  propertyId: string;
};

const initialTenants: Tenant[] = [
  { id: '1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', rent: 1200, status: 'paid', dueDate: new Date('2024-05-01'), whatsappNumber: '1234567890', propertyId: '1' },
  { id: '2', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', rent: 950, status: 'pending', dueDate: new Date('2024-05-05'), whatsappNumber: '0987654321', propertyId: '2' },
  { id: '3', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', rent: 1500, status: 'paid', dueDate: new Date('2024-05-03'), propertyId: '3' },
  { id: '4', name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', rent: 1100, status: 'pending', dueDate: new Date('2024-05-10'), whatsappNumber: '1122334455', propertyId: '4' },
];

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);

  const totalIncome = tenants.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.rent, 0);
  const pendingRent = tenants.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.rent, 0);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total rent collected this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Rent</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${pendingRent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total rent pending for this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Active Rentals</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{tenants.length}</div>
                    <p className="text-xs text-muted-foreground">Total active tenants</p>
                </CardContent>
            </Card>
        </div>
        <div className="text-center p-8">
            <h2 className="text-2xl font-semibold">Welcome to RentBox</h2>
            <p className="text-muted-foreground mt-2">Use the sidebar to navigate to Tenants and Properties.</p>
        </div>
    </main>
  );
}
