"use client";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeSeriesData {
  date: Date;
  value: number;
}

interface CovidCaseData {
  date: Date;
  cases: number;
}

interface TimeSeriesChartProps {
  className?: string;
  country?: string;
  countryName?: string;
  timeSeriesData?: Record<string, Record<string, number>>;
  apiUrl?: string;
}

export function TimeSeriesChart({
  className,
  country,
  countryName,
  timeSeriesData,
  apiUrl,
  ...props
}: TimeSeriesChartProps) {
  // State to store data
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [covidData, setCovidData] = useState<CovidCaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to process data when country or timeSeriesData changes
  useEffect(() => {
    if (!country || !timeSeriesData || !timeSeriesData[country]) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const parseDate = d3.timeParse("%Y-%m");
      
      const processedData = Object.entries(timeSeriesData[country])
        .map(([date, value]) => ({ 
          date: parseDate(date), 
          value 
        }))
        .filter((d) => d.date !== null) as TimeSeriesData[];
      
      // Sort data by date
      processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setData(processedData);
      setError(null);
    } catch (err) {
      console.error("Error processing time series data:", err);
      setError("Failed to process time series data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [country, timeSeriesData]);

  // Effect to fetch COVID case data
  useEffect(() => {
    if (!country) {
      return;
    }

    const fetchCovidData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5002/avg_cases_per_month/${country}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch COVID data: ${response.statusText}`);
        }
        
        const data = await response.json();
        const parseDate = d3.timeParse("%Y-%m");
        
        const processedData: CovidCaseData[] = [];
        
        // Process the nested object structure
        Object.entries(data).forEach(([year, months]: [string, any]) => {
          Object.entries(months).forEach(([month, cases]: [string, any]) => {
            const dateStr = `${year}-${month.padStart(2, '0')}`;
            const date = parseDate(dateStr);
            if (date) {
              processedData.push({
                date,
                cases: parseFloat(cases)
              });
            }
          });
        });
        
        // Sort data by date
        processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        setCovidData(processedData);
      } catch (err) {
        console.error("Error fetching COVID data:", err);
        setError("Failed to fetch COVID case data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCovidData();
  }, [country]);

  // Create ref for the chart container
  const chartRef = useRef<HTMLDivElement>(null);

  // D3 chart creation effect
  useEffect(() => {
    if (!chartRef.current || data.length === 0 || covidData.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 80, bottom: 100, left: 50 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create a unified dataset with dates that exist in both datasets
    // First, create maps of both datasets by date string for easy lookup
    const dateFormat = d3.timeFormat("%Y-%m");
    const dataByDate = new Map(data.map(d => [dateFormat(d.date), d]));
    const covidByDate = new Map(covidData.map(d => [dateFormat(d.date), d]));
    
    // Get common dates that exist in both datasets
    const commonDateKeys = [...dataByDate.keys()].filter(dateKey => covidByDate.has(dateKey));
    
    // Filter both datasets to only include common dates
    const filteredData = commonDateKeys.map(dateKey => dataByDate.get(dateKey)).filter(Boolean) as TimeSeriesData[];
    const filteredCovidData = commonDateKeys.map(dateKey => covidByDate.get(dateKey)).filter(Boolean) as CovidCaseData[];
    
    // Define time domain based on common dates
    const timeDomain = d3.extent(commonDateKeys.map(dateKey => 
      dataByDate.get(dateKey)?.date || covidByDate.get(dateKey)?.date
    ).filter(Boolean)) as [Date, Date];

    // Define scales for the primary axis (left)
    const xScale = d3
      .scaleTime()
      .domain(timeDomain)
      .range([0, width]);

    const yScaleLeft = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    // Define scales for the secondary axis (right) for COVID cases
    const yScaleRight = d3
      .scaleLinear()
      .domain([0, d3.max(filteredCovidData, (d) => d.cases) || 0])
      .nice()
      .range([height, 0]);

    // Define axes
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%Y-%m"));
    const yAxisLeft = d3.axisLeft(yScaleLeft);
    const yAxisRight = d3.axisRight(yScaleRight)
      .tickFormat(d => {
        // Format large numbers with K/M suffix
        return d >= 1000000
          ? `${(d / 1000000).toFixed(1)}M`
          : d >= 1000
          ? `${(d / 1000).toFixed(1)}K`
          : d.toString();
      });

    // Draw x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)");

    // Draw left y-axis
    svg.append("g")
      .call(yAxisLeft)
      .append("text")
      .attr("fill", "steelblue")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text("Value");

    // Draw right y-axis
    svg.append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(yAxisRight)
      .append("text")
      .attr("fill", "crimson")
      .attr("transform", "rotate(-90)")
      .attr("y", 40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text("Total COVID Cases");

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`${countryName || country} Data`);

    // Define area generator for COVID data background
    const covidArea = d3
      .area<CovidCaseData>()
      .x((d) => xScale(d.date))
      .y0(height)
      .y1((d) => yScaleRight(d.cases))
      .curve(d3.curveMonotoneX);

    // Add subtle area fill under COVID line
    if (filteredCovidData.length > 0) {
      svg
        .append("path")
        .datum(filteredCovidData)
        .attr("fill", "rgba(220, 20, 60, 0.1)") // Light crimson
        .attr("d", covidArea);
    }

    // Define line generator for primary data
    const line = d3
      .line<TimeSeriesData>()
      .x((d) => xScale(d.date))
      .y((d) => yScaleLeft(d.value))
      .curve(d3.curveMonotoneX);

    // Define line generator for COVID data
    const covidLine = d3
      .line<CovidCaseData>()
      .defined(d => d.cases !== null && !isNaN(d.cases) && yScaleRight(d.cases) >= 0 && yScaleRight(d.cases) <= height)
      .x((d) => xScale(d.date))
      .y((d) => yScaleRight(d.cases))
      .curve(d3.curveMonotoneX);

    // Draw primary line
    svg
      .append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw COVID cases line
    if (filteredCovidData.length > 0) {
      svg
        .append("path")
        .datum(filteredCovidData)
        .attr("fill", "none")
        .attr("stroke", "crimson")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3") // Make it dashed to distinguish
        .attr("d", covidLine);
      
      // Draw COVID data points
      svg
        .selectAll(".covid-dot")
        .data(filteredCovidData.filter(d => d.cases !== null && !isNaN(d.cases) && 
                               yScaleRight(d.cases) >= 0 && yScaleRight(d.cases) <= height))
        .enter()
        .append("circle")
        .attr("class", "covid-dot")
        .attr("cx", (d) => xScale(d.date))
        .attr("cy", (d) => yScaleRight(d.cases))
        .attr("r", 3)
        .attr("fill", "crimson");
    }

    // Draw primary data points
    svg
      .selectAll(".primary-dot")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("class", "primary-dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScaleLeft(d.value))
      .attr("r", 4)
      .attr("fill", "steelblue");
      
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 140}, -20)`);
    
    // Primary data legend
    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "steelblue");
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text("Primary Value")
      .style("font-size", "12px");
    
    // COVID data legend
    legend.append("rect")
      .attr("x", 0)
      .attr("y", 25)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "crimson");
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 37)
      .text("COVID Cases")
      .style("font-size", "12px");
      
    // Add tooltip
    const tooltip = d3
      .select(chartRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none");

    // Tooltip for primary data
    svg
      .selectAll(".primary-dot")
      .on("mouseover", function(event, d) {
        tooltip
          .style("opacity", 1)
          .html(`Date: ${d3.timeFormat("%B %Y")(d.date)}<br>Value: ${d.value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
      });
    
    // Tooltip for COVID data
    svg
      .selectAll(".covid-dot")
      .on("mouseover", function(event, d) {
        tooltip
          .style("opacity", 1)
          .html(`Date: ${d3.timeFormat("%B %Y")(d.date)}<br>COVID Cases: ${d.cases.toLocaleString()}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
      });
    
  }, [data, covidData]);

  return (
    <div className={cn("w-full", className)} {...props}>
      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div ref={chartRef} className="w-full h-96"></div>
      )}
    </div>
  );
}

export default TimeSeriesChart;