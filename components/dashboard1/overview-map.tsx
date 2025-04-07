import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { Feature, FeatureCollection, Geometry } from "geojson";

// Define the type for our country data
interface CountryData {
  [country: string]: number;
}

// Define the possible data types
export type CovidDataType = "cases" | "deaths" | "recovered" | "vaccinated";

interface CovidWorldMapProps {
  dataType?: CovidDataType;
}

// Interface for the selected country data that shows all metrics
interface SelectedCountryData {
  country: string;
  cases: number | null;
  deaths: number | null;
  recovered: number | null;
  vaccinated: number | null;
}

const CovidWorldMap: React.FC<CovidWorldMapProps> = ({
  dataType = "cases",
}) => {
  const [data, setData] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountryData | null>(null);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [reverseMap, setReverseMap] = useState<{ [key: string]: string }>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoCardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLSelectElement>(null);

  // Cache for all data types to minimize API calls
  const [dataCache, setDataCache] = useState<{
    cases: CountryData | null;
    deaths: CountryData | null;
    recovered: CountryData | null;
    vaccinated: CountryData | null;
  }>({
    cases: null,
    deaths: null,
    recovered: null,
    vaccinated: null,
  });

  // API endpoints for different data types
  const endpoints = {
    cases: "https://is428project.onrender.com/total_cases_by_country",
    deaths: "https://is428project.onrender.com/total_deaths_by_country",
    recovered: "https://is428project.onrender.com/total_recovered_by_country",
    vaccinated: "https://is428project.onrender.com/total_vaccinated_by_country",
  };

  // Fetch all data types initially or when needed
  const fetchAllDataTypes = async () => {
    try {
      // Only fetch data types that haven't been cached
      const dataTypesToFetch = Object.keys(endpoints).filter(
        (type) => !dataCache[type as CovidDataType]
      ) as CovidDataType[];

      if (dataTypesToFetch.length === 0) return;

      const promises = dataTypesToFetch.map(async (type) => {
        const response = await fetch(endpoints[type]);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const jsonData = await response.json();
        return { type, data: jsonData };
      });

      const results = await Promise.all(promises);
      
      // Update the cache with new data
      const newCache = { ...dataCache };
      results.forEach(({ type, data }) => {
        newCache[type] = data;
      });
      
      setDataCache(newCache);
    } catch (error) {
      setError(
        `Error fetching data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  useEffect(() => {
    // Reset data when data type changes
    setLoading(true);
    setError(null);

    // Check if we already have this data type in cache
    if (dataCache[dataType]) {
      setData(dataCache[dataType]);
      setLoading(false);
      return;
    }

    // Fetch data from the appropriate API
    const fetchData = async () => {
      try {
        const response = await fetch(endpoints[dataType]);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const jsonData = await response.json();
        
        // Update both the current data and the cache
        setData(jsonData);
        setDataCache(prev => ({
          ...prev,
          [dataType]: jsonData
        }));
        
        setLoading(false);
      } catch (error) {
        setError(
          `Error fetching ${dataType} data: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setLoading(false);
      }
    };

    fetchData();
    
    // Fetch all data types in the background for faster country selection
    fetchAllDataTypes();
  }, [dataType]);

  // Listen for window resize to make the map responsive
  useEffect(() => {
    const handleResize = () => {
      if (data && svgRef.current) {
        createMap();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

  useEffect(() => {
    if (data && svgRef.current) {
      createMap();
    }
  }, [data, svgRef, selectedCountry]);

  // Function to highlight a country on the map
  const highlightCountry = (countryName: string) => {
    if (!svgRef.current) return;
    
    // Find and highlight the selected country on the map
    d3.select(svgRef.current).selectAll("path.country")
      .attr("stroke-width", function(d: any) {
        const properties = d.properties as any;
        const geoName = properties.name;
        const ourName = reverseMap[geoName] || geoName;
        
        return ourName === countryName ? 2 : 0.5;
      })
      .attr("stroke", function(d: any) {
        const properties = d.properties as any;
        const geoName = properties.name;
        const ourName = reverseMap[geoName] || geoName;
        
        return ourName === countryName ? "#000" : "#fff";
      });
  };
  
  // Handle country selection from dropdown
  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const countryName = event.target.value;
    
    if (countryName === "") {
      // "Select a country" option was chosen - clear selection
      setSelectedCountry(null);
      return;
    }
    
    // Get data for this country from all categories
    const countryData: SelectedCountryData = {
      country: countryName,
      cases: dataCache.cases ? dataCache.cases[countryName] || null : null,
      deaths: dataCache.deaths ? dataCache.deaths[countryName] || null : null,
      recovered: dataCache.recovered ? dataCache.recovered[countryName] || null : null,
      vaccinated: dataCache.vaccinated ? dataCache.vaccinated[countryName] || null : null,
    };
    
    // Update the selected country
    setSelectedCountry(countryData);
    
    // Highlight the country on the map
    highlightCountry(countryName);
  };

  const createMap = async () => {
    if (!svgRef.current || !data) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions based on container size
    const container = svgRef.current.parentElement;
    const width = container ? container.clientWidth : 960;
    const height = container ? container.clientHeight : 500;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    try {
      // Load world topology data
      const worldData: any = await d3.json(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
      );

      const countries = feature(worldData, worldData.objects.countries);

      // Get country names from topology data
      const countryNames: { [id: string]: string } = {};
      worldData.objects.countries.geometries.forEach((d: any) => {
        countryNames[d.id] = d.properties.name;
      });

      // Create a mapping from country names in our data to country names in the GeoJSON
      const countryNameMap: { [key: string]: string } = {
        "United States": "United States of America",
        Russia: "Russian Federation",
        "South Korea": "Korea, Republic of",
        Iran: "Iran, Islamic Republic of",
        "United Kingdom":
          "United Kingdom of Great Britain and Northern Ireland",
        "Democratic Republic of Congo": "Dem. Rep. Congo",
        "South Sudan": "S. Sudan",
        "Central African Republic": "Central African Rep.",
        "Cote d'Ivoire": "Côte d'Ivoire",
        "Bosnia and Herzegovina": "Bosnia and Herz.",
        "North Macedonia": "Macedonia",
        "Dominican Republic": "Dominican Rep.",
        "Equatorial Guinea": "Eq. Guinea",
        // Add more mappings as needed
      };

      // Create a reverse mapping from GeoJSON names to our data names
      const reverseMap: { [key: string]: string } = {};
      Object.entries(countryNameMap).forEach(([ourName, geoName]) => {
        reverseMap[geoName] = ourName;
      });

      // Filter out regions and non-country entries
      const filteredData: CountryData = {};
      const countriesList: string[] = [];
      
      Object.entries(data).forEach(([country, value]) => {
        if (
          country !== "World" &&
          country !== "location" &&
          ![
            "Africa",
            "Asia",
            "Europe",
            "North America",
            "South America",
            "Oceania",
          ].includes(country) &&
          !country.includes("income-countries") &&
          value !== 0
        ) {
          filteredData[country] = value;
          if (!countriesList.includes(country)) {
            countriesList.push(country);
          }
        }
      });
      
      // Sort country names alphabetically and update available countries list
      countriesList.sort();
      setAvailableCountries(countriesList);

      // Find the maximum value for the color scale
      const maxValue = Math.max(
        ...Object.values(filteredData).filter((v) => v > 0)
      );

      // Create a linear color scale for probabilities (0 to 1)
      const colorScale = d3
        .scaleLinear<string>()
        .domain([0, maxValue > 1 ? 1 : maxValue]) // Ensure max is not greater than 1
        .range(getColorRangeForDataType(dataType))
        .clamp(true);

      // Create a projection
      const projection = d3
        .geoNaturalEarth1()
        .fitSize([width, height], countries);

      // Create a path generator
      const path = d3.geoPath().projection(projection);

      // Draw the map - Fixed type annotation for features
      svg
        .selectAll("path")
        // First cast to unknown, then to the expected type with features property
        .data((countries as unknown as { features: any[] }).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", (d: any) => {
          // Try to find the country in our data
          const geoName = d.properties.name;
          const ourName = reverseMap[geoName] || geoName;

          const value = filteredData[ourName];

          // If we have data for this country, color it accordingly
          if (value && value > 0) {
            return colorScale(value);
          }
          // Otherwise, use a default color
          return "#ccc";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .attr("class", "country")
        .on("mouseover", function (event, d: Feature<Geometry>) {
          // Show tooltip
          const properties = d.properties as any;
          const geoName = properties.name;
          const ourName = reverseMap[geoName] || geoName;
          const value = filteredData[ourName];

          tooltip.style("opacity", 1).html(`
                <strong>${ourName}</strong><br/>
                ${getDataTypeLabel(
                  dataType
                )}: ${value ? (value * 100).toFixed(1) + "%" : "No data"}
              `);
        })
        .on("mousemove", function (event) {
          // Use a fixed position relative to the viewport
          tooltip
            .style("left", `${event.clientX + 10}px`)
            .style("top", `${event.clientY - 10}px`);
        })
        .on("mouseout", function () {
          // Hide tooltip when not over a country
          tooltip.style("opacity", 0);
        })
        .on("click", function (event, d: Feature<Geometry>) {
          // Handle click on country
          const properties = d.properties as any;
          const geoName = properties.name;
          const ourName = reverseMap[geoName] || geoName;
          
          // Get data for this country from all categories
          const countryData: SelectedCountryData = {
            country: ourName,
            cases: dataCache.cases ? dataCache.cases[ourName] || null : null,
            deaths: dataCache.deaths ? dataCache.deaths[ourName] || null : null,
            recovered: dataCache.recovered ? dataCache.recovered[ourName] || null : null,
            vaccinated: dataCache.vaccinated ? dataCache.vaccinated[ourName] || null : null,
          };
          
          // Update the selected country
          setSelectedCountry(countryData);
          
          // Highlight the selected country
          svg.selectAll("path.country")
            .attr("stroke-width", function(d2: any) {
              const properties2 = d2.properties as any;
              const geoName2 = properties2.name;
              const ourName2 = reverseMap[geoName2] || geoName2;
              
              return ourName2 === ourName ? 2 : 0.5;
            })
            .attr("stroke", function(d2: any) {
              const properties2 = d2.properties as any;
              const geoName2 = properties2.name;
              const ourName2 = reverseMap[geoName2] || geoName2;
              
              return ourName2 === ourName ? "#000" : "#fff";
            });
            
          // Update dropdown to match selected country
          if (dropdownRef.current) {
            dropdownRef.current.value = ourName;
          }
          
          // Update dropdown to match selected country
          if (dropdownRef.current) {
            dropdownRef.current.value = ourName;
          }
        });

      // Add a legend
      const legendWidth = 300;
      const legendHeight = 10;

      // Create legend scales (linear for probability 0-1)
      const legendScale = d3
        .scaleLinear()
        .domain([0, maxValue > 1 ? 1 : maxValue])
        .range([0, legendWidth]);

      const legendAxis = d3
        .axisBottom(legendScale)
        .tickValues(getTickValuesForProbability(maxValue))
        .tickFormat((d) => d3.format(".0%")(d as number));

      // Create legend container
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr(
          "transform",
          `translate(${width - legendWidth - 40}, ${height - 50})`
        );

      // Create gradient for legend
      const defs = svg.append("defs");
      const linearGradient = defs
        .append("linearGradient")
        .attr("id", `legend-gradient-${dataType}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

      const [startColor, endColor] = getColorRangeForDataType(dataType);
      linearGradient
        .selectAll("stop")
        .data([
          { offset: "0%", color: startColor },
          { offset: "100%", color: endColor },
        ])
        .enter()
        .append("stop")
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

      // Draw colored rectangle for legend
      legend
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#legend-gradient-${dataType})`);

      // Add axis to legend
      legend
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px");

      // Add legend title
      legend
        .append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text(`COVID-19 ${getDataTypeLabel(dataType)} (Probability)`);
    } catch (error) {
      console.error("Error creating map:", error);
      setError(
        `Error creating map: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Helper function to get appropriate color range for each data type
  function getColorRangeForDataType(dataType: CovidDataType): [string, string] {
    switch (dataType) {
      case "cases":
        return ["#ffeda0", "#f03b20"]; // Yellow to red
      case "deaths":
        return ["#ffeda0", "#f03b20"]; // Yellow to red
      case "recovered":
        return ["#ffeda0", "#f03b20"]; // Yellow to red
      case "vaccinated":
        return ["#ffeda0", "#f03b20"]; // Yellow to red
      default:
        return ["#ffeda0", "#f03b20"]; // Default
    }
  }

  // Helper function to get appropriate label for each data type
  function getDataTypeLabel(dataType: CovidDataType): string {
    switch (dataType) {
      case "cases":
        return "Probability of Cases";
      case "deaths":
        return "Probability of Deaths";
      case "recovered":
        return "Probability of Recovery";
      case "vaccinated":
        return "Probability of Vaccination";
      default:
        return "Probability";
    }
  }

  // Helper function to get appropriate tick values for probability scale (0-1)
  function getTickValuesForProbability(maxValue: number): number[] {
    // For probabilities, we want to show appropriate tick marks between 0 and 1
    if (maxValue <= 0.1) {
      return [0, 0.02, 0.04, 0.06, 0.08, 0.1];
    }
    if (maxValue <= 0.25) {
      return [0, 0.05, 0.1, 0.15, 0.2, 0.25];
    }
    if (maxValue <= 0.5) {
      return [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    }
    if (maxValue <= 0.75) {
      return [0, 0.15, 0.3, 0.45, 0.6, 0.75];
    }
    // Default for values up to 1
    return [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading {dataType} data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 h-full flex items-center justify-center">
        <div>
          <p className="font-bold">Error loading data</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Country selection dropdown */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <label htmlFor="country-select" className="font-medium">Select a country:</label>
          <select
            id="country-select"
            ref={dropdownRef}
            className="border border-gray-300 rounded px-2 py-1 flex-grow max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleCountryChange}
            value={selectedCountry?.country || ""}
          >
            <option value="">-- Select a country --</option>
            {availableCountries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Country info panel - displayed when a country is selected */}
      <div
        ref={infoCardRef}
        className={`w-full bg-white p-4 rounded-t-lg shadow-md border border-gray-300 text-sm transition-all duration-300 ${selectedCountry ? 'max-h-60 mb-4' : 'max-h-0 overflow-hidden border-0 p-0 mb-0'}`}
      >
        {selectedCountry && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">{selectedCountry.country}</h3>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSelectedCountry(null)}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="font-semibold">Cases:</div>
                <div className="text-lg font-medium">{selectedCountry.cases !== null ? `${(selectedCountry.cases * 100).toFixed(1)}%` : "No data"}</div>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="font-semibold">Deaths:</div>
                <div className="text-lg font-medium">{selectedCountry.deaths !== null ? `${(selectedCountry.deaths * 100).toFixed(1)}%` : "No data"}</div>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="font-semibold">Recovered:</div>
                <div className="text-lg font-medium">{selectedCountry.recovered !== null ? `${(selectedCountry.recovered * 100).toFixed(1)}%` : "No data"}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="font-semibold">Vaccinated:</div>
                <div className="text-lg font-medium">{selectedCountry.vaccinated !== null ? `${(selectedCountry.vaccinated * 100).toFixed(1)}%` : "No data"}</div>
              </div>
            </div>
          </>
        )}
      </div>
        
      <div className="flex-grow w-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-full bg-gray-50"></svg>
        <div
          ref={tooltipRef}
          className="fixed bg-white p-2 rounded shadow-lg border border-gray-200 text-sm pointer-events-none opacity-0 transition-opacity"
          style={{
            zIndex: 10,
          }}
        ></div>
        
        {/* Country info panel - displayed above the map when a country is clicked */}
        <div
          ref={infoCardRef}
          className={`w-full bg-white p-4 rounded-t-lg shadow-md border border-gray-300 text-sm transition-all duration-300 ${selectedCountry ? 'max-h-60 mb-4' : 'max-h-0 overflow-hidden border-0 p-0 mb-0'}`}
        >
          {selectedCountry && (
            <>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">{selectedCountry.country}</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedCountry(null)}
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="font-semibold">Cases:</div>
                  <div className="text-lg font-medium">{selectedCountry.cases !== null ? `${(selectedCountry.cases * 100).toFixed(1)}%` : "No data"}</div>
                </div>
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <div className="font-semibold">Deaths:</div>
                  <div className="text-lg font-medium">{selectedCountry.deaths !== null ? `${(selectedCountry.deaths * 100).toFixed(1)}%` : "No data"}</div>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="font-semibold">Recovered:</div>
                  <div className="text-lg font-medium">{selectedCountry.recovered !== null ? `${(selectedCountry.recovered * 100).toFixed(1)}%` : "No data"}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-semibold">Vaccinated:</div>
                  <div className="text-lg font-medium">{selectedCountry.vaccinated !== null ? `${(selectedCountry.vaccinated * 100).toFixed(1)}%` : "No data"}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute top-12 left-2 bg-white bg-opacity-80 p-2 rounded text-xs">
        Click on a country to see detailed COVID-19 statistics
      </div>
    </div>
  );
};

export default CovidWorldMap;