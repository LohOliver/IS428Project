"use client";
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define consistent types
interface TimeSeriesData {
  date: Date;
  value: number;
}

type MetricType = "cases" | "deaths" | "vaccinations" | "recovered";

interface TimeSeriesChartProps {
  className?: string;
  country?: string;
  countryName?: string;
  timeSeriesData?: Record<string, Record<string, number>>;
  apiUrl?: string;
  selectedDate?: string;
  cutoffDate?: string;
}

// Constants
const METRIC_CONFIGS = {
  cases: {
    label: "COVID Cases",
    color: "#FF0000",
    endpoint: "max_cases_per_month",
    lighterColor: "rgba(255, 0, 0, 0.1)",
  },
  deaths: {
    label: "COVID Deaths",
    color: "#FF0000",
    endpoint: "max_deaths_per_month",
    lighterColor: "rgba(255, 0, 0, 0.1)",
  },
  vaccinations: {
    label: "Vaccinations",
    color: "#FF0000",
    endpoint: "max_vaccinations_per_month",
    lighterColor: "rgba(255, 0, 0, 0.1)",
  },
  recovered: {
    label: "Recovered",
    color: "#FF0000",
    endpoint: "max_recovered_per_month",
    lighterColor: "rgba(255, 0, 0, 0.1)",
  },
};

// Default chart dimensions
const DEFAULT_MARGIN = { top: 60, right: 80, bottom: 100, left: 50 };
const DEFAULT_HEIGHT = 400;

