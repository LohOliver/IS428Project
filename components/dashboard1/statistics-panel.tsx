"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Globe,
  AlertTriangle,
  Heart,
  Syringe,
} from "lucide-react";

interface CovidStats {
  total_cases: number;
  total_deaths: number;
  total_estimated_recovered: number;
  total_vaccinations: number;
}

export default function CovidStatsPanel() {
  const [stats, setStats] = useState<CovidStats>({
    total_cases: 0,
    total_deaths: 0,
    total_estimated_recovered: 0,
    total_vaccinations: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCovidData() {
      try {
        setLoading(true);
        // Fetch data from the API endpoint
        const response = await fetch('https://is428project.onrender.com/totals');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching COVID stats:", err);
        setError("Failed to load COVID statistics. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchCovidData();
  }, []);

  const title = "Global COVID-19 Statistics";

  // Calculate mortality rate
  const mortalityRate = stats.total_cases > 0 
    ? (stats.total_deaths / stats.total_cases * 100) 
    : 0;

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <div className="text-center p-4">Loading COVID-19 statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <div className="text-center p-4 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cases"
          value={stats.total_cases}
          icon={<Globe className="h-8 w-8 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Total Deaths"
          value={stats.total_deaths}
          icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          color="red"

        />
        <StatCard
          title="Total Recovered"
          value={Math.round(stats.total_estimated_recovered)}
          icon={<Heart className="h-8 w-8 text-green-500" />}
          color="green"
        />
        <StatCard
          title="Total Vaccinations"
          value={stats.total_vaccinations}
          icon={<Syringe className="h-8 w-8 text-purple-500" />}
          color="purple"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "red" | "green" | "purple";
  isPercentage?: boolean;
  secondaryText?: string;
}

function StatCard({ title, value, icon, color, isPercentage = false, secondaryText }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20",
    red: "bg-red-50 dark:bg-red-900/20",
    green: "bg-green-50 dark:bg-green-900/20",
    purple: "bg-purple-50 dark:bg-purple-900/20",
  };

  return (
    <Card className={`${colorClasses[color]} border-0`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <h3 className="mt-1 text-2xl font-bold">
              {isPercentage ? `${value.toFixed(2)}%` : value.toLocaleString()}
            </h3>
            {secondaryText && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {secondaryText}
              </p>
            )}
          </div>
          <div className="rounded-full p-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}