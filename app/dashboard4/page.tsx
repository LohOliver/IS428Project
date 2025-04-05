"use client";
import * as React from "react";
import { useState } from "react";
import { DashboardNavbar } from "../../components/navbar"; // Import the navbar component
// import ContinentPopulationBar from "@/components/dashboard3/continent-population-bar";

export default function Dashboard3() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />

      {/* Page Content */}
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <h1 className="text-3xl font-bold">
          Dashboard 4: Infrastructure & COVID Outcomes
        </h1>
      </main>
    </div>
  );
}