export function TimeSeriesChart({
  className,
  country,
  countryName,
  timeSeriesData,
  selectedDate,
  cutoffDate = "2023-01",
  ...props
}: TimeSeriesChartProps) {
  // State
  const [stringencyData, setStringencyData] = useState<TimeSeriesData[]>([]);
  const [metricData, setMetricData] = useState<Record<MetricType, TimeSeriesData[]>>({
    cases: [],
    deaths: [],
    vaccinations: [],
    recovered: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("cases");

  // Refs
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Parse date helper function
  const parseDate = d3.timeParse("%Y-%m");
  const formatDate = d3.timeFormat("%Y-%m");

  // Process stringency data
  useEffect(() => {
    if (!country || !timeSeriesData || !timeSeriesData[country]) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const processedData = Object.entries(timeSeriesData[country])
        .filter(([date]) => date < cutoffDate)
        .map(([date, value]) => ({
          date: parseDate(date),
          value,
        }))
        .filter((d) => d.date !== null) as TimeSeriesData[];

      // Sort data by date
      processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setStringencyData(processedData);
      setError(null);
    } catch (err) {
      console.error("Error processing time series data:", err);
      setError("Failed to process time series data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [country, timeSeriesData, cutoffDate]);

  // Fetch COVID metrics data
  useEffect(() => {
    if (!country) return;

    const fetchMetricData = async (metric: MetricType) => {
      try {
        const endpoint = METRIC_CONFIGS[metric].endpoint;
        const response = await fetch(
          `https://is428project.onrender.com/${endpoint}/${country}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${metric} data: ${response.statusText}`);
        }
        
        const data = await response.json();
        return processMetricData(data);
      } catch (error) {
        console.error(`Error fetching ${metric} data:`, error);
        return [];
      }
    };

    const processMetricData = (data: Record<string, Record<string, number>>) => {
      const processed: TimeSeriesData[] = [];
      
      Object.entries(data).forEach(([year, months]) => {
        Object.entries(months).forEach(([month, value]) => {
          const dateStr = `${year}-${month.padStart(2, "0")}`;
          
          if (dateStr < cutoffDate) {
            const date = parseDate(dateStr);
            if (date) {
              processed.push({
                date,
                value: parseFloat(String(value)) || 0,
              });
            }
          }
        });
      });
      
      return processed.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const fetchAllMetrics = async () => {
      setIsLoading(true);
      
      try {
        const metricsToFetch: MetricType[] = ["cases", "deaths", "vaccinations", "recovered"];
        const results = {} as Record<MetricType, TimeSeriesData[]>;
        
        // Execute all fetch operations in parallel
        const allResults = await Promise.all(
          metricsToFetch.map(async (metric) => {
            const data = await fetchMetricData(metric);
            return { metric, data };
          })
        );
        
        // Assign data to respective metrics
        allResults.forEach(({ metric, data }) => {
          results[metric] = data;
        });
        
        setMetricData(results);
        setError(null);
      } catch (err) {
        console.error("Error fetching metrics data:", err);
        setError("Failed to fetch COVID metrics. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMetrics();
  }, [country, cutoffDate]);

  // Cleanup function for tooltip
  useEffect(() => {
    return () => {
      // Remove any existing tooltip when component unmounts
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  // Render the D3 chart
  useEffect(() => {
    if (
      !chartRef.current ||
      stringencyData.length === 0 ||
      metricData[selectedMetric].length === 0
    ) {
      return;
    }

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();
    
    // Remove any existing tooltip
    if (tooltipRef.current) {
      tooltipRef.current.remove();
    }
    
    // Create tooltip div attached to body
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "chart-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("z-index", "999")
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
      .style("min-width", "200px")
      .style("font-size", "12px")
      .style("transition", "opacity 0.2s");
      
    // Save tooltip reference
    tooltipRef.current = tooltip.node();

    // Parse selected date for highlighting if provided
    let highlightDateObj: Date | null = null;
    if (selectedDate) {
      const formattedDate = selectedDate.includes("/")
        ? `${selectedDate.split("/")[1]}-${selectedDate.split("/")[0].padStart(2, "0")}`
        : selectedDate;
      
      highlightDateObj = parseDate(formattedDate);
    }

    // Chart dimensions
    const width = chartRef.current.clientWidth - DEFAULT_MARGIN.left - DEFAULT_MARGIN.right;
    const height = DEFAULT_HEIGHT - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom;

    // Create SVG container
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + DEFAULT_MARGIN.left + DEFAULT_MARGIN.right)
      .attr("height", height + DEFAULT_MARGIN.top + DEFAULT_MARGIN.bottom)
      .append("g")
      .attr("transform", `translate(${DEFAULT_MARGIN.left},${DEFAULT_MARGIN.top})`);

    // Current metric config
    const metricConfig = METRIC_CONFIGS[selectedMetric];
    const currentMetricData = metricData[selectedMetric];

    // Create unified dataset with dates that exist in both datasets
    const dateFormat = d3.timeFormat("%Y-%m");
    const stringencyByDate = new Map(stringencyData.map((d) => [dateFormat(d.date), d]));
    const metricByDate = new Map(currentMetricData.map((d) => [dateFormat(d.date), d]));
    
    // Get common dates
    const commonDateKeys = [...stringencyByDate.keys()].filter((dateKey) => metricByDate.has(dateKey));
    
    // Filter both datasets to only include common dates
    const filteredStringencyData = commonDateKeys
      .map((dateKey) => stringencyByDate.get(dateKey))
      .filter(Boolean) as TimeSeriesData[];
      
    const filteredMetricData = commonDateKeys
      .map((dateKey) => metricByDate.get(dateKey))
      .filter(Boolean) as TimeSeriesData[];

    // Time domain based on common dates
    const timeDomain = d3.extent(
      commonDateKeys
        .map((dateKey) => {
          const date = stringencyByDate.get(dateKey)?.date || metricByDate.get(dateKey)?.date;
          return date;
        })
        .filter((d): d is Date => Boolean(d))
    ) as [Date, Date];

    // Scales
    const xScale = d3.scaleTime().domain(timeDomain).range([0, width]);
    
    const yScaleLeft = d3
      .scaleLinear()
      .domain([0, d3.max(filteredStringencyData, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);
      
    const yScaleRight = d3
      .scaleLinear()
      .domain([0, d3.max(filteredMetricData, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat(d3.timeFormat("%Y-%m") as any);
      
    const yAxisLeft = d3.axisLeft(yScaleLeft);
    
    const yAxisRight = d3.axisRight(yScaleRight).tickFormat((d) => {
      const value = +d;
      return value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000
        ? `${(value / 1000).toFixed(1)}K`
        : d.toString();
    });

    // Draw axes
    // X-axis
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)");

    // Left Y-axis (Stringency)
    svg
      .append("g")
      .attr("class", "y-axis-left")
      .call(yAxisLeft)
      .append("text")
      .attr("fill", "steelblue")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text("Stringency Value");

    // Right Y-axis (Metric)
    svg
      .append("g")
      .attr("class", "y-axis-right")
      .attr("transform", `translate(${width}, 0)`)
      .call(yAxisRight)
      .append("text")
      .attr("fill", metricConfig.color)
      .attr("transform", "rotate(-90)")
      .attr("y", 60)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text(metricConfig.label);

    // Chart title
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`${countryName || country} - ${metricConfig.label} vs Stringency`);

    // Line generators
    const stringencyLine = d3
      .line<TimeSeriesData>()
      .x((d) => xScale(d.date))
      .y((d) => yScaleLeft(d.value))
      .curve(d3.curveMonotoneX);

    const metricLine = d3
      .line<TimeSeriesData>()
      .defined((d) => d.value !== null && !isNaN(d.value))
      .x((d) => xScale(d.date))
      .y((d) => yScaleRight(d.value))
      .curve(d3.curveMonotoneX);

    // Draw lines
    // Stringency line
    svg
      .append("path")
      .attr("class", "stringency-line")
      .datum(filteredStringencyData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", stringencyLine);

    // Metric line
    svg
      .append("path")
      .attr("class", "metric-line")
      .datum(filteredMetricData)
      .attr("fill", "none")
      .attr("stroke", metricConfig.color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3")
      .attr("d", metricLine);

    // Draw data points
    // Stringency data points
    const stringencyPoints = svg
      .selectAll(".stringency-point")
      .data(filteredStringencyData)
      .enter()
      .append("circle")
      .attr("class", "stringency-point")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScaleLeft(d.value))
      .attr("r", (d) => {
        return highlightDateObj && formatDate(d.date) === formatDate(highlightDateObj) ? 8 : 4;
      })
      .attr("fill", "steelblue")
      .attr("stroke", "white")
      .attr("stroke-width", (d) => {
        return highlightDateObj && formatDate(d.date) === formatDate(highlightDateObj) ? 3 : 0;
      });

    // Metric data points
    const metricPoints = svg
      .selectAll(".metric-point")
      .data(filteredMetricData.filter(d => d.value !== null && !isNaN(d.value)))
      .enter()
      .append("circle")
      .attr("class", "metric-point")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScaleRight(d.value))
      .attr("r", (d) => {
        return highlightDateObj && formatDate(d.date) === formatDate(highlightDateObj) ? 6 : 3;
      })
      .attr("fill", metricConfig.color)
      .attr("stroke", "white")
      .attr("stroke-width", (d) => {
        return highlightDateObj && formatDate(d.date) === formatDate(highlightDateObj) ? 3 : 0;
      });

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "chart-legend")
      .attr("transform", `translate(${width-40 }, -55)`);

    // Stringency legend item
    legend
      .append("rect")
      .attr("x", 10)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "steelblue");

    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 12)
      .text("Stringency Index")
      .style("font-size", "12px");

    // Metric legend item
    legend
      .append("rect")
      .attr("x", 10)
      .attr("y", 25)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", metricConfig.color);

    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 37)
      .text(metricConfig.label)
      .style("font-size", "12px");

    // Add event listeners for tooltips
    // Helper function to find the corresponding value for a date
    const findValueByDate = (date: Date, dataset: TimeSeriesData[]): number | null => {
      const formattedDate = formatDate(date);
      const matching = dataset.find(d => formatDate(d.date) === formattedDate);
      return matching ? matching.value : null;
    };
    
    // Create enhanced tooltip HTML with both metrics
    const createTooltipHTML = (date: Date, stringencyValue: number | null, metricValue: number | null) => {
      return `
        <div style="font-weight: bold; margin-bottom: 5px;">${d3.timeFormat("%B %Y")(date)}</div>
        <div style="color: steelblue; margin-bottom: 3px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: steelblue; margin-right: 5px; border-radius: 50%;"></span>
          Stringency: ${stringencyValue !== null ? stringencyValue.toFixed(1) : 'N/A'}
        </div>
        <div style="color: ${metricConfig.color};">
          <span style="display: inline-block; width: 12px; height: 12px; background: ${metricConfig.color}; margin-right: 5px; border-radius: 50%;"></span>
          ${metricConfig.label}: ${metricValue !== null ? metricValue.toLocaleString() : 'N/A'}
        </div>
      `;
    };

    // Stringency data tooltip
    stringencyPoints
      .on("mouseover", function(event, d) {
        // Find the corresponding metric value for this date
        const metricValue = findValueByDate(d.date, filteredMetricData);
        
        tooltip
          .style("opacity", 1)
          .html(createTooltipHTML(d.date, d.value, metricValue))
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      });

    // Metric data tooltip
    metricPoints
      .on("mouseover", function(event, d) {
        // Find the corresponding stringency value for this date
        const stringencyValue = findValueByDate(d.date, filteredStringencyData);
        
        tooltip
          .style("opacity", 1)
          .html(createTooltipHTML(d.date, stringencyValue, d.value))
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      });

    // Highlight selected date
    if (highlightDateObj) {
      const highlightedDate = formatDate(highlightDateObj);
      
      // Find matching data points
      const matchingStringencyPoint = filteredStringencyData.find(
        d => formatDate(d.date) === highlightedDate
      );
      
      const matchingMetricPoint = filteredMetricData.find(
        d => formatDate(d.date) === highlightedDate
      );
      
      // Highlight stringency point if found
      if (matchingStringencyPoint) {
        svg
          .append("circle")
          .attr("class", "highlight-circle")
          .attr("cx", xScale(matchingStringencyPoint.date))
          .attr("cy", yScaleLeft(matchingStringencyPoint.value))
          .attr("r", 12)
          .attr("fill", "none")
          .attr("stroke", "#FFD700")
          .attr("stroke-width", 3)
          .attr("opacity", 0.8);
      }
      
      // Highlight metric point if found
      if (matchingMetricPoint) {
        svg
          .append("circle")
          .attr("class", "highlight-circle")
          .attr("cx", xScale(matchingMetricPoint.date))
          .attr("cy", yScaleRight(matchingMetricPoint.value))
          .attr("r", 10)
          .attr("fill", "none")
          .attr("stroke", "#FFD700")
          .attr("stroke-width", 3)
          .attr("opacity", 0.8);
      }
    }
  }, [stringencyData, metricData, selectedMetric, country, countryName, selectedDate]);

  return (
    <div className={cn("w-full h-full", className)} {...props}>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      ) : error ? (
        <div className="text-center p-4 bg-red-50 text-red-500 rounded-md">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Tabs
              defaultValue="cases"
              onValueChange={(value) => setSelectedMetric(value as MetricType)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="cases">Cases</TabsTrigger>
                <TabsTrigger value="deaths">Deaths</TabsTrigger>
                <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
                <TabsTrigger value="recovered">Recovered</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div ref={chartRef} className="w-full h-96 bg-white p-4 relative"></div>
        </div>
      )}
    </div>
  );
}

export default TimeSeriesChart;