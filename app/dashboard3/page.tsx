"use client";
import * as React from "react";
import { useState } from "react";
import { DashboardNavbar } from "../../components/ui/navbar"; // Import the navbar component
// import ContinentPopulationBar from "@/components/dashboard3/continent-population-bar";
import HospitalBedsBar from "@/components/dashboard3/hospitals-bed-bar";
import BedsVsDeathsScatter from "@/components/dashboard3/beds-deaths-scatter";
import HygieneVsCasesScatter from "@/components/dashboard3/hygiene-cases-scatter";

export default function Dashboard3() {
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const regions = ["Asia", "Europe", "Africa", "North America", "South America", "Oceania"];
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />

      {/* Page Content */}
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <h1 className="text-3xl font-bold">
          Dashboard 3: Infrastructure & COVID Outcomes
        </h1>

        {/* Region Filter */}
        <div className="mb-4">
          <label htmlFor="region-select" className="mr-2 font-medium">
            Filter by Region:
          </label>
          <select
            id="region-select"
            className="border rounded px-2 py-1"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="All">All</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/*Bar Chart */}
          <div className="flex-1 bg-white p-4 rounded shadow">
            <HospitalBedsBar />
          </div>

          {/* Legend */}
          <div className="w-full md:w-[220px] bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Continent Color Legend</h2>
            <ul className="grid grid-cols-1 gap-y-1 text-sm">
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#3b82f6]"></span>Africa</li>
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#f97316]"></span>Asia</li>
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#22c55e]"></span>Europe</li>
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#ef4444]"></span>North America</li>
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#a16207]"></span>South America</li>
              <li><span className="inline-block w-4 h-4 mr-2 bg-[#8b5cf6]"></span>Oceania</li>
            </ul>
          </div>
        </div>

        {/* Scatter Plots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow w-full">
            <BedsVsDeathsScatter selectedRegion={selectedRegion} />
          </div>
          <div className="bg-white p-4 rounded shadow w-full">
            <HygieneVsCasesScatter selectedRegion={selectedRegion} />
          </div>
        </div>

      </main>
    </div>
  );
}