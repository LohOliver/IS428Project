"use client";
import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardNavbar } from "../../components/ui/navbar"; // Import the navbar component
import ContinentPopulationBar from "@/components/dashboard3/continent-population-bar";
import HospitalBedsBar from "@/components/dashboard3/hospitals-bed-bar";
import BedsVsDeathsScatter from "@/components/dashboard3/beds-deaths-scatter";
import HygieneVsCasesScatter from "@/components/dashboard3/hygiene-cases-scatter";
import RegionFilter from "@/components/dashboard3/RegionFilter";

export default function Dashboard3() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const regions = ["Asia", "Europe", "Africa", "North America", "South America", "Oceania"];
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <DashboardNavbar />

      {/* Filter */}
      <RegionFilter regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
      {/* Page Content */}
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <h1 className="text-3xl font-bold">
          Dashboard 3: Infrastructure & COVID Outcomes
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <ContinentPopulationBar selectedRegion={selectedRegion}/>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <HospitalBedsBar selectedRegion={selectedRegion}/>
          </div>
        </div>

        {/* Row 2: Scatter Plots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <BedsVsDeathsScatter selectedRegion={selectedRegion}/>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <HygieneVsCasesScatter selectedRegion={selectedRegion}/>
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