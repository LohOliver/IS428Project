"use client";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeSeriesData {
  date: Date;
  value: number;
}

interface CovidMetricData {
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
  cutoffDate?: string; // Added optional prop for customizing cutoff date
  onCountryClick?: (countryName: string, date: string) => void;
}

const METRIC_CONFIGS = {
  cases: {
    label: "COVID Cases",
    color: "crimson",
    endpoint: "max_cases_per_month",
    lighterColor: "rgba(220, 20, 60, 0.1)",
  },
  deaths: {
    label: "COVID Deaths",
    color: "#d11141",
    endpoint: "max_deaths_per_month",
    lighterColor: "rgba(209, 17, 65, 0.1)",
  },
  vaccinations: {
    label: "Vaccinations",
    color: "#00b159",
    endpoint: "max_vaccinations_per_month",
    lighterColor: "rgba(0, 177, 89, 0.1)",
  },
  recovered: {
    label: "Recovered",
    color: "#00aedb",
    endpoint: "max_recovered_per_month",
    lighterColor: "rgba(0, 174, 219, 0.1)",
  },
};

export function TimeSeriesChart({
  className,
  country,
  countryName,
  timeSeriesData,
  apiUrl,
  selectedDate,
  onCountryClick,
  cutoffDate = "2023-01",
  ...props
}: TimeSeriesChartProps) {
  // State to store data
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [metricData, setMetricData] = useState<
    Record<MetricType, CovidMetricData[]>
  >({
    cases: [],
    deaths: [],
    vaccinations: [],
    recovered: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("cases");

  // Effect to process data when country or timeSeriesData changes
  useEffect(() => {
    if (!country || !timeSeriesData || !timeSeriesData[country]) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const parseDate = d3.timeParse("%Y-%m");

      // Process and filter the data to only include dates before the cutoff
      const processedData = Object.entries(timeSeriesData[country])
        .filter(([date]) => date < cutoffDate) // Filter dates before cutoff
        .map(([date, value]) => ({
          date: parseDate(date),
          value,
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
  }, [country, timeSeriesData, cutoffDate]);

  // Effect to fetch COVID metrics data
  useEffect(() => {
    if (!country) {
      return;
    }

    const fetchAllMetrics = async () => {
      setIsLoading(true);
      try {
        const metricsToFetch: MetricType[] = [
          "cases",
          "deaths",
          "vaccinations",
          "recovered",
        ];

        const results: Record<MetricType, CovidMetricData[]> = {
          cases: [],
          deaths: [],
          vaccinations: [],
          recovered: [],
        };

        // Fetch all metrics in parallel
        await Promise.all(
          metricsToFetch.map(async (metric) => {
            try {
              const endpoint = METRIC_CONFIGS[metric].endpoint;
              const response = await fetch(
                `http://localhost:5002/${endpoint}/${country}`
              );

              if (!response.ok) {
                console.warn(
                  `Failed to fetch ${metric} data: ${response.statusText}`
                );
                return;
              }

              const data = await response.json();
              const parseDate = d3.timeParse("%Y-%m");
              const processedData: CovidMetricData[] = [];

              // Process the nested object structure and filter by cutoff date
              Object.entries(data).forEach(([year, months]: [string, any]) => {
                Object.entries(months).forEach(
                  ([month, value]: [string, any]) => {
                    const dateStr = `${year}-${month.padStart(2, "0")}`;

                    // Only include dates before the cutoff
                    if (dateStr < cutoffDate) {
                      const date = parseDate(dateStr);
                      if (date) {
                        processedData.push({
                          date,
                          value: parseFloat(value) || 0,
                        });
                      }
                    }
                  }
                );
              });

              // Sort data by date
              processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
              results[metric] = processedData;
            } catch (err) {
              console.error(`Error fetching ${metric} data:`, err);
            }
          })
        );

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

  // Create ref for the chart container
  const chartRef = useRef<HTMLDivElement>(null);

  // D3 chart creation effect
  useEffect(() => {
    if (
      !chartRef.current ||
      data.length === 0 ||
      metricData[selectedMetric].length === 0
    )
      return;

    // Convert selectedDate to proper format for comparison
    let highlightDateObj: Date | null = null;
    if (selectedDate) {
      let formattedDate = "";
      // Handle both "MM/YYYY" and "YYYY-MM" formats
      if (selectedDate.includes("/")) {
        // Format like "04/2021"
        const [month, year] = selectedDate.split("/");
        formattedDate = `${year}-${month.padStart(2, "0")}`;
      } else if (selectedDate.includes("-")) {
        // Format is already like "2021-04"
        formattedDate = selectedDate;
      }

      console.log("Selected date input:", selectedDate);
      console.log("Formatted date for parsing:", formattedDate);

      highlightDateObj = d3.timeParse("%Y-%m")(formattedDate);
      console.log("Parsed date object:", highlightDateObj);
    }

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();
    const margin = { top: 60, right: 80, bottom: 100, left: 50 };
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

    // Get the current metric config
    const metricConfig = METRIC_CONFIGS[selectedMetric];
    const currentMetricData = metricData[selectedMetric];

    // Create a unified dataset with dates that exist in both datasets
    // First, create maps of both datasets by date string for easy lookup
    const dateFormat = d3.timeFormat("%Y-%m");
    const dataByDate = new Map(data.map((d) => [dateFormat(d.date), d]));
    const metricByDate = new Map(
      currentMetricData.map((d) => [dateFormat(d.date), d])
    );

    // Get common dates that exist in both datasets
    const commonDateKeys = [...dataByDate.keys()].filter((dateKey) =>
      metricByDate.has(dateKey)
    );

    // Filter both datasets to only include common dates
    const filteredData = commonDateKeys
      .map((dateKey) => dataByDate.get(dateKey))
      .filter(Boolean) as TimeSeriesData[];
    const filteredMetricData = commonDateKeys
      .map((dateKey) => metricByDate.get(dateKey))
      .filter(Boolean) as CovidMetricData[];

    // Define time domain based on common dates
    const timeDomain = d3.extent(
      commonDateKeys
        .map(
          (dateKey) =>
            dataByDate.get(dateKey)?.date || metricByDate.get(dateKey)?.date
        )
        .filter(Boolean)
    ) as [Date, Date];

    // Define scales for the primary axis (left)
    const xScale = d3.scaleTime().domain(timeDomain).range([0, width]);
    const yScaleLeft = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    // Define scales for the secondary axis (right) for COVID metrics
    const yScaleRight = d3
      .scaleLinear()
      .domain([0, d3.max(filteredMetricData, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    // Define axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat(d3.timeFormat("%Y-%m"));
    const yAxisLeft = d3.axisLeft(yScaleLeft);
    const yAxisRight = d3.axisRight(yScaleRight).tickFormat((d) => {
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
    svg
      .append("g")
      .call(yAxisLeft)
      .append("text")
      .attr("fill", "steelblue")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text("Stringency Value");

    // Draw right y-axis
    svg
      .append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(yAxisRight)
      .append("text")
      .attr("fill", metricConfig.color)
      .attr("transform", "rotate(-90)")
      .attr("y", 40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .text(metricConfig.label);

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`${countryName || country} - ${metricConfig.label} vs Stringency`);

    // Define area generator for metric data background
    const metricArea = d3
      .area<CovidMetricData>()
      .x((d) => xScale(d.date))
      .y0(height)
      .y1((d) => yScaleRight(d.value))
      .curve(d3.curveMonotoneX);

    // Define line generator for primary data
    const line = d3
      .line<TimeSeriesData>()
      .x((d) => xScale(d.date))
      .y((d) => yScaleLeft(d.value))
      .curve(d3.curveMonotoneX);

    // Define line generator for metric data
    const metricLine = d3
      .line<CovidMetricData>()
      .defined(
        (d) =>
          d.value !== null &&
          !isNaN(d.value) &&
          yScaleRight(d.value) >= 0 &&
          yScaleRight(d.value) <= height
      )
      .x((d) => xScale(d.date))
      .y((d) => yScaleRight(d.value))
      .curve(d3.curveMonotoneX);

    // Draw primary line
    svg
      .append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw metric line
    if (filteredMetricData.length > 0) {
      svg
        .append("path")
        .datum(filteredMetricData)
        .attr("fill", "none")
        .attr("stroke", metricConfig.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3") // Make it dashed to distinguish
        .attr("d", metricLine);

      // Draw metric data points
      svg
        .selectAll(".metric-dot")
        .data(
          filteredMetricData.filter(
            (d) =>
              d.value !== null &&
              !isNaN(d.value) &&
              yScaleRight(d.value) >= 0 &&
              yScaleRight(d.value) <= height
          )
        )
        .enter()
        .append("circle")
        .attr("class", "metric-dot")
        .attr("cx", (d) => xScale(d.date))
        .attr("cy", (d) => yScaleRight(d.value))
        .attr("r", (d) => {
          // Make highlighted points larger
          if (
            highlightDateObj &&
            d3.timeFormat("%Y-%m")(d.date) ===
              d3.timeFormat("%Y-%m")(highlightDateObj)
          ) {
            return 6;
          }
          return 3;
        })

        .attr("stroke-width", (d) => {
          // Check if this point matches the selected date
          if (
            highlightDateObj &&
            d3.timeFormat("%Y-%m")(d.date) ===
              d3.timeFormat("%Y-%m")(highlightDateObj)
          ) {
            return 3; // Thicker stroke for better visibility
          }
          return 0;
        });
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
      .attr("r", (d) => {
        // Make highlighted points larger
        if (
          highlightDateObj &&
          d3.timeFormat("%Y-%m")(d.date) ===
            d3.timeFormat("%Y-%m")(highlightDateObj)
        ) {
          return 8;
        }
        return 4;
      })
      .attr("fill", "black") // Make dot color stand out
      .attr("stroke", "white")
      .attr("stroke-width", (d) => {
        if (
          highlightDateObj &&
          d3.timeFormat("%Y-%m")(d.date) ===
            d3.timeFormat("%Y-%m")(highlightDateObj)
        ) {
          return 3;
        }
        return 2;
      })
      .attr("cursor", "pointer") // Add pointer cursor to indicate clickable
      .on("mouseover", function (event, d) {
        tooltip
          .style("opacity", 1)
          .html(
            `Date: ${d3.timeFormat("%B %Y")(
              d.date
            )}<br>Stringency: ${d.value.toFixed(1)}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");

        // Highlight on hover
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", (d) => {
            if (
              highlightDateObj &&
              d3.timeFormat("%Y-%m")(d.date) ===
                d3.timeFormat("%Y-%m")(highlightDateObj)
            ) {
              return 10; // Make highlighted points even larger on hover
            }
            return 6;
          });
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);

        // Return to normal size
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", (d) => {
            if (
              highlightDateObj &&
              d3.timeFormat("%Y-%m")(d.date) ===
                d3.timeFormat("%Y-%m")(highlightDateObj)
            ) {
              return 8;
            }
            return 4;
          });
      })
      // Add click handler
      .on("click", function (event, d) {
        if (onCountryClick) {
          // Format the date as YYYY-MM for consistency
          const clickedDate = d3.timeFormat("%Y-%m")(d.date);
          console.log(
            `Dot clicked for ${countryName || country} on ${clickedDate}`
          );

          // Call the onCountryClick function
          onCountryClick(countryName || country || "", clickedDate);

          // Visual feedback on click
          d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", "#FFD700")
            .transition()
            .duration(150)
            .attr("fill", "black");
        }
      });

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 70}, -50)`);

    // Primary data legend
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "steelblue");

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text("Stringency Index")
      .style("font-size", "12px");

    // Metric data legend
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 25)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", metricConfig.color);

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 37)
      .text(metricConfig.label)
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
      .on("mouseover", function (event, d) {
        tooltip
          .style("opacity", 1)
          .html(
            `Date: ${d3.timeFormat("%B %Y")(
              d.date
            )}<br>Stringency: ${d.value.toFixed(1)}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    // Tooltip for metric data
    svg
    .selectAll(".metric-dot")
    .data(
      filteredMetricData.filter(
        (d) =>
          d.value !== null &&
          !isNaN(d.value) &&
          yScaleRight(d.value) >= 0 &&
          yScaleRight(d.value) <= height
      )
    )
    .enter()
    .append("circle")
    .attr("class", "metric-dot")
    .attr("cx", (d) => xScale(d.date))
    .attr("cy", (d) => yScaleRight(d.value))
    .attr("r", (d) => {
      if (
        highlightDateObj &&
        d3.timeFormat("%Y-%m")(d.date) ===
          d3.timeFormat("%Y-%m")(highlightDateObj)
      ) {
        return 6;
      }
      return 3;
    })
    .attr("fill", metricConfig.color)
    .attr("stroke", "white")
    .attr("stroke-width", (d) => {
      if (
        highlightDateObj &&
        d3.timeFormat("%Y-%m")(d.date) ===
          d3.timeFormat("%Y-%m")(highlightDateObj)
      ) {
        return 3;
      }
      return 1;
    })
    .attr("cursor", "pointer") // Add pointer cursor
    .on("mouseover", function (event, d) {
      let tooltipContent = `Date: ${d3.timeFormat("%B %Y")(d.date)}<br>${
        metricConfig.label
      }: ${d.value.toLocaleString()}`;
      tooltip
        .style("opacity", 1)
        .html(tooltipContent)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
      
      // Highlight on hover
      d3.select(this)
        .transition()
        .duration(100)
        .attr("r", (d) => {
          if (
            highlightDateObj &&
            d3.timeFormat("%Y-%m")(d.date) ===
              d3.timeFormat("%Y-%m")(highlightDateObj)
          ) {
            return 8;
          }
          return 5;
        });
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      
      // Return to normal size
      d3.select(this)
        .transition()
        .duration(100)
        .attr("r", (d) => {
          if (
            highlightDateObj &&
            d3.timeFormat("%Y-%m")(d.date) ===
              d3.timeFormat("%Y-%m")(highlightDateObj)
          ) {
            return 6;
          }
          return 3;
        });
    })
    // Add click handler
    .on("click", function (event, d) {
      if (onCountryClick) {
        // Format the date as YYYY-MM for consistency
        const clickedDate = d3.timeFormat("%Y-%m")(d.date);
        console.log(`Metric dot clicked for ${countryName || country} on ${clickedDate}`);
        
        // Call the onCountryClick function
        onCountryClick(countryName || country || "", clickedDate);
        
        // Visual feedback
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", "#FFD700")
          .transition()
          .duration(150)
          .attr("fill", metricConfig.color);
      }
    });

    // If there's a selected date, only highlight the matching data points with yellow circles
    if (highlightDateObj) {
      const highlightedDate = d3.timeFormat("%Y-%m")(highlightDateObj);
      console.log("Formatted highlighted date:", highlightedDate);

      // Find matching data points to highlight
      const matchingPoints = filteredData.filter(
        (d) => d3.timeFormat("%Y-%m")(d.date) === highlightedDate
      );

      const matchingMetricPoints = filteredMetricData.filter(
        (d) => d3.timeFormat("%Y-%m")(d.date) === highlightedDate
      );

      console.log("Matching primary data points:", matchingPoints.length);
      console.log("Matching metric data points:", matchingMetricPoints.length);

      // If there are matching data points, highlight them with circles
      if (matchingPoints.length > 0) {
        // Add a yellow highlight circle around the selected primary data point
        svg
          .append("circle")
          .attr("cx", xScale(matchingPoints[0].date))
          .attr("cy", yScaleLeft(matchingPoints[0].value))
          .attr("r", 12)
          .attr("fill", "none")
          .attr("stroke", "#FFD700")
          .attr("stroke-width", 3)
          .attr("opacity", 0.8);

        // If there's a matching metric point, highlight it too
        if (matchingMetricPoints.length > 0) {
          svg
            .append("circle")
            .attr("cx", xScale(matchingMetricPoints[0].date))
            .attr("cy", yScaleRight(matchingMetricPoints[0].value))
            .attr("r", 10)
            .attr("fill", "none")
            .attr("stroke", "#FFD700")
            .attr("stroke-width", 3)
            .attr("opacity", 0.8);
        }
      }
    }
  }, [data, metricData, selectedMetric, countryName, country, selectedDate]);

  // Add a notice about the date filtering

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

          <div ref={chartRef} className="w-full h-96 bg-white p-4"></div>
        </div>
      )}
    </div>
  );
}

export default TimeSeriesChart;
