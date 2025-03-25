"use client"
import * as React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Define types for raw policy data from API
interface RawPolicyData {
  country: string;
  region: string;
  category: string;
  date_implemented: string | null;
}

// Define types for processed policy counts
interface PolicyCount {
  name: string;
  count: number;
  policies?: RawPolicyData[]; // Store the actual policies for tooltip details
}

interface PolicyBreakdownProps {
  className?: string;
  country?: string;
  countryName?: string;
  selectedDate?: string;
  apiUrl?: string;
  onDateChange?: (date: string) => void;
}

// Format date for display
const formatDate = (dateStr: string): string => {
  // Handle YYYY-MM format by appending '-01' to make it a valid date
  const fullDateStr = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
  const date = new Date(fullDateStr);
  return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long' });
};

// Generate array of year-month strings from date range
const generateMonthArray = (startDate: string, endDate: string): string[] => {
  const result: string[] = [];
  
  // Ensure we have YYYY-MM-DD format for Date object creation
  const startFullDate = startDate.length === 7 ? `${startDate}-01` : startDate;
  const endFullDate = endDate.length === 7 ? `${endDate}-01` : endDate;
  
  const start = new Date(startFullDate);
  const end = new Date(endFullDate);
  
  let current = new Date(start);
  current.setDate(1); // Start at beginning of month
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    result.push(`${year}-${month}`);
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return result;
};

