"use client";
import * as React from "react";
import { useState } from "react";
import { DashboardNavbar } from "../../components/navbar";
import PolicyTimelineChart from "../../components/dashboard4/policyTimeline";
import PolicyCategoryPieChart from "@/components/dashboard4/policyCategoryChart";
import NewCasesGraph from "@/components/dashboard4/policyOutcome";
export default function Dashboard4() {
  const [filter, setFilter] = useState("Singapore");
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
  };
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Policy Timeline Dashboard</h1>
          <p className="text-gray-500">
            Track and analyze global policy implementations over time
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 md:p-6">
          <PolicyTimelineChart onFilterChange={handleFilterChange} />
        </div>

        {/* Policy Timeline Chart Component */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-card p-4 md:p-6">
            <NewCasesGraph
              location={filter}
              startDate="2020-01"
              endDate="2023-01"
            />
          </div>

          <div className="rounded-lg border bg-card p-4 md:p-6">
            <PolicyCategoryPieChart location={filter} />
          </div>
        </div>
      </main>
    </div>
  );
}
