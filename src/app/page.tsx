
'use client';

import React, { useContext } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { AppDataContext } from "@/context/AppDataContext";
import { format } from 'date-fns';
import { useUser } from "@/firebase";

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
              ₹{payload.find(p => p.dataKey === 'income')?.value.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Expense
            </span>
            <span className="font-bold text-red-500">
              ₹{payload.find(p => p.dataKey === 'expense')?.value.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};


export default function FinPropDashboard() {
  const { transactions } = useContext(AppDataContext);
  const { user } = useUser();

  // --- Data processing ---
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = 0;
        acc[t.category] += t.amount;
        return acc;
    }, {} as Record<string, number>);

  const categoryColors: { [key: string]: string } = {
    'Rent Received': "#6366f1",
    'Salary': "#34d399",
    'Other': "#a855f7",
  };

  const pieChartData = Object.entries(incomeByCategory).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#f472b6',
  }));

  const monthlyData = transactions.reduce((acc, curr) => {
    const month = format(new Date(curr.date), 'MMM yyyy');
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
  
  const barChartData = Object.values(monthlyData).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // --- UI Data ---
  const summaryCards = [
    { title: "Total Income", amount: totalIncome, color: "bg-blue-100 dark:bg-blue-900/40", icon: "💰" },
    { title: "Total Expenses", amount: totalExpense, color: "bg-red-100 dark:bg-red-900/40", icon: "💸" },
    { title: "Net Balance", amount: netBalance, color: "bg-green-100 dark:bg-green-900/40", icon: "📈" },
  ];
  
  const welcomeName = user?.displayName || user?.email?.split('@')[0] || 'Welcome Back';

  return (
    <>
        <motion.h1
          className="text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Hello, {welcomeName} 👋
        </motion.h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Here’s your financial overview.
        </p>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {summaryCards.map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.03 }}
              className={`rounded-3xl ${card.color} p-6 shadow-md hover:shadow-xl border border-white/20`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl">{card.icon}</span>
              </div>
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <div className="flex justify-between items-end mt-2">
                <span className={`text-2xl font-bold ${card.amount < 0 ? 'text-red-500' : ''}`}>
                    ₹{card.amount.toLocaleString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Bar Chart */}
            <div className="lg:col-span-2 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Monthly Overview</h3>
                {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 'var(--radius)' }} />
                        <Legend iconSize={10} />
                        <Bar dataKey="income" fill="hsl(var(--chart-2))" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="hsl(var(--chart-5))" name="Expense" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                ) : (
                    <div className="text-center py-10 h-[300px] flex items-center justify-center">
                        <p className="text-muted-foreground">No transaction data available to display chart.</p>
                    </div>
                )}
            </div>

            {/* Pie Chart */}
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Income by Source</h3>
              {pieChartData.length > 0 ? (
                <div className="flex flex-col gap-6 items-center h-full justify-center">
                  <div className="w-full h-48">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2 text-sm w-full">
                    {pieChartData.map((d) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: d.color }}
                        ></span>
                        {d.name}: ₹{d.value.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                 <div className="text-center py-10 h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No income data available to display chart.</p>
                 </div>
              )}
            </div>
        </div>
    </>
  );
}