export function PolicyBreakdown({ 
  className, 
  country,
  countryName,
  selectedDate,
  apiUrl = "http://127.0.0.1:5001/full_measures_data",
  onDateChange,
  ...props
}: PolicyBreakdownProps) {
  // State to store raw data from API
  const [rawData, setRawData] = useState<RawPolicyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(apiUrl);
       
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        // No need to transform the data as it's already in the expected format
        setRawData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching policy data:", err);
        setError("Failed to load policy data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [apiUrl]);

  // Find min and max dates in the data
  const dateRange = useMemo(() => {
    const filteredData = rawData.filter(item => 
      item.country === country && item.date_implemented !== null
    );
    
    if (filteredData.length === 0) return { min: "2020-01", max: "2021-06" };
    
    const dates = filteredData
      .map(item => item.date_implemented)
      .filter((date): date is string => date !== null);
    
    return {
      min: dates.reduce((min, date) => date < min ? date : min, dates[0]),
      max: dates.reduce((max, date) => date > max ? date : max, dates[0])
    };
  }, [rawData, country]);
  
  // Generate array of available months
  const availableMonths = useMemo(() => {
    return generateMonthArray(dateRange.min, dateRange.max);
  }, [dateRange]);
  
  // Internal state for date selection if not controlled externally
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>("");
  
  // Initialize the selected date once we have data
  useEffect(() => {
    if (availableMonths.length > 0 && !internalSelectedDate) {
      setInternalSelectedDate(availableMonths[2] || availableMonths[0] || "2020-03");
    }
  }, [availableMonths, internalSelectedDate]);
  
  // Use either the controlled date or the internal state
  const effectiveDate = selectedDate || internalSelectedDate;
  
  // Handle date change
  const handleDateChange = (date: string) => {
    if (onDateChange) {
      onDateChange(date);
    } else {
      setInternalSelectedDate(date);
    }
  };
  
  // Process raw data to get policy counts for the selected date
  const processedData = useMemo(() => {
    if (!effectiveDate) return [];
    
    // Only include policies for the selected country
    const countryData = rawData.filter(item => 
      item.country === country && item.date_implemented !== null
    );
    
    // Only include policies implemented before or during the selected month
    // The date format is now YYYY-MM, so we can compare directly
    const activePolicies = countryData.filter(item => 
      item.date_implemented !== null && item.date_implemented <= effectiveDate
    );
    
    // Count policies by category
    const categoryCounts: Record<string, PolicyCount> = {};
    
    activePolicies.forEach(policy => {
      if (!categoryCounts[policy.category]) {
        categoryCounts[policy.category] = {
          name: policy.category,
          count: 0,
          policies: []
        };
      }
      
      categoryCounts[policy.category].count++;
      categoryCounts[policy.category].policies?.push(policy);
    });
    
    // Convert to array and ensure we have all standard categories even if count is 0
    // Update these based on your actual API data categories
    const standardCategories = [
      "Public health measures", 
      "Social and physical distancing measures", 
      "Movement restrictions",
      "Special populations",
      "Gatherings, businesses and services",
      "Resource allocation",
      "International travel measures"
    ];
    
    const result: PolicyCount[] = standardCategories.map(category => {
      return categoryCounts[category] || { name: category, count: 0, policies: [] };
    });
    
    return result;
  }, [rawData, country, effectiveDate]);
  
  // Calculate total active policies
  const totalActivePolicies = processedData.reduce((sum, item) => sum + item.count, 0);
  
  // Create refs for the chart container and tooltip
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // D3 chart creation effect
  useEffect(() => {
    if (!chartRef.current || processedData.length === 0) return;
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 30, left: 50, bottom: 100 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
      .domain(processedData.map(d => d.name))
      .range([0, width])
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.count) || 0])
      .nice()
      .range([height, 0]);
    
    // Create axes
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    const yAxis = svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toString()));
    
    // Add y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Number of Active Policies");
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-width)
        .tickFormat(() => "")
      )
      .selectAll("line")
      .style("stroke", "#e2e8f0")
      .style("stroke-dasharray", "3,3");
    
    // Create tooltip div if it doesn't exist
    const tooltip = d3.select(tooltipRef.current);
    
    // Define single bar color
    const barColor = "#3b82f6"; // Medium blue
    const barHighlightColor = "#1d4ed8"; // Darker blue for hover state
    
    // Add bars
    svg.selectAll(".bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.name) || 0)
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count))
      .attr("fill", barColor)
      .on("mouseover", function(event, d) {
        // Show tooltip
        tooltip.style("opacity", 1);
        
        // Format tooltip content
        let tooltipContent = `
          <div class="font-bold">${d.name}</div>
          <div>${d.count} active ${d.count === 1 ? "policy" : "policies"}</div>
        `;
        
        if (d.policies && d.policies.length > 0) {
          tooltipContent += `
            <div class="text-sm text-gray-600 mt-1">
              <div class="font-medium">Implementation dates:</div>
              <ul class="list-disc pl-4 mt-1">
          `;
          
          d.policies.forEach(p => {
            if (p.date_implemented) {
              tooltipContent += `
                <li>${formatDate(p.date_implemented)}${p.region !== "National" ? ` (${p.region})` : ''}</li>
              `;
            }
          });
          
          tooltipContent += `
              </ul>
            </div>
          `;
        }
        
        tooltip.html(tooltipContent)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
          
        // Highlight bar
        d3.select(this)
          .attr("fill", barHighlightColor);
      })
      .on("mouseout", function(event, d) {
        // Hide tooltip
        tooltip.style("opacity", 0);
        
        // Reset bar color
        d3.select(this)
          .attr("fill", barColor);
      });
    
    // Handle resize
    const handleResize = () => {
      if (!chartRef.current) return;
      
      // Update chart dimensions
      const newWidth = chartRef.current.clientWidth - margin.left - margin.right;
      
      // Update scales
      x.range([0, newWidth]);
      
      // Update SVG dimensions
      d3.select(chartRef.current).select("svg")
        .attr("width", newWidth + margin.left + margin.right);
      
      // Update x-axis
      svg.select(".x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
      
      // Update bars
      svg.selectAll(".bar")
        .attr("x", d => x(d.name) || 0)
        .attr("width", x.bandwidth());
      
      // Update grid
      svg.select(".grid")
        .call(d3.axisLeft(y)
          .ticks(5)
          .tickSize(-newWidth)
          .tickFormat(() => "")
        );
    };
    
    // Add resize listener
    window.addEventListener("resize", handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [processedData]);
  
  // Extract only valid HTML attributes to spread to the div
  const { style, id, role, tabIndex, ...otherProps } = props;
  const validHtmlProps = { style, id, role, tabIndex };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>Loading Policy Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-red-500">
            <div className="text-center">
              <div className="text-xl mb-2">⚠️</div>
              <div>{error}</div>
              <button 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Select value={effectiveDate} onValueChange={handleDateChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(date => (
                <SelectItem key={date} value={date}>
                  {formatDate(`${date}-01`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm font-medium">
            Total active policies: {totalActivePolicies}
          </div>
        </div>
        <div className="text-xl font-bold mt-2">
          {countryName || country}
        </div>
        <div className="text-sm text-muted-foreground">
          Showing number of active policies by type as of {formatDate(`${effectiveDate}`)}
        </div>
      </CardHeader>
      <CardContent>
        {/* D3.js chart container */}
        <div ref={chartRef} className="w-full h-96"></div>
        
        {/* Tooltip */}
        <div 
          ref={tooltipRef} 
          className="absolute bg-white p-2 border rounded shadow-md max-w-xs opacity-0 pointer-events-none z-50"
          style={{ 
            position: "absolute", 
            opacity: 0,
            pointerEvents: "none"
          }}
        ></div>
      </CardContent>
    </Card>
  );
}