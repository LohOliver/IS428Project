"use client";
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface StringencyData {
  [date: string]: number;
}

interface CountryStringencyData {
  [country: string]: StringencyData;
}

interface WorldMapProps {
  className?: string;
  onCountryClick: (countryName: string, date: string) => void;
  timeSeriesData: CountryStringencyData;
  availableDates: string[];
  maxStringency: number;
}

export function WorldMap({
  className,
  onCountryClick,
  timeSeriesData,
  availableDates,
  cutoffDate = "2023-01",
  maxStringency,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldGeoData, setWorldGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [selectedCountry, setSelectedCountry] = useState<string>("Singapore");
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const zoomRef = useRef<any>(null);
  const initialRenderRef = useRef(true);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Create a mapping from country names in our data to country names in the GeoJSON
  const countryNameMap: { [key: string]: string } = {
    "United States": "USA",
    "South Korea": "Korea, Republic of",
    "Côte d'Ivoire ": "Ivory Coast",
    Tanzania: "United Republic of Tanzania",
    "United Kingdom": "England",
    "Democratic Republic of Congo": "Democratic Republic of the Congo",
    Congo: "Republic of the Congo",
    "South Sudan": "S. Sudan",
    "Central African Republic": "Central African Rep.",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Bosnia and Herzegovina": "Bosnia and Herz.",
    "North Macedonia": "Macedonia",
    "Dominican Republic": "Dominican Rep.",
    "Equatorial Guinea": "Eq. Guinea",
    Singapore: "Singapore", // Explicitly add Singapore mapping
    // Add more mappings as needed
  };

  // Function to get data country name from GeoJSON country name
  const getDataCountryName = (geoJsonName: string): string => {
    // Check if we have a direct mapping for this country
    for (const [dataName, geoName] of Object.entries(countryNameMap)) {
      if (geoName === geoJsonName) {
        return dataName;
      }
    }
    // If no mapping exists, return the original name (assuming it might match)
    return geoJsonName;
  };

  // Function to get GeoJSON country name from data country name
  const getGeoJsonCountryName = (dataCountryName: string): string => {
    // Return the mapped name if it exists
    return countryNameMap[dataCountryName] || dataCountryName;
  };

  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        );
        if (!response.ok)
          throw new Error("Failed to fetch world geography data");
        setWorldGeoData(await response.json());
      } catch (error) {
        console.error("Error loading geo data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGeoData();
  }, []);

  // Initial call to onCountryClick with Singapore when component mounts
  useEffect(() => {
    if (availableDates.length > 0 && initialRenderRef.current) {
      onCountryClick("Singapore", availableDates[currentDateIndex]);
      initialRenderRef.current = false;
    }
  }, [availableDates, onCountryClick, currentDateIndex]);

  // Call onCountryClick when date changes and a country is selected
  useEffect(() => {
    if (
      selectedCountry &&
      availableDates[currentDateIndex] &&
      !initialRenderRef.current
    ) {
      onCountryClick(selectedCountry, availableDates[currentDateIndex]);
    }
  }, [currentDateIndex, selectedCountry, availableDates, onCountryClick]);

  // Function to zoom to a specific country
  const zoomToCountry = (countryName: string) => {
    if (!svgRef.current || !worldGeoData || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Find the country feature in the GeoJSON data
    const countryFeature = worldGeoData.features.find((f: any) => {
      return getDataCountryName(f.properties.name) === countryName;
    });

    if (countryFeature) {
      // Create a path generator for calculating bounds
      const projection = d3
        .geoNaturalEarth1()
        .fitSize([width, height], { type: "Sphere" })
        .translate([width / 2, height / 2]);
      const pathGenerator = d3.geoPath().projection(projection);

      // Calculate bounds of the country
      const bounds = pathGenerator.bounds(countryFeature);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;

      // Calculate scale and translate parameters for zooming
      // Using a smaller scale factor for very small countries
      const scale = 0.8 / Math.max(dx / width, dy / height);
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      // Apply the transformation with a smooth transition
      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(Math.min(8, scale)) // Cap the max zoom level
        );
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentDateIndex((prev) => (prev + 1) % availableDates.length);
      }, animationSpeed);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isPlaying, availableDates.length, animationSpeed]);

  useEffect(() => {
    if (!svgRef.current || !worldGeoData || availableDates.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Calculate scale to fit the entire world map at zoom level 1
    const projection = d3
      .geoNaturalEarth1()
      .fitSize([width, height], { type: "Sphere" }) // Fit to sphere ensures the full globe is visible
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Improved color scale with a more appealing blue gradient
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxStringency || 1])
      .clamp(true); // Prevent values outside the domain from producing unexpected colors

    const currentDate = availableDates[currentDateIndex];
    const currentData: { [country: string]: number } = Object.fromEntries(
      Object.entries(timeSeriesData).map(([country, data]) => [
        country,
        data[currentDate] || 0,
      ])
    );

    const tooltip = d3.select(tooltipRef.current);

    // Add a background rectangle for better aesthetics
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#f8fafc") // Light background color
      .attr("rx", 8) // Rounded corners
      .attr("ry", 8);

    // Create a group for the map content with a margin for better presentation
    const mapGroup = svg
      .append("g")
      .attr("class", "map-container")
      .attr("transform", "translate(0, 10)"); // Small top margin

    // Add outline of globe for better context
    mapGroup
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", pathGenerator)
      .attr("fill", "#f1f5f9")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 0.5);

    // Add a subtle drop shadow for depth
    mapGroup
      .append("filter")
      .attr("id", "drop-shadow")
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 1)
      .attr("stdDeviation", 2)
      .attr("flood-opacity", 0.2);

    // Add a legend for the color scale
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = width - legendWidth - 20;
    const legendY = height - 70;

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxStringency])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat((d) => d.toString());

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Set the gradient colors
    linearGradient
      .selectAll("stop")
      .data([0, 0.2, 0.4, 0.6, 0.8, 1])
      .enter()
      .append("stop")
      .attr("offset", (d) => d * 100 + "%")
      .attr("stop-color", (d) => colorScale(d * maxStringency));

    // Draw the legend rectangle with the gradient
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)")
      .style("stroke", "#cbd5e1") // Light border
      .style("stroke-width", 0.5);

    // Add legend axis
    legend
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#64748b");

    // Add legend title
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", -5)
      .attr("font-size", "12px")
      .attr("fill", "#334155")
      .text("Stringency Index");

    // Add title with the current date
    const titleGroup = svg.append("g").attr("class", "map-title");

    titleGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b") // Darker text for better contrast
      .text("COVID-19 Stringency Index");

    titleGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#64748b") // Subtitle in a lighter color
      .text(
        `${new Date(currentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })}`
      );

    // Draw the map paths inside the group with improved styling
    mapGroup
      .selectAll("path.country")
      .data(worldGeoData.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", pathGenerator)
      .attr("fill", (d: any) => {
        // Use the mapping to get the correct country name in our data
        const dataCountryName = getDataCountryName(d.properties.name);
        const value = currentData[dataCountryName];
        return value !== undefined ? colorScale(value) : "#f1f5f9"; // Light gray for no data
      })
      .attr("stroke", "#94a3b8") // Softer border color
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.7)
      .attr("class", (d: any) => {
        const dataCountryName = getDataCountryName(d.properties.name);
        return dataCountryName === selectedCountry
          ? "selected-country country"
          : "country";
      })
      .style("cursor", "pointer")
      .style("stroke-width", (d: any) => {
        const dataCountryName = getDataCountryName(d.properties.name);
        return dataCountryName === selectedCountry ? 2 : 0.5;
      })
      .style("stroke", (d: any) => {
        const dataCountryName = getDataCountryName(d.properties.name);
        return dataCountryName === selectedCountry ? "#f43f5e" : "#94a3b8";
      })
      .style("filter", (d: any) => {
        const dataCountryName = getDataCountryName(d.properties.name);
        return dataCountryName === selectedCountry
          ? "url(#drop-shadow)"
          : "none";
      })
      .on("click", (event: any, d: any) => {
        const geoCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(geoCountryName);
        setSelectedCountry(dataCountryName);
        onCountryClick(dataCountryName, currentDate);

        // Zoom to the selected country
        zoomToCountry(dataCountryName);
      })

      // 2. Update this mouseover handler:
      .on("mouseover", (event: any, d: any) => {
        const geoCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(geoCountryName);
        const value = currentData[dataCountryName] || 0;

        // Highlight the hovered country
        d3.select(event.target)
          .transition()
          .duration(200)
          .style("fill-opacity", 0.8)
          .style("stroke-width", 1.5)
          .style("stroke", "#0284c7");

        setHoveredCountry(dataCountryName);

        // Enhanced tooltip
        tooltip
          .style("visibility", "visible")
          .style("opacity", 0)
          .html(
            `<div>
              <strong>${dataCountryName}</strong><br/>
              <span>Stringency: ${value.toFixed(2)}</span>
            </div>`
          )
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`)
          .transition()
          .duration(200)
          .style("opacity", 1);
      })

      // 3. Update this mousemove handler:
      .on("mousemove", (event: any) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 40}px`);
      })

      // 4. Update this mouseout handler:
      .on("mouseout", (event: any, d: any) => {
        const geoCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(geoCountryName);

        // Reset country highlight
        d3.select(event.target)
          .transition()
          .duration(200)
          .style("fill-opacity", 1)
          .style("stroke-width", dataCountryName === selectedCountry ? 2 : 0.5)
          .style(
            "stroke",
            dataCountryName === selectedCountry ? "#f43f5e" : "#94a3b8"
          );

        setHoveredCountry(null);

        tooltip
          .transition()
          .duration(200)
          .style("opacity", 0)
          .on("end", () => tooltip.style("visibility", "hidden"));
      });

    // 5. Update this zoom handler:
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event: any) => {
        mapGroup.attr("transform", event.transform);

        mapGroup.selectAll("path").attr("stroke-width", function (d: any) {
          const isSelected = d3.select(this).classed("selected-country");
          return isSelected ? 2 / event.transform.k : 0.5 / event.transform.k;
        });
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // 6. Update the double-click handler:
    svg.on("dblclick", (event) => {
      const transform = d3.zoomTransform(svg.node()!);
      const newScale = transform.k * 1.5;
      const coordinates = d3.pointer(event);

      svg
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(
              width / 2 - newScale * coordinates[0],
              height / 2 - newScale * coordinates[1]
            )
            .scale(newScale)
        );
    });

    // If Singapore is selected, let's automatically zoom to it on initial render
    // to help the user locate it on the map
    if (selectedCountry === "Singapore" && initialRenderRef.current) {
      // Call onCountryClick and zoom to Singapore
      onCountryClick("Singapore", currentDate);
      // Add a small delay before zooming to ensure the map is fully rendered
      setTimeout(() => {
        zoomToCountry("Singapore");
      }, 1000);
    }
  }, [
    worldGeoData,
    availableDates,
    currentDateIndex,
    maxStringency,
    timeSeriesData,
    onCountryClick,
    selectedCountry,
  ]);

  // Function to handle zooming in
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const currentTransform = d3.zoomTransform(svg.node()!);

      svg
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(currentTransform.x, currentTransform.y)
            .scale(currentTransform.k * 1.5)
        );
    }
  };

  // Function to handle zooming out
  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const currentTransform = d3.zoomTransform(svg.node()!);

      svg
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(currentTransform.x, currentTransform.y)
            .scale(Math.max(0.7, currentTransform.k / 1.5))
        );
    }
  };

  // Function to reset zoom
  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);

      svg
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  // Function to handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(e.target.value);
    setCurrentDateIndex(newIndex);

    // If playing, stop when manually moving the slider
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  // Format the current date for display
  const formattedDate = availableDates[currentDateIndex]
    ? new Date(availableDates[currentDateIndex]).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Function to handle country selection from dropdown
  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountryName = e.target.value;

    if (selectedCountryName) {
      setSelectedCountry(selectedCountryName);
      onCountryClick(selectedCountryName, availableDates[currentDateIndex]);
      zoomToCountry(selectedCountryName);
    }
  };

  return (
    <div className={`${className} relative rounded-lg shadow-lg bg-white p-4 `}>
      {loading ? (
        <div className="flex items-center justify-center h-[650px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading map data...</span>
        </div>
      ) : (
        <>
          <svg ref={svgRef} width="100%" height="70%" />

          <div
            ref={tooltipRef}
            className="fixed bg-gray-800 bg-opacity-90 text-white py-2 px-3 rounded-md text-sm shadow-lg invisible pointer-events-none z-50 border border-gray-700 max-w-xs"
            style={{
              transition: "opacity 0.2s ease-in-out",
            }}
          />

          {/* Zoom controls */}
          {/* Country dropdown */}
          <div className="absolute top-4 left-4 z-10 w-60">
            <div className="flex flex-col">
              <label
                htmlFor="country-select"
                className="text-xs font-medium text-gray-700 mb-1"
              >
                Select a country:
              </label>
              <select
                id="country-select"
                value={selectedCountry}
                onChange={handleCountrySelect}
                className="py-2 px-3 border border-gray-300 bg-white rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">-- Select a country --</option>
                {/* Add Singapore as the first option for easy access */}
                <option value="Singapore">Singapore</option>
                {/* List all other countries alphabetically */}
                {Object.keys(timeSeriesData)
                  .filter((country) => country !== "Singapore")
                  .sort()
                  .map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Find Singapore button */}
          <div className="absolute top-20 left-4 z-10">
            <button
              onClick={() => {
                setSelectedCountry("Singapore");
                onCountryClick("Singapore", availableDates[currentDateIndex]);
                zoomToCountry("Singapore");
              }}
              className="py-1 px-3 bg-blue-100 text-blue-700 rounded border border-blue-200 text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Find Singapore
            </button>
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={handleResetZoom}
              className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Reset zoom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                <path d="M12 8v4l3 3" />
              </svg>
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <input
                type="range"
                min="0"
                max={availableDates.length - 1}
                value={currentDateIndex}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="mt-3 text-center text-sm font-medium text-gray-700">
                {formattedDate}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-full flex items-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isPlaying
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {isPlaying ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                    Play
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="speed"
                  className="text-sm font-medium text-gray-700"
                >
                  Speed:
                </label>
                <select
                  id="speed"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  className="py-1 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2000">Slow</option>
                  <option value="1000">Normal</option>
                  <option value="500">Fast</option>
                </select>
              </div>

              {/* Selected country shown beside speed control */}
              {selectedCountry && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Selected:
                  </span>
                  <span className="py-1 px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium text-sm">
                    {selectedCountry}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
