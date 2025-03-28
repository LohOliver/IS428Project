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
  maxStringency,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldGeoData, setWorldGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [selectedCountry, setSelectedCountry] = useState<string>("Singapore"); // Default to Singapore
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const zoomRef = useRef<any>(null);
  const initialRenderRef = useRef(true);

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

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentDateIndex((prev) => (prev + 1) % availableDates.length);
      }, animationSpeed);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    return () => clearInterval(animationRef.current as NodeJS.Timeout);
  }, [isPlaying, availableDates.length, animationSpeed]);

  useEffect(() => {
    if (!svgRef.current || !worldGeoData || availableDates.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 400;
    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 6)
      .translate([width / 2, height / 2]);
    const pathGenerator = d3.geoPath().projection(projection);
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxStringency || 1]);

    const currentDate = availableDates[currentDateIndex];
    const currentData: { [country: string]: number } = Object.fromEntries(
      Object.entries(timeSeriesData).map(([country, data]) => [
        country,
        data[currentDate] || 0,
      ])
    );

    const tooltip = d3.select(tooltipRef.current);

    // Create a group for the map content that will be transformed during zoom
    const mapGroup = svg.append("g").attr("class", "map-container");

    // Add the title before applying zoom to keep it fixed
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text(
        `COVID-19 Stringency Index: ${new Date(currentDate).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "long" }
        )}`
      );

    // Draw the map paths inside the group
    mapGroup
      .selectAll("path")
      .data(worldGeoData.features)
      .enter()
      .append("path")
      .attr("d", pathGenerator)
      .attr("fill", (d: any) => colorScale(currentData[d.properties.name] || 0))
      .attr("stroke", "#808080")
      .attr("stroke-width", 0.5)
      .attr("class", (d: any) =>
        d.properties.name === selectedCountry ? "selected-country" : ""
      )
      .style("cursor", "pointer")
      .style("stroke-width", (d: any) =>
        d.properties.name === selectedCountry ? 2 : 0.5
      )
      .style("stroke", (d: any) =>
        d.properties.name === selectedCountry ? "#ff6347" : "#808080"
      )
      .on("click", (event: any, d: any) => {
        const countryName = d.properties.name;
        setSelectedCountry(countryName);
        onCountryClick(countryName, currentDate);
      })
      .on("mouseover", (event: any, d: any) => {
        const value = currentData[d.properties.name] || 0;
        tooltip
          .style("visibility", "visible")
          .text(`${d.properties.name}: ${value.toFixed(2)}`);

        // Position tooltip near cursor on mouseover
        tooltip
          .style("left", `${event.clientX + 5}px`)
          .style("top", `${event.clientY - 28}px`);
      })
      .on("mousemove", (event: any) => {
        // Update tooltip position as mouse moves
        tooltip
          .style("left", `${event.clientX + 5}px`)
          .style("top", `${event.clientY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // If Singapore is selected, zoom to it on initial render
    if (selectedCountry === "Singapore" && initialRenderRef.current) {
      // Find Singapore in the data to get its coordinates
      const singapore = worldGeoData.features.find(
        (f: any) => f.properties.name === "Singapore"
      );
      if (singapore) {
        const bounds = pathGenerator.bounds(singapore);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = Math.max(
          1,
          Math.min(8, 0.9 / Math.max(dx / width, dy / height))
        );
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg
          .transition()
          .duration(750)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
    }

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8]) // Set min/max zoom levels
      .on("zoom", (event: any) => {
        // Apply the zoom transformation to the map group only
        mapGroup.attr("transform", event.transform);

        // Adjust stroke width based on zoom level for better visibility
        mapGroup.selectAll("path").attr("stroke-width", (d: any) => {
          if (d.properties.name === selectedCountry) {
            return 2 / event.transform.k;
          }
          return 0.5 / event.transform.k;
        });
      });

    // Store zoom behavior reference for external controls
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Double-click to zoom in
    svg.on("dblclick.zoom", null); // Disable default double-click zoom
    svg.on("dblclick", (event) => {
      const transform = d3.zoomTransform(svg.node()!);
      const newScale = transform.k * 1.5;
      const coordinates = d3.pointer(event);
      svg
        .transition()
        .duration(300)
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
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(currentTransform.x, currentTransform.y)
            .scale(Math.max(1, currentTransform.k / 1.5))
        );
    }
  };

  // Function to reset zoom
  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .duration(300)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  // Function to handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(e.target.value);
    setCurrentDateIndex(newIndex);
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      {loading && <p>Loading map...</p>}
      <svg ref={svgRef} width="100%" height="500px" />
      <div
        ref={tooltipRef}
        style={{
          position: "fixed", // Changed from absolute to fixed for better positioning
          background: "rgba(0, 0, 0, 0.75)",
          color: "white",
          padding: "5px 10px",
          borderRadius: "5px",
          fontSize: "12px",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: 1000, // Added z-index to ensure tooltip appears above other elements
          transform: "translate(0, 0)", // Reset any transform
          maxWidth: "200px", // Added max width for better appearance
          whiteSpace: "nowrap", // Keep text on single line
        }}
      />

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            padding: "5px 10px",
            borderRadius: "4px",
            background: "#ffffff",
            border: "1px solid #ccc",
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: "5px 10px",
            borderRadius: "4px",
            background: "#ffffff",
            border: "1px solid #ccc",
          }}
        >
          -
        </button>
        <button
          onClick={handleResetZoom}
          style={{
            padding: "5px 10px",
            borderRadius: "4px",
            background: "#ffffff",
            border: "1px solid #ccc",
            fontSize: "12px",
          }}
        >
          Reset
        </button>
      </div>

      <input
        type="range"
        min="0"
        max={availableDates.length - 1}
        value={currentDateIndex}
        onChange={handleSliderChange}
        style={{ width: "100%", marginTop: "10px" }}
      />
      <div style={{ textAlign: "center", marginTop: "5px" }}>
        {new Date(availableDates[currentDateIndex]).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "long" }
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ padding: "5px 10px", borderRadius: "4px" }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="speed">Speed:</label>
          <select
            id="speed"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            style={{ padding: "5px" }}
          >
            <option value="2000">Slow</option>
            <option value="1000">Normal</option>
            <option value="500">Fast</option>
          </select>
        </div>
      </div>
      {selectedCountry && (
        <div
          style={{
            textAlign: "center",
            marginTop: "10px",
            padding: "8px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
          }}
        >
          Selected country: <strong>{selectedCountry}</strong>
        </div>
      )}
    </div>
  );
}