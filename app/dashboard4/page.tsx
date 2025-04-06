"use client";
import * as React from "react";
import { useState } from "react";
import { DashboardNavbar } from "../../components/navbar";
import PolicyTimelineChart from "../../components/dashboard4/policyTimeline";
import PolicyCategoryChart from "../../components/dashboard4/policyCategoryChart"; // ✅ NEW

export default function Dashboard4() {
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
          <PolicyTimelineChart />
        </div>

        {/* ✅ NEW Chart */}
        <div className="rounded-lg border bg-card p-4 md:p-6">
          <PolicyCategoryChart />
        </div>
      </main>
    </div>
  );
}

