"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatisticsPanel from "./statistics-panel";
import { fetchCovidData } from "@/lib/api";
import type { CovidData } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { DashboardNavbar } from "../components/ui/navbar";
import CovidWorldMap, { CovidDataType } from "../components/overview-map";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import ContinentCasesChart from "../components/line-chart";

// Define types
interface RegionalData {
  name: string;
  cases?: number;
  deaths?: number;
  recovered?: number;
  vaccinated?: number;
}

// Regional comparison component
function RegionalComparison({
  data,
  dataKey,
  onRegionSelect,
  selectedRegion,
}: {
  data: RegionalData[];
  dataKey: CovidDataType;
  onRegionSelect: (region: string) => void;
  selectedRegion: string | null;
}) {
  // Sort data by the selected metric in descending order
  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const valueA = a[dataKey] || 0;
        const valueB = b[dataKey] || 0;
        return valueB - valueA;
      })
      .slice(0, 10); // Limit to top 10
  }, [data, dataKey]);

  // Format numbers for display
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Map color based on data key
  const getColor = () => {
    switch (dataKey) {
      case "cases":
        return "hsl(var(--chart-1))";
      case "deaths":
        return "hsl(var(--chart-2))";
      case "recovered":
        return "hsl(var(--chart-3))";
      case "vaccinated":
        return "hsl(var(--chart-4))";
      default:
        return "hsl(var(--chart-1))";
    }
  };

  return (
    <div className="w-full h-full">
      <ChartContainer
        config={{
          [dataKey]: {
            label: dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
            color: getColor(),
          },
        }}
        className="h-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const clickedRegion = data.activePayload[0].payload.name;
                onRegionSelect(clickedRegion);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={formatNumber}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey={dataKey}
              fill={getColor()}
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              strokeWidth={selectedRegion ? 2 : 0}
              stroke={(entry) =>
                entry.name === selectedRegion ? "#000" : undefined
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [covidData, setCovidData] = useState<CovidData | null>(null);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [dataType, setDataType] = useState<CovidDataType>("cases");

  // Fetch dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch main dashboard data
        const data = await fetchCovidData();
        setCovidData(data);

        // Fetch top 10 country data for charts
        const [casesRes, deathsRes, recoveredRes, vaccinatedRes] =
          await Promise.all([
            fetch("http://localhost:5002/top10_countries_by_cases"),
            fetch("http://localhost:5002/top10_countries_by_deaths"),
            fetch("http://localhost:5002/top10_countries_by_recovered"),
            fetch("http://localhost:5002/top10_countries_by_vaccination"),
          ]);

        const [casesData, deathsData, recoveredData, vaccinatedData] =
          await Promise.all([
            casesRes.json(),
            deathsRes.json(),
            recoveredRes.json(),
            vaccinatedRes.json(),
          ]);

        // Create a combined dataset with all countries
        const allCountries = new Set([
          ...Object.keys(casesData),
          ...Object.keys(deathsData),
          ...Object.keys(recoveredData),
          ...Object.keys(vaccinatedData),
        ]);

        // Combine all data into a single dataset
        const combinedData = Array.from(allCountries).map((country) => ({
          name: country,
          cases: casesData[country] || 0,
          deaths: deathsData[country] || 0,
          recovered: recoveredData[country] || 0,
          vaccinated: vaccinatedData[country] || 0,
        }));

        setRegionalData(combinedData);
      } catch (err) {
        setError("Failed to load COVID-19 data. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region === selectedRegion ? null : region);
  };

  const handleDataTypeChange = (dataType: string) => {
    setDataType(dataType as CovidDataType);
    // Reset selections when changing data type
    setSelectedRegion(null);
    setSelectedCountry(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading COVID-19 data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Add the navbar */}
      <DashboardNavbar />

      <div className="p-6 flex-1 mx-auto w-11/12">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            COVID-19 Global Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Interactive visualization of global COVID-19 statistics
          </p>
        </header>

        <div className="grid gap-6">
          <div>
            <StatisticsPanel />
          </div>

          {/* World Map Card - Now at the top */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>COVID-19 Global Map</CardTitle>
              <CardDescription>
                Worldwide visualization of COVID-19 statistics
              </CardDescription>

              {/* Tabs for data type selection */}
              <Tabs
                value={dataType}
                defaultValue="cases"
                className="w-full"
                onValueChange={handleDataTypeChange}
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="cases">Cases</TabsTrigger>
                  <TabsTrigger value="deaths">Deaths</TabsTrigger>
                  <TabsTrigger value="recovered">Recovered</TabsTrigger>
                  <TabsTrigger value="vaccinated">Vaccinated</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              {selectedRegion && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-medium">Selected: {selectedRegion}</p>
                  <div className="mt-1 grid grid-cols-4 gap-2 text-sm">
                    <p>
                      Cases:{" "}
                      {regionalData
                        .find((item) => item.name === selectedRegion)
                        ?.cases?.toLocaleString() || "N/A"}
                    </p>
                    <p>
                      Deaths:{" "}
                      {regionalData
                        .find((item) => item.name === selectedRegion)
                        ?.deaths?.toLocaleString() || "N/A"}
                    </p>
                    <p>
                      Recovered:{" "}
                      {regionalData
                        .find((item) => item.name === selectedRegion)
                        ?.recovered?.toLocaleString() || "N/A"}
                    </p>
                    <p>
                      Vaccinated:{" "}
                      {regionalData
                        .find((item) => item.name === selectedRegion)
                        ?.vaccinated?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Full width map */}
              <div className="h-[500px] w-full">
                <CovidWorldMap dataType={dataType} />
              </div>
            </CardContent>
          </Card>

          {/* Charts section - Bar chart and Line chart side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Top 10 Countries</CardTitle>
                <CardDescription>
                  Countries with highest {dataType} counts
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="overflow-hidden w-2/3 ">
                  <RegionalComparison
                    data={regionalData}
                    dataKey={dataType}
                    onRegionSelect={handleRegionSelect}
                    selectedRegion={selectedRegion}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Continent Trends</CardTitle>
                <CardDescription>
                  COVID-19 {dataType} statistics by continent over time
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="h-[400px]">
                  <ContinentCasesChart dataType={dataType} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
