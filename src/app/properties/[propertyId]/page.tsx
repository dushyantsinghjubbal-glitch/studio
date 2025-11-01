'use client';

import { useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { AppDataContext, Property, Tenant, Transaction } from '@/context/AppDataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Wallet, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Income
            </span>
            <span className="font-bold text-green-500">
              ₹{payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Expense
            </span>
            <span className="font-bold text-red-500">
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
  
  const statCards = [
    { title: "Total Income", amount: totalIncome, icon: <ArrowUp className="text-green-500" />, color: "from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40" },
    { title: "Total Expense", amount: totalExpense, icon: <ArrowDown className="text-red-500" />, color: "from-red-50 to-rose-50 dark:from-red-900/40 dark:to-rose-900/40" },
    { title: "Net Profit", amount: netProfit, icon: <Wallet className="text-blue-500" />, color: "from-blue-50 to-cyan-50 dark:from-blue-900/40 dark:to-cyan-900/40" },
  ];

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex flex-1 flex-col gap-6">
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

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
           {statCards.map(card => (
              <motion.div
                key={card.title}
                whileHover={{ scale: 1.03 }}
                className={`rounded-3xl bg-gradient-to-br ${card.color} p-6 shadow-md hover:shadow-xl border border-white/20`}
              >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      {card.icon}
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className={`text-2xl font-bold ${card.amount >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-500 dark:text-red-400'}`}>₹{card.amount.toLocaleString()}</div>
                       <p className="text-xs text-muted-foreground">Total for this property</p>
                  </CardContent>
              </motion.div>
            ))}
        </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Income vs. Expenses for {property.name}.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 'var(--radius)' }} />
                <Legend iconSize={10} />
                <Bar dataKey="income" fill="var(--color-green-500)" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--color-red-500)" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </div>
        <div className="lg:col-span-3 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
            <CardHeader className="p-0 pb-4">
                <CardTitle>Property Info</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid gap-4">
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
        </div>
      </div>
    </motion.main>
  );
}
