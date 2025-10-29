'use client';

import { useContext } from 'react';
import { MoreVertical, Building, Users, Clock, PlusCircle, Bell, ReceiptText, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppDataContext } from '@/context/AppDataContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

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
              ${payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Expense
            </span>
            <span className="font-bold text-destructive">
              ${payload[1].value.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};


export default function DashboardPage() {
  const { tenants, properties, transactions, loading } = useContext(AppDataContext);
  const router = useRouter();

  const totalProperties = properties.length;
  const totalTenants = tenants.length;
  
  const pendingRents = tenants.filter(t => t.paymentStatus === 'due' || t.paymentStatus === 'overdue').length;
  const pendingAmount = tenants.filter(t => t.paymentStatus === 'due' || t.paymentStatus === 'overdue').reduce((acc, t) => acc + t.rentAmount, 0);

  const monthlyData = transactions.reduce((acc, curr) => {
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
  const totalMonthlyIncome = chartData.reduce((acc, d) => acc + d.income, 0);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 animate-in fade-in-50">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Send Reminders
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                    <Building className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loading ? '...' : totalProperties}</div>
                    <p className="text-xs text-muted-foreground">Managed properties</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                    <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loading ? '...' : totalTenants}</div>
                    <p className="text-xs text-muted-foreground">Tenants in properties</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Rents</CardTitle>
                    <Clock className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${loading ? '...' : pendingAmount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">From {pendingRents} tenant(s)</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
                    <BarChart2 className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-accent">+${totalMonthlyIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Income this month</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle>Income vs. Expenses</CardTitle>
                  <CardDescription>A summary of your monthly financial activity.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                              dataKey="month"
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                          />
                          <YAxis
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `$${Number(value) / 1000}k`}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 'var(--radius)' }} />
                          <Legend iconSize={10} />
                          <Bar dataKey="income" fill="hsl(var(--accent))" name="Income" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
        </div>
    </main>
  );
}
