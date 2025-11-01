'use client';

import React, { useContext } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AppDataContext } from "@/context/AppDataContext";

export default function FinPropDashboard() {
  const { transactions } = useContext(AppDataContext);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
        if (!acc[t.category]) {
            acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
    }, {} as Record<string, number>);

  const categoryColors: { [key: string]: string } = {
    'Rent Received': "#6366f1",
    'Salary': "#34d399",
    'Other': "#a855f7",
  };

  const chartData = Object.entries(incomeByCategory).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#f472b6',
  }));
  
  const incomeCards = [
    { title: "Total Income", amount: totalIncome, color: "bg-blue-100 dark:bg-blue-900/40", icon: "💰" },
    { title: "Total Expenses", amount: totalExpense, color: "bg-red-100 dark:bg-red-900/40", icon: "💸" },
    { title: "Net Balance", amount: totalIncome - totalExpense, color: "bg-green-100 dark:bg-green-900/40", icon: "📈" },
  ];

  return (
    <>
        <motion.h1
          className="text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Hello, Welcome Back 👋
        </motion.h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Here’s your monthly finance overview
        </p>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {incomeCards.map((card) => (
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
                <span className="text-2xl font-bold">₹{card.amount.toLocaleString()}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Donut Chart */}
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Income by Source</h3>
          {chartData.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-1/2 h-60">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm">
                {chartData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full inline-block"
                      style={{ backgroundColor: d.color }}
                    ></span>
                    {d.name}: ₹{d.value.toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
             <div className="text-center py-10">
                <p className="text-muted-foreground">No income data available to display chart.</p>
             </div>
          )}
        </div>
    </>
  );
}
