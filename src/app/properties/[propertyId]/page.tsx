'use client';

import { useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { AppDataContext, Property, Tenant, Transaction } from '@/context/AppDataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Income
            </span>
            <span className="font-bold text-accent">
              ₹{payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Expense
            </span>
            <span className="font-bold text-destructive">
              ₹{payload[1].value.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PropertyDetailsPage() {
  const { propertyId } = useParams();
  const { properties, tenants, transactions, loading } = useContext(AppDataContext);
  const router = useRouter();

  const property = properties.find((p) => p.id === propertyId);
  const propertyTransactions = transactions.filter((t) => t.propertyId === propertyId);
  const currentTenant = tenants.find((t) => t.id === property?.currentTenantId);

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center"><p>Loading property details...</p></div>;
  }

  if (!property) {
    return <div className="flex h-screen w-full items-center justify-center"><p>Property not found.</p></div>;
  }

  const monthlyData = propertyTransactions.reduce((acc, curr) => {
    const month = format(new Date(curr.date), 'MMM');
    if (!acc[month]) {
      acc[month] = { month, income: 0, expense: 0 };
    }
    if (curr.type === 'income') {
      acc[month].income += curr.amount;
    } else {
      acc[month].expense += curr.amount;
    }
    return acc;
  }, {} as Record<string, { month: string; income: number; expense: number }>);

  const chartData = Object.values(monthlyData);
  
  const totalIncome = propertyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = propertyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const occupancyStatusColors: { [key in Property['occupancyStatus']]: string } = {
    vacant: 'bg-green-100 text-green-800 border-green-200',
    occupied: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    reserved: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {property.name}
        </h1>
        <Badge variant="outline" className={cn("capitalize", occupancyStatusColors[property.occupancyStatus])}>
            {property.occupancyStatus}
        </Badge>
      </div>

       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <Wallet className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-accent">₹{totalIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total income from this property</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <Wallet className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">₹{totalExpense.toLocaleString()}</div>
                     <p className="text-xs text-muted-foreground">Total expenses for this property</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>₹{netProfit.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Net profit after all expenses</p>
                </CardContent>
            </Card>
        </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Income vs. Expenses for {property.name}.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 'var(--radius)' }} />
                <Legend iconSize={10} />
                <Bar dataKey="income" fill="hsl(var(--accent))" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Property Info</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex items-center gap-4">
                    <Building className="h-6 w-6 text-muted-foreground"/>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">Address</p>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <Wallet className="h-6 w-6 text-muted-foreground"/>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">Rent</p>
                        <p className="text-sm text-muted-foreground">₹{property.rentAmount.toLocaleString()} / month</p>
                    </div>
                </div>
                {currentTenant ? (
                     <div className="flex items-center gap-4">
                        <User className="h-6 w-6 text-muted-foreground"/>
                        <div className="grid gap-1">
                            <p className="text-sm font-medium leading-none">Current Tenant</p>
                            <p className="text-sm text-muted-foreground">{currentTenant.name}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <User className="h-6 w-6 text-muted-foreground"/>
                        <div className="grid gap-1">
                            <p className="text-sm font-medium leading-none">No Current Tenant</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
