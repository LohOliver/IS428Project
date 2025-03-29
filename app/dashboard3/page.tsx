"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardNavbar } from "../../components/ui/navbar"; // Import the navbar component
import ContinentPopulationBar from "@/components/continent-population-bar";
import HospitalBedsBar from "@/components/hospitals-bed-bar";
import BedsVsDeathsScatter from "@/components/beds-deaths-scatter";
import HygieneVsCasesScatter from "@/components/hygiene-cases-scatter";

export default function Dashboard3() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <DashboardNavbar />

      {/* Page Content */}
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <h1 className="text-3xl font-bold">
          Dashboard 3: Infrastructure & COVID Outcomes
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <ContinentPopulationBar />
          </div>
          <div className="bg-white p-4 rounded shadow">
            <HospitalBedsBar />
          </div>
        </div>

        {/* Row 2: Scatter Plots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <BedsVsDeathsScatter />
          </div>
          <div className="bg-white p-4 rounded shadow">
            <HygieneVsCasesScatter />
          </div>
        </div>

        {/*Legend */}
        <div className="bg-white p-4 rounded shadow w-full md:max-w-lg">
          <h2 className="text-lg font-semibold mb-2">Continent Color Legend</h2>
          <ul className="grid grid-cols-2 gap-x-4 text-sm">
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#3b82f6]"></span>Africa</li>
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#f97316]"></span>Asia</li>
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#22c55e]"></span>Europe</li>
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#ef4444]"></span>North America</li>
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#a16207]"></span>South America</li>
            <li><span className="inline-block w-4 h-4 mr-2 bg-[#8b5cf6]"></span>Oceania</li>
          </ul>
        </div>

      </main>
    </div>
  );
}