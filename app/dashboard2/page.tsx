"use client";

import * as React from "react";
import { Globe, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorldMap } from "../../components/world-map";
import { TimeSeriesChart } from "../../components/time-series-chart";
import { PolicyBreakdown } from "../../components/policy-breakdown";

// Define the interfaces for our data types
interface StringencyData {
  country: string;
  code: string;
  value: number;
  date?: string;
}

interface TimeSeriesData {
  [dateKey: string]: StringencyData[];
}

export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = React.useState<string>("USA");
  const [selectedCountryName, setSelectedCountryName] =
    React.useState<string>("United States");
  const [timeRange, setTimeRange] = React.useState("2020-2023");

  // Sample time series data - in a real application, you would fetch this from an API
  const [timeSeriesData, setTimeSeriesData] = React.useState<TimeSeriesData>(
    {}
  );
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch or generate data when the component mounts or time range changes
  React.useEffect(() => {
    // Simulate data fetching with a timeout
    setIsLoading(true);

    // Generate sample data based on the selected time range
    const generateData = () => {
      const data: TimeSeriesData = {};
      const dates: string[] = [];

      // Parse the time range
      const [startYear, endYear] = timeRange.includes("-")
        ? timeRange.split("-").map(Number)
        : [Number(timeRange), Number(timeRange)];

      // Generate monthly data for the selected time range
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 1; month <= 12; month++) {
          // Skip future months for the current year
          if (year === 2023 && month > 12) continue;

          const dateKey = `${year}-${month.toString().padStart(2, "0")}-01`;
          dates.push(dateKey);

          // Generate data for various countries
          data[dateKey] = [
            {
              country: "United States",
              code: "USA",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "United Kingdom",
              code: "GBR",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "China",
              code: "CHN",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "India",
              code: "IND",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "Brazil",
              code: "BRA",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "Russia",
              code: "RUS",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "Germany",
              code: "DEU",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "France",
              code: "FRA",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "Italy",
              code: "ITA",
              value: Math.floor(20 + Math.random() * 60),
            },
            {
              country: "Canada",
              code: "CAN",
              value: Math.floor(20 + Math.random() * 60),
            },
            // Add more countries as needed
          ];
        }
      }

      return { data, dates: dates.sort() };
    };

    // Simulate network delay with setTimeout
    setTimeout(() => {
      const { data, dates } = generateData();
      setTimeSeriesData(data);
      setAvailableDates(dates);
      setIsLoading(false);
      console.log(`Generated data for ${dates.length} dates`);
    }, 500);
  }, [timeRange]);

  const handleCountryClick = (countryName: string) => {
    setSelectedCountryName(countryName);

    // Set the country code based on the country name
    // In a real app, you would have a more robust mapping
    const countryMap: { [key: string]: string } = {
      "United States": "USA",
      "United Kingdom": "GBR",
      China: "CHN",
      India: "IND",
      Brazil: "BRA",
      Russia: "RUS",
      Germany: "DEU",
      France: "FRA",
      Italy: "ITA",
      Canada: "CAN",
    };

    const countryCode = countryMap[countryName] || selectedCountry;
    setSelectedCountry(countryCode);
    console.log(`Selected country: ${countryName} (${countryCode})`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-2 font-semibold">
            <Globe className="h-5 w-5" />
            <span>Global Policy Stringency Dashboard</span>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
            <p className="text-sm text-muted-foreground">
              Track and analyze global policy responses and restrictions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCountryName && (
              <div className="mr-4 text-sm font-medium">
                Selected Country:{" "}
                <span className="font-bold">{selectedCountryName}</span>
              </div>
            )}
            <Select
              defaultValue={timeRange}
              onValueChange={(value) => setTimeRange(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2020-2023">2020-2023</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-7">
            <CardHeader></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div>
                    <p>Loading map data...</p>
                  </div>
                </div>
              ) : (
                <WorldMap
                  className="aspect-[6/2] w-full"
                  onCountryClick={handleCountryClick}
                  timeSeriesData={timeSeriesData}
                  availableDates={availableDates}
                  maxStringency={100}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stringency Evolution: {selectedCountryName}</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                className="h-[400px] w-full"
                country={selectedCountry}
                countryName={selectedCountryName}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Policy Measures Breakdown: {selectedCountryName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PolicyBreakdown
                className="h-[400px]"
                country={selectedCountryName}
                countryName={selectedCountryName}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
