import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

// Define the valid data types as a type
type DataType = 'cases' | 'deaths' | 'recovered' | 'vaccinated';

interface ContinentCasesChartProps {
  dataType?: DataType;
}

const ContinentCasesChart: React.FC<ContinentCasesChartProps> = ({ dataType = "cases" }) => {
  type DataResponse = Record<string, Record<string, number>>;
  
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  // Define endpoints based on data type
  const endpoints: Record<DataType, string> = {
    cases: "https://is428project.onrender.com/continents_new_cases_per_month",
    deaths: "https://is428project.onrender.com/continents_new_deaths_per_month",
    recovered: "https://is428project.onrender.com/continents_estimated_recoveries_per_month",
    vaccinated: "https://is428project.onrender.com/continents_new_vaccinations_per_month",
  };

  // Y-axis labels based on data type
  const yAxisLabels: Record<DataType, string> = {
    cases: "New COVID-19 Cases",
    deaths: "New COVID-19 Deaths",
    recovered: "Estimated Recoveries",
    vaccinated: "New Vaccinations",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(endpoints[dataType]);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    };

    fetchData();
  }, [dataType]); // Re-fetch when dataType changes

  useEffect(() => {
    if (data && chartRef.current) {
      createChart();
    }
  }, [data]);
  
  useEffect(() => {
    const handleResize = () => {
      if (data) {
        createChart(); // Recreate chart on resize
      }
    };
  
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

  const createChart = () => {
    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    // Define interface for processed data items
    interface ProcessedDataItem {
      date: Date;
      continent: string;
      value: number;
    }

    // Process data
    const processedData: ProcessedDataItem[] = [];
    Object.entries(data as Record<string, Record<string, number>>).forEach(([continent, monthlyData]) => {
      Object.entries(monthlyData).forEach(([dateStr, value]) => {
        const [year, month] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1);

        processedData.push({
          date,
          continent,
          value,
        });
      });
    });

    // Sort data by date
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Set up dimensions
    const margin = { top: 40, right: 100, bottom: 80, left: 100 };
    // Add null check for chartRef.current
    const width = (chartRef.current?.clientWidth || 600) - margin.left - margin.right;
    // const height = 500 - margin.top - margin.bottom; // Increased from 320 to 500
    const height = chartRef.current?.clientHeight || 400;

    // Create SVG
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      // .attr("width", "100%")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get unique continents and dates
    const continents = Array.from(
      new Set(processedData.map((d) => d.continent))
    );
    const dates = Array.from(new Set(processedData.map((d) => d.date))).sort(
      (a, b) => a.getTime() - b.getTime()
    );

    // Create scales with proper type handling
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(processedData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, (d) => d.value) || 0])
      .range([height, 0])
      .nice();

    // Create color scale
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(continents)
      .range(d3.schemeCategory10);

    // Create line generator with proper typing
    const lineGenerator = d3
      .line<ProcessedDataItem>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add X axis with proper type handling
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(d3.timeMonth.every(3))
          .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date))
      )
      .selectAll("text")
      .style("text-anchor", "end")
      .style("font-size", "16px")  // Increased font size for X axis
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Add Y axis with formatted ticks (K for thousands, M for millions)
    svg.append("g")
      .call(
        d3.axisLeft(yScale).tickFormat((d) => {
          const value = d as number;
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
          return value.toString();
        })
      )
      .selectAll("text")
      .style("font-size", "16px");  // Increased font size for Y axis

    // Add axis labels with increased font size
    svg
      .append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .style("font-size", "16px")  // Increased font size for axis label
      .style("font-weight", "bold")  // Make it bold for better visibility
      .text("Date");

    svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 20)
      .style("font-size", "16px")  // Increased font size for axis label
      .style("font-weight", "bold")  // Make it bold for better visibility
      .text(yAxisLabels[dataType]);

    // Draw lines for each continent
    continents.forEach((continent) => {
      const continentData = processedData.filter(
        (d) => d.continent === continent
      );

      // Only draw if there's data
      if (continentData.length > 0) {
        // Sort by date to ensure line is drawn correctly
        continentData.sort((a, b) => a.date.getTime() - b.date.getTime());

        svg
          .append("path")
          .datum(continentData)
          .attr("fill", "none")
          .attr("stroke", colorScale(continent))
          .attr("stroke-width", 2)
          .attr("d", lineGenerator);
      }
    });

    // Add legend with increased text size
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 100}, 0)`);

    continents.forEach((continent, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 25})`);  // Increased spacing between items

      legendRow
        .append("rect")
        .attr("width", 12)  // Slightly larger rectangle
        .attr("height", 12)
        .attr("fill", colorScale(continent));

      legendRow
        .append("text")
        .attr("x", 20)  // Increased spacing after the color box
        .attr("y", 10)
        .attr("text-anchor", "start")
        .style("font-size", "13px")  // Increased font size for legend
        .text(continent);
    });
  };

  return (
    <div className="w-full h-full">
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="w-full h-full">
          {/* <div ref={chartRef} className="w-full h-full min-h-96" /> */}
          <div ref={chartRef} className="w-full h-full min-h-[400px]" />
        </div>
      )}
    </div>
  );
};

export default ContinentCasesChart;