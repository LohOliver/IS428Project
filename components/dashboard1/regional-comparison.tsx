"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"
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
  // Removed onRegionSelect from props
  selectedRegion: string | null
}

function RegionalComparison({ data, dataKey, selectedRegion }: RegionalComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
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
        return "#7856ff" // hsl(var(--chart-1))
      case "deaths":
        return "#ec4899" // hsl(var(--chart-2))
      case "recovered":
        return "#10b981" // hsl(var(--chart-3))
      case "vaccinated":
        return "#0ea5e9" // hsl(var(--chart-4))
      default:
        return "#7856ff" // hsl(var(--chart-1))
    }
  }

  // Create and update the D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove()

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth
    const containerHeight = 400
    
    // Define margins
    const margin = { top: 20, right: 30, left: 100, bottom: 20 }
    const width = containerWidth - margin.left - margin.right
    const height = containerHeight - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Sort data by the selected metric in descending order and take top 10
    const sortedData = [...data]
      .sort((a, b) => {
        const valueA = a[dataKey] || 0
        const valueB = b[dataKey] || 0
        return valueB - valueA
      })
      .slice(0, 10)

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d[dataKey] || 0) as number])
      .range([0, width])
    
    const y = d3.scaleBand()
      .domain(sortedData.map(d => d.name))
      .range([0, height])
      .padding(0.1)

    // Create axes
    const xAxis = d3.axisBottom(x)
      .tickFormat(d => formatNumber(d as number))
      .ticks(5)
    
    const yAxis = d3.axisLeft(y)
      .tickSize(0)
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "16px")
    
    // Add Y axis
    svg.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", "16px")
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.3)
      .call(d3.axisBottom(x)
        .tickSize(height)
        .tickFormat(() => "")
        .ticks(5)
      )
      .selectAll("line")
      .attr("stroke-dasharray", "3,3")
    
    // Add bars - Removed click functionality
    const bars = svg.selectAll(".bar")
      .data(sortedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d.name) || 0)
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d[dataKey] || 0))
      .attr("fill", getColor())
      .attr("rx", 0)
      .attr("ry", 0)
      .attr("stroke", d => d.name === selectedRegion ? "#000" : "none")
      .attr("stroke-width", d => d.name === selectedRegion ? 2 : 0)
      // Removed the click event handler
    
    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("font-size", "12px")
    
    // Add tooltip events
    bars
      .on("mouseover", (event, d) => {
        tooltip
          .style("visibility", "visible")
          .html(`
            <div>
              <div><strong>${d.name}</strong></div>
              <div>${dataKey}: ${(d[dataKey] || 0).toLocaleString()}</div>
            </div>
          `)
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`)
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })

    // Clean up function
    return () => {
      d3.select(containerRef.current).select(".tooltip").remove()
    }
  }, [data, dataKey, selectedRegion]) // Removed onRegionSelect from dependencies

  return (
    <div className="w-full pt-4" ref={containerRef}>
      <div className="h-[400px] w-full">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
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
    cases: 'https://is428project.onrender.com/top10_countries_by_cases',
    deaths: 'https://is428project.onrender.com/top10_countries_by_deaths',
    recovered: 'https://is428project.onrender.com/top10_countries_by_recovered',
    vaccinated: 'https://is428project.onrender.com/top10_countries_by_vaccination'
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
  
  // Removed handleRegionSelect function since it's no longer needed
  
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
            selectedRegion={selectedRegion}
            // Removed onRegionSelect prop
          />
        </div>
      </Tabs>
      
      <div className="text-sm text-gray-500 mt-4">
        {/* Removed instruction about clicking bars */}
        Showing top 10 countries based on {getTabTitle().toLowerCase()}.
      </div>
    </div>
  )
}