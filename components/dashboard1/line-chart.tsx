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
  
  // Track which continents are selected for display
  const [selectedContinents, setSelectedContinents] = useState<Record<string, boolean>>({});
  // Store all available continents
  const [availableContinents, setAvailableContinents] = useState<string[]>([]);
  // Active continent for hover highlighting
  const [activeContinentHover, setActiveContinentHover] = useState<string | null>(null);

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
        
        // Extract and set available continents
        const continents = Object.keys(jsonData);
        setAvailableContinents(continents);
        
        // Initialize all continents as selected
        const initialSelectedState: Record<string, boolean> = {};
        continents.forEach(continent => {
          initialSelectedState[continent] = true;
        });
        setSelectedContinents(initialSelectedState);
        
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
  }, [data, selectedContinents, activeContinentHover]); // Redraw when selections change
  
  useEffect(() => {
    const handleResize = () => {
      if (data) {
        createChart(); // Recreate chart on resize
      }
    };
  
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, selectedContinents]);

  const toggleContinent = (continent: string) => {
    setSelectedContinents(prev => ({
      ...prev,
      [continent]: !prev[continent]
    }));
  };

  const selectAll = () => {
    const newSelectedState: Record<string, boolean> = {};
    availableContinents.forEach(continent => {
      newSelectedState[continent] = true;
    });
    setSelectedContinents(newSelectedState);
  };

  const selectNone = () => {
    const newSelectedState: Record<string, boolean> = {};
    availableContinents.forEach(continent => {
      newSelectedState[continent] = false;
    });
    setSelectedContinents(newSelectedState);
  };

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
      // Only include selected continents
      if (selectedContinents[continent]) {
        Object.entries(monthlyData).forEach(([dateStr, value]) => {
          const [year, month] = dateStr.split("-").map(Number);
          const date = new Date(year, month - 1);

          processedData.push({
            date,
            continent,
            value,
          });
        });
      }
    });

    // If no data to display, show message
    if (processedData.length === 0) {
      d3.select(chartRef.current)
        .append("div")
        .attr("class", "text-center text-gray-500 p-4")
        .text("No continents selected. Please select at least one continent to display data.");
      return;
    }

    // Sort data by date
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Set up dimensions
    const margin = { top: 40, right: 100, bottom: 80, left: 100 };
    const width = (chartRef.current?.clientWidth || 600) - margin.left - margin.right;
    const height = chartRef.current?.clientHeight || 400;

    // Create SVG
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get unique continents and dates from filtered data
    const activeContinents = Array.from(
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
      .domain(availableContinents)
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
      .style("font-size", "16px")
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
      .style("font-size", "16px");

    // Add axis labels with increased font size
    svg
      .append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Date");

    svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 20)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(yAxisLabels[dataType]);

    // Draw lines for each selected continent
    activeContinents.forEach((continent) => {
      const continentData = processedData.filter(
        (d) => d.continent === continent
      );

      // Only draw if there's data
      if (continentData.length > 0) {
        // Sort by date to ensure line is drawn correctly
        continentData.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Determine opacity based on hover state
        const opacity = activeContinentHover 
          ? (activeContinentHover === continent ? 1.0 : 0.2)
          : 1.0;

        svg
          .append("path")
          .datum(continentData)
          .attr("fill", "none")
          .attr("stroke", colorScale(continent))
          .attr("stroke-width", activeContinentHover === continent ? 3 : 2)
          .attr("opacity", opacity)
          .attr("d", lineGenerator)
          .attr("class", `line-${continent}`);
      }
    });

    // Add tooltip
    const tooltip = d3.select(chartRef.current)
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("pointer-events", "none");

    // Add overlay for mouse tracking
    const mouseG = svg.append("g")
      .attr("class", "mouse-over-effects");

    mouseG.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", function(event) {
        const mouse = d3.pointer(event);
        const dateOnX = xScale.invert(mouse[0]);
        
        // Find closest date in the data
        const bisectDate = d3.bisector((d: ProcessedDataItem) => d.date).left;
        
        // Show vertical line at mouse position
        verticalLine
          .attr("x1", mouse[0])
          .attr("x2", mouse[0])
          .style("visibility", "visible");
        
        // Update tooltip for each active continent
        const tooltipContent = activeContinents.map(continent => {
          const continentData = processedData.filter(d => d.continent === continent);
          if (continentData.length === 0) return null;
          
          const index = bisectDate(continentData, dateOnX, 1);
          const a = continentData[index - 1];
          const b = continentData[index] || a;
          const d = dateOnX.getTime() - a.date.getTime() > b.date.getTime() - dateOnX.getTime() ? b : a;
          
          return `<div style="color:${colorScale(continent)}">
            <strong>${continent}</strong>: ${d3.format(",")(d.value)}
          </div>`;
        }).filter(Boolean).join("");
        
        if (tooltipContent) {
          const formatDate = d3.timeFormat("%b %Y");
          tooltip
            .style("visibility", "visible")
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 30}px`)
            .html(`<div><strong>${formatDate(dateOnX)}</strong></div>${tooltipContent}`);
        }
      })
      .on("mouseout", function() {
        verticalLine.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
      });
    
    // Add vertical line for tooltip
    const verticalLine = mouseG.append("line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("visibility", "hidden");

    // Add interactive legend with hover effect
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + 20}, 0)`);

    // Only show available continents in legend
    availableContinents.forEach((continent, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 25})`)
        .style("cursor", "pointer")
        .style("opacity", selectedContinents[continent] ? 1.0 : 0.5) // Dim unselected
        .on("mouseover", function() {
          setActiveContinentHover(continent);
        })
        .on("mouseout", function() {
          setActiveContinentHover(null);
        });

      legendRow
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale(continent));

      legendRow
        .append("text")
        .attr("x", 20)
        .attr("y", 10)
        .attr("text-anchor", "start")
        .style("font-size", "13px")
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
          {/* Controls to toggle continents */}
          <div className="mb-4 p-2 border border-gray-200 rounded bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Filter Continents</h3>
              <div className="space-x-2">
                <button 
                  onClick={selectAll}
                  className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Select All
                </button>
                <button 
                  onClick={selectNone}
                  className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableContinents.map(continent => (
                <label 
                  key={continent} 
                  className="flex items-center cursor-pointer border rounded px-2 py-1 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedContinents[continent] || false}
                    onChange={() => toggleContinent(continent)}
                    className="mr-1"
                  />
                  <span 
                    className="text-sm"
                    style={{ 
                      color: d3.scaleOrdinal<string>()
                        .domain(availableContinents)
                        .range(d3.schemeCategory10)(continent) 
                    }}
                  >
                    {continent}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div ref={chartRef} className="w-full h-full min-h-[400px]" />
        </div>
      )}
    </div>
  );
};

export default ContinentCasesChart;