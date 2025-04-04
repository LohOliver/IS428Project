"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorldMap } from "../../components/dashboard2/stringency-map";
import { TimeSeriesChart } from "../../components/dashboard2/time-series-chart";
import { PolicyBreakdown } from "../../components/dashboard2/policy-breakdown";
import { DashboardNavbar } from "../../components/navbar"; // Import the navbar component

// Define the interfaces for our data types
interface StringencyData {
  [date: string]: number;
}

interface CountryStringencyData {
  [country: string]: StringencyData;
}

export default function Dashboard2() {
  const [selectedCountry, setSelectedCountry] =
    React.useState<string>("United States");
  const [selectedDate, setSelectedDate] = React.useState<string>("02/2024");
  const [timeRange, setTimeRange] = React.useState("2020-2023");
  const [stringencyData, setStringencyData] =
    React.useState<CountryStringencyData>({});
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch data from the JSON file
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // In a real application, you would fetch this from an API or load from a file
        const response = await fetch(
          "http://localhost:5002/avg_stringency_by_month"
        );
        const data: CountryStringencyData = await response.json();
        // Filter dates based on time range
        const [startYear, endYear] = timeRange.includes("-")
          ? timeRange.split("-").map(Number)
          : [Number(timeRange), Number(timeRange)];

        // Filter and prepare dates
        const filteredDates: string[] = [];
        const filteredData: CountryStringencyData = {};
        Object.entries(data).forEach(([country, countryData]) => {
          const filteredCountryData: StringencyData = {};
          Object.entries(countryData).forEach(([date, value]) => {
            const [year] = date.split("-").map(Number);
            if (year >= startYear && year <= endYear) {
              filteredCountryData[date] = value;
              if (!filteredDates.includes(date)) {
                filteredDates.push(date);
              }
            }
          });
          if (Object.keys(filteredCountryData).length > 0) {
            filteredData[country] = filteredCountryData;
          }
        });

        // Sort dates
        filteredDates.sort();
        setStringencyData(filteredData);
        setAvailableDates(filteredDates);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please try again later.");
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const handleCountryClick = (countryName: string, date: string) => {
    console.log(countryName);
    console.log(date);
    setSelectedCountry(countryName);
    setSelectedDate(date);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Replace the existing header with the DashboardNavbar */}
      <DashboardNavbar />

      <main className="flex-1 space-y-4 p-4 md:p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Global Policy Stringency Dashboard
          </h1>
          <p className="text-muted-foreground">
            Analysis of COVID-19 policy measures across countries
          </p>
        </header>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-7">
            <CardHeader />
            <CardContent>
              {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto" />
                    <p>Loading map data...</p>
                  </div>
                </div>
              ) : (
                <WorldMap
                  className="w-full h-[500px]"
                  onCountryClick={handleCountryClick}
                  timeSeriesData={stringencyData}
                  availableDates={availableDates}
                  maxStringency={100}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 h-auto">
          <Card>
            <CardHeader>
              <CardTitle>Stringency Evolution: {selectedCountry}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selected date: {selectedDate}
              </p>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                country={selectedCountry}
                countryName={selectedCountry}
                timeSeriesData={stringencyData}
                selectedDate={selectedDate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Policy Measures Breakdown: {selectedCountry}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PolicyBreakdown
                country={selectedCountry}
                countryName={selectedCountry}
                selectedDate={selectedDate}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
