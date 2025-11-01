'use client';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from 'next/link';
import { Home, Book, Users, Building, Sun, Moon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const chartData = [
  { name: "Rental", value: 12000, color: "#6366f1" },
  { name: "Farm", value: 8000, color: "#34d399" },
  { name: "Other", value: 2500, color: "#a855f7" },
];

export default function FinPropDashboard() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);
  
  const menuItems = [
      { name: "Dashboard", icon: Home, href: "/" },
      { name: "Ledger", icon: Book, href: "/ledger" },
      { name: "Tenants", icon: Users, href: "/tenants" },
      { name: "Properties", icon: Building, href: "/properties" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-800 dark:text-gray-100 transition-colors duration-500 font-sans">
      {/* Sidebar */}
      <aside className="w-20 md:w-60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-lg shadow-lg flex flex-col items-center md:items-start py-6 px-2 rounded-r-3xl border-r border-purple-100 dark:border-gray-800">
        <motion.div
          className="mb-8 flex items-center gap-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-2xl shadow-md text-white font-bold text-lg">
            FP
          </div>
          <span className="hidden md:block font-semibold text-gray-700 dark:text-gray-200">
            FinProp
          </span>
        </motion.div>

        <nav className="flex flex-col gap-4 w-full">
          {menuItems.map((item) => (
            <Link href={item.href} key={item.name}>
              <motion.div
                whileHover={{ scale: 1.07 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all"
              >
                <item.icon
                  className="text-blue-500 bg-blue-100 dark:text-blue-300 dark:bg-gray-800 p-2 rounded-xl"
                  size={28}
                />
                <span className="hidden md:block font-medium">
                  {item.name}
                </span>
              </motion.div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Dashboard Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        {/* Toggle Button */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="absolute right-6 top-6 bg-white/70 dark:bg-gray-800 p-3 rounded-full shadow-md hover:scale-105 transition-transform"
          title="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="text-yellow-400" size={20} />
          ) : (
            <Moon className="text-indigo-500" size={20} />
          )}
        </button>

        <motion.h1
          className="text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Hello, Dushyant 👋
        </motion.h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Here’s your monthly finance overview
        </p>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { title: "Rental Income", month: "₹12,000", year: "₹1,20,000", color: "bg-blue-100 dark:bg-blue-900/40", icon: "🏠" },
            { title: "Farm Income", month: "₹8,000", year: "₹95,000", color: "bg-green-100 dark:bg-green-900/40", icon: "🌿" },
            { title: "Other Income", month: "₹2,500", year: "₹20,000", color: "bg-purple-100 dark:bg-purple-900/40", icon: "💼" },
          ].map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.03 }}
              className={`rounded-3xl ${card.color} p-6 shadow-md hover:shadow-xl border border-white/20`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl">{card.icon}</span>
                <span className="text-gray-500 text-sm">This Year</span>
              </div>
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-bold">{card.month}</span>
                <span className="text-gray-500 text-sm">{card.year}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Donut Chart */}
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Income by Source</h3>
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
                  <Tooltip />
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
        </div>
      </main>
    </div>
  );
}
