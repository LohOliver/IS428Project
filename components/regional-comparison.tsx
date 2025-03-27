"use client"
import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

interface RegionalData {
  name: string
  cases?: number
  deaths?: number
  recovered?: number
  vaccinated?: number
}

interface RegionalComparisonProps {
  data: RegionalData[]
  dataKey: "cases" | "deaths" | "recovered" | "vaccinated"
  onRegionSelect: (region: string) => void
  selectedRegion: string | null
}

function RegionalComparison({ data, dataKey, onRegionSelect, selectedRegion }: RegionalComparisonProps) {
  // Sort data by the selected metric in descending order and take top 10
  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const valueA = a[dataKey] || 0
        const valueB = b[dataKey] || 0
        return valueB - valueA
      })
      .slice(0, 10) // Take only top 10
  }, [data, dataKey])
  
  // Format numbers for display
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }
  
  // Map color based on data key
  const getColor = () => {
    switch (dataKey) {
      case "cases":
        return "hsl(var(--chart-1))"
      case "deaths":
        return "hsl(var(--chart-2))"
      case "recovered":
        return "hsl(var(--chart-3))"
      case "vaccinated":
        return "hsl(var(--chart-4))"
      default:
        return "hsl(var(--chart-1))"
    }
  }
  
  return (
    <div className="w-full pt-4">
      <ChartContainer
        config={{
          [dataKey]: {
            label: dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
            color: getColor(),
          },
        }}
        className="h-[400px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const clickedRegion = data.activePayload[0].payload.name
                onRegionSelect(clickedRegion)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatNumber} tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey={dataKey}
              fill={getColor()}
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              strokeWidth={selectedRegion ? 2 : 0}
              stroke={(entry) => entry.name === selectedRegion ? "#000" : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

export default function CovidDashboard() {
  const [currentTab, setCurrentTab] = useState<"cases" | "deaths" | "recovered" | "vaccinated">("cases")
  const [allData, setAllData] = useState<RegionalData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Define API endpoints for each data type
  const endpoints = {
    cases: 'http://localhost:5002/top10_countries_by_cases',
    deaths: 'http://localhost:5002/top10_countries_by_deaths',
    recovered: 'http://localhost:5002/top10_countries_by_recovered',
    vaccinated: 'http://localhost:5002/top10_countries_by_vaccination'
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // First try to fetch just the current tab data to show something quickly
        const initialResponse = await fetch(endpoints[currentTab])
        if (!initialResponse.ok) {
          throw new Error(`HTTP error! Status: ${initialResponse.status}`)
        }
        
        const initialData = await initialResponse.json()
        
        // Then fetch all other data types in the background
        const responses = await Promise.all([
          fetch(endpoints.cases),
          fetch(endpoints.deaths),
          fetch(endpoints.recovered),
          fetch(endpoints.vaccinated)
        ])
        
        // Check if any fetch failed
        if (responses.some(res => !res.ok)) {
          const failedResponse = responses.find(res => !res.ok)
          throw new Error(`HTTP error! Status: ${failedResponse?.status}`)
        }
        
        // Parse all responses
        const [casesData, deathsData, recoveredData, vaccinatedData] = await Promise.all(
          responses.map(res => res.json())
        )
        
        // Create a combined dataset with all countries from all endpoints
        const allCountries = new Set([
          ...Object.keys(casesData),
          ...Object.keys(deathsData),
          ...Object.keys(recoveredData),
          ...Object.keys(vaccinatedData)
        ])
        
        // Combine all data into a single dataset
        const combinedData = Array.from(allCountries).map(country => ({
          name: country,
          cases: casesData[country] || 0,
          deaths: deathsData[country] || 0,
          recovered: recoveredData[country] || 0,
          vaccinated: vaccinatedData[country] || 0
        }))
        
        setAllData(combinedData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [currentTab])
  
  // Filter data for the current tab
  const filteredData = useMemo(() => {
    if (allData.length === 0) return []
    
    // Sort by the current metric and take top 10
    return [...allData]
      .filter(item => item[currentTab] !== undefined && item[currentTab] > 0)
      .sort((a, b) => {
        const valueA = a[currentTab] || 0
        const valueB = b[currentTab] || 0
        return valueB - valueA
      })
  }, [allData, currentTab])
  
  const handleRegionSelect = (region: string) => {
    setSelectedRegion(prev => prev === region ? null : region)
  }
  
  const handleTabChange = (value: string) => {
    setCurrentTab(value as "cases" | "deaths" | "recovered" | "vaccinated")
    setSelectedRegion(null)  // Reset selection when changing tabs
  }
  
  const getTabTitle = () => {
    switch (currentTab) {
      case "cases": return "Cases"
      case "deaths": return "Deaths"
      case "recovered": return "Recovered"
      case "vaccinated": return "Vaccinated"
    }
  }
  
  if (loading && allData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading COVID-19 data...</p>
      </div>
    )
  }
  
  if (error && allData.length === 0) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
        Error loading data: {error}
      </div>
    )
  }
  
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Top 10 Countries by COVID-19 Statistics</h1>
      
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="deaths">Deaths</TabsTrigger>
          <TabsTrigger value="recovered">Recovered</TabsTrigger>
          <TabsTrigger value="vaccinated">Vaccinated</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Top 10 Countries by {getTabTitle()}</h2>
          
          {selectedRegion && (
            <div className="p-3 my-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-medium">Selected: {selectedRegion}</p>
              <p>{getTabTitle()}: {allData.find(item => item.name === selectedRegion)?.[currentTab]?.toLocaleString() || 'N/A'}</p>
              <div className="mt-1 text-sm">
                <p>Cases: {allData.find(item => item.name === selectedRegion)?.cases?.toLocaleString() || 'N/A'}</p>
                <p>Deaths: {allData.find(item => item.name === selectedRegion)?.deaths?.toLocaleString() || 'N/A'}</p>
                <p>Recovered: {allData.find(item => item.name === selectedRegion)?.recovered?.toLocaleString() || 'N/A'}</p>
                <p>Vaccinated: {allData.find(item => item.name === selectedRegion)?.vaccinated?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="flex justify-center items-center h-20 my-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <p>Updating chart...</p>
            </div>
          )}
          
          <RegionalComparison 
            data={filteredData}
            dataKey={currentTab}
            onRegionSelect={handleRegionSelect}
            selectedRegion={selectedRegion}
          />
        </div>
      </Tabs>
      
      <div className="text-sm text-gray-500 mt-4">
        Click on a bar to select a country for more details.
      </div>
    </div>
  )
}