"use client";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Define the countryNameToAlpha3 mapping directly in this file
// instead of importing from an external JSON file
const countryNameToAlpha3: Record<string, string> = {
  Afghanistan: "AFG",
  Albania: "ALB",
  Algeria: "DZA",
  Andorra: "AND",
  Angola: "AGO",
  Argentina: "ARG",
  Armenia: "ARM",
  Australia: "AUS",
  Austria: "AUT",
  Azerbaijan: "AZE",
  Bahamas: "BHS",
  Bahrain: "BHR",
  Bangladesh: "BGD",
  Barbados: "BRB",
  Belarus: "BLR",
  Belgium: "BEL",
  Belize: "BLZ",
  Benin: "BEN",
  Bhutan: "BTN",
  Bolivia: "BOL",
  "Bosnia and Herzegovina": "BIH",
  Botswana: "BWA",
  Brazil: "BRA",
  Brunei: "BRN",
  Bulgaria: "BGR",
  "Burkina Faso": "BFA",
  Burundi: "BDI",
  Cambodia: "KHM",
  Cameroon: "CMR",
  Canada: "CAN",
  "Cape Verde": "CPV",
  "Central African Republic": "CAF",
  Chad: "TCD",
  Chile: "CHL",
  China: "CHN",
  Colombia: "COL",
  Comoros: "COM",
  Congo: "COG",
  "Costa Rica": "CRI",
  Croatia: "HRV",
  Cuba: "CUB",
  Cyprus: "CYP",
  "Czech Republic": "CZE",
  Denmark: "DNK",
  Djibouti: "DJI",
  Dominica: "DMA",
  "Dominican Republic": "DOM",
  Ecuador: "ECU",
  Egypt: "EGY",
  "El Salvador": "SLV",
  "Equatorial Guinea": "GNQ",
  Eritrea: "ERI",
  Estonia: "EST",
  Eswatini: "SWZ",
  Ethiopia: "ETH",
  Fiji: "FJI",
  Finland: "FIN",
  France: "FRA",
  Gabon: "GAB",
  Gambia: "GMB",
  Georgia: "GEO",
  Germany: "DEU",
  Ghana: "GHA",
  Greece: "GRC",
  Grenada: "GRD",
  Guatemala: "GTM",
  Guinea: "GIN",
  "Guinea-Bissau": "GNB",
  Guyana: "GUY",
  Haiti: "HTI",
  Honduras: "HND",
  Hungary: "HUN",
  Iceland: "ISL",
  India: "IND",
  Indonesia: "IDN",
  Iran: "IRN",
  Iraq: "IRQ",
  Ireland: "IRL",
  Israel: "ISR",
  Italy: "ITA",
  Jamaica: "JAM",
  Japan: "JPN",
  Jordan: "JOR",
  Kazakhstan: "KAZ",
  Kenya: "KEN",
  Kiribati: "KIR",
  Kuwait: "KWT",
  Kyrgyzstan: "KGZ",
  Laos: "LAO",
  Latvia: "LVA",
  Lebanon: "LBN",
  Lesotho: "LSO",
  Liberia: "LBR",
  Libya: "LBY",
  Liechtenstein: "LIE",
  Lithuania: "LTU",
  Luxembourg: "LUX",
  Madagascar: "MDG",
  Malawi: "MWI",
  Malaysia: "MYS",
  Maldives: "MDV",
  Mali: "MLI",
  Malta: "MLT",
  Mauritania: "MRT",
  Mauritius: "MUS",
  Mexico: "MEX",
  Moldova: "MDA",
  Monaco: "MCO",
  Mongolia: "MNG",
  Montenegro: "MNE",
  Morocco: "MAR",
  Mozambique: "MOZ",
  Myanmar: "MMR",
  Namibia: "NAM",
  Nepal: "NPL",
  Netherlands: "NLD",
  "New Zealand": "NZL",
  Nicaragua: "NIC",
  Niger: "NER",
  Nigeria: "NGA",
  "North Korea": "PRK",
  "North Macedonia": "MKD",
  Norway: "NOR",
  Oman: "OMN",
  Pakistan: "PAK",
  Palau: "PLW",
  Panama: "PAN",
  "Papua New Guinea": "PNG",
  Paraguay: "PRY",
  Peru: "PER",
  Philippines: "PHL",
  Poland: "POL",
  Portugal: "PRT",
  Qatar: "QAT",
  Romania: "ROU",
  Russia: "RUS",
  Rwanda: "RWA",
  "Saudi Arabia": "SAU",
  Senegal: "SEN",
  Serbia: "SRB",
  Singapore: "SGP",
  Slovakia: "SVK",
  Slovenia: "SVN",
  "Solomon Islands": "SLB",
  "South Africa": "ZAF",
  "South Korea": "KOR",
  Spain: "ESP",
  "Sri Lanka": "LKA",
  Sudan: "SDN",
  Suriname: "SUR",
  Sweden: "SWE",
  Switzerland: "CHE",
  Syria: "SYR",
  Taiwan: "TWN",
  Tajikistan: "TJK",
  Tanzania: "TZA",
  Thailand: "THA",
  Togo: "TGO",
  Tonga: "TON",
  "Trinidad and Tobago": "TTO",
  Tunisia: "TUN",
  Turkey: "TUR",
  Turkmenistan: "TKM",
  Uganda: "UGA",
  Ukraine: "UKR",
  "United Arab Emirates": "ARE",
  "United Kingdom": "GBR",
  "United States": "USA",
  Uruguay: "URY",
  Uzbekistan: "UZB",
  Vanuatu: "VUT",
  "Vatican City": "VAT",
  Venezuela: "VEN",
  Vietnam: "VNM",
  Yemen: "YEM",
  Zambia: "ZMB",
  Zimbabwe: "ZWE",
};

// Interfaces and types
interface PolicyData {
  policy_category: string;
  policy_subcategory: string;
  effective_start_date: string | null;
  actual_end_date: string | null;
  authorizing_country_iso?: string;
  authorizing_country_name?: string;
}

interface PolicyCount {
  name: string;
  count: number;
  subcategories: string[];
}

interface PolicyBreakdownProps {
  className?: string;
  country?: string;
  countryName?: string;
  apiUrl?: string;
  selectedDate: string;
}

export function PolicyBreakdown({
  className,
  country,
  countryName,
  apiUrl = "http://localhost:5002/policies",
  selectedDate,
  ...props
}: PolicyBreakdownProps) {
  // State management
  const [policyData, setPolicyData] = useState<PolicyData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chartDimensions, setChartDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Refs
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const prevDateRef = useRef<string>(selectedDate);

  // Data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      if (!country && !countryName) {
        setError("No country selected");
        return;
      }

      try {
        // Get the alpha-3 code from country name or use provided country code
        let countryCode = country;
        if (countryName) {
          // TypeScript now knows countryNameToAlpha3 is a Record<string, string>
          // so this indexing is safe
          countryCode = countryNameToAlpha3[countryName] || "";
          if (!countryCode) {
            setError(`Could not find country code for: ${countryName}`);
            return;
          }
        }

        // Construct the URL to fetch policies for the specific country code only
        const url = `${apiUrl}/${countryCode}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const countryPoliciesData = await response.json();

        // Ensure we have an array of policies
        if (!Array.isArray(countryPoliciesData)) {
          setError("Unexpected API response format");
          return;
        }

        // Convert selectedDate to Date object for comparison
        const formattedSelectedDate = selectedDate.split("T")[0]; // Strip time portion if present
        const selectedDateObj = new Date(formattedSelectedDate);
        selectedDateObj.setHours(0, 0, 0, 0); // Set to beginning of day for consistent comparison

        // Filter policies by date
        const filteredPolicies = countryPoliciesData.filter((policy) => {
          // Skip policies without a category
          if (!policy.policy_category) return false;

          // Parse dates safely
          let startDate: Date | null = null;
          let endDate: Date | null = null;

          try {
            if (policy.effective_start_date) {
              startDate = new Date(policy.effective_start_date);
              startDate.setHours(0, 0, 0, 0);

              // Check if date is valid
              if (isNaN(startDate.getTime())) {
                startDate = null;
              }
            }
          } catch (err) {
            console.error("Error parsing start date:", err);
          }

          try {
            if (policy.actual_end_date) {
              endDate = new Date(policy.actual_end_date);
              endDate.setHours(23, 59, 59, 999);

              // Check if date is valid
              if (isNaN(endDate.getTime())) {
                endDate = null;
              }
            }
          } catch (err) {
            console.error("Error parsing end date:", err);
          }

          // Policy is active if start date is null or before selected date
          // AND end date is null or after selected date
          const isStartDateValid = !startDate || startDate <= selectedDateObj;
          const isEndDateValid = !endDate || endDate >= selectedDateObj;

          return isStartDateValid && isEndDateValid;
        });

        setPolicyData(filteredPolicies);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching policy data:", err);
        setError(`Failed to load policy data: ${err.message}`);
        setPolicyData([]);
      }
    };

    fetchData();
    // Update the previous date ref after fetching
    prevDateRef.current = selectedDate;
  }, [apiUrl, country, countryName, selectedDate]);

  // Rest of your component code remains the same
  // Process data to get policy counts by category
  const processedData = useMemo(() => {
    // Define all known policy categories
    const allCategories = [
      "Authorization and enforcement",
      "Contact tracing/Testing",
      "Enabling and relief measures",
      "Face mask",
      "Social distancing",
      "Support for public health and clinical capacity",
      "Travel restrictions",
      "Vaccinations",
    ];

    if (!policyData || policyData.length === 0) {
      // Return empty data structure with all categories
      return allCategories.map((category) => ({
        name: category,
        count: 0,
        subcategories: [],
      }));
    }

    const categoryCounts: Record<string, PolicyCount> = {};

    // Group by policy_category
    policyData.forEach((policy) => {
      if (!policy.policy_category) return;

      if (!categoryCounts[policy.policy_category]) {
        categoryCounts[policy.policy_category] = {
          name: policy.policy_category,
          count: 0,
          subcategories: [],
        };
      }
      categoryCounts[policy.policy_category].count++;

      // Add subcategory if not already in the array
      if (
        policy.policy_subcategory &&
        !categoryCounts[policy.policy_category].subcategories.includes(
          policy.policy_subcategory
        )
      ) {
        categoryCounts[policy.policy_category].subcategories.push(
          policy.policy_subcategory
        );
      }
    });

    // Ensure all categories are included, even with zero counts
    const result = allCategories.map((category) => {
      if (categoryCounts[category]) {
        return categoryCounts[category];
      } else {
        return {
          name: category,
          count: 0,
          subcategories: [],
        };
      }
    });

    // Sort by count (highest first)
    result.sort((a, b) => b.count - a.count);

    return result;
  }, [policyData]);

  const totalPolicies = useMemo(() => {
    return processedData.reduce((sum, item) => sum + item.count, 0);
  }, [processedData]);

  // Format date safely
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Initialize the chart container and setup resize observer
  useEffect(() => {
    if (!chartRef.current) return;

    // Set up ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return;

      const { width, height } = entries[0].contentRect;
      setChartDimensions({ width, height });
    });

    resizeObserver.observe(chartRef.current);
    resizeObserverRef.current = resizeObserver;

    // Setup tooltip
    if (!tooltipRef.current) {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.visibility = "hidden";
      tooltip.style.backgroundColor = "white";
      tooltip.style.border = "1px solid #ddd";
      tooltip.style.borderRadius = "5px";
      tooltip.style.padding = "10px";
      tooltip.style.zIndex = "10";
      tooltip.style.pointerEvents = "none";

      document.body.appendChild(tooltip);
      tooltipRef.current = tooltip;
    }

    return () => {
      resizeObserver.disconnect();
      if (tooltipRef.current) {
        document.body.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, []);

  // Update or create the chart when data or dimensions change
  // Remove selectedDate from dependencies to prevent double rendering
  useEffect(() => {
    if (!chartRef.current || chartDimensions.width === 0) return;

    // D3 chart creation or update
    const margin = { top: 40, right: 30, left: 50, bottom: 100 };
    const width = Math.max(
      300,
      chartDimensions.width - margin.left - margin.right
    );
    const height = 300; // Fixed height to prevent bouncing

    // Create or select SVG element
    let svg = d3.select(chartRef.current).select("svg");

    if (svg.empty()) {
      // Create a new SVG if it doesn't exist (without border)
      // Add a type assertion to tell TypeScript this is compatible
      svg = d3.select(chartRef.current).append("svg") as unknown as typeof svg;

      // Continue with the rest of your methods
      svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("border", "none")
        .style("outline", "none");

      // Add a group for the chart content with margin transform
      svg
        .append("g")
        .attr("class", "chart-content")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const chartContent = svg.select(".chart-content");

    // Clear previous elements for a fresh render
    chartContent.selectAll("*").remove();

    // Create scales
    const x = d3
      .scaleBand()
      .domain(processedData.map((d) => d.name))
      .range([0, width])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, (d) => d.count) || 1])
      .nice()
      .range([height, 0]);

    // Create axes with styling to remove border lines
    chartContent
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select(".domain").remove()) // Remove the domain path (bottom axis line)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)")
      .attr("font-size", "12px");

    chartContent
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5))
      .call((g) => g.select(".domain").remove()) // Remove the domain path (left axis line)
      .attr("font-size", "12px");

    // Add title
    chartContent
      .append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`Policy Breakdown - ${formatDate(selectedDate)}`);

    // Helper function for tooltip
    // Helper function for tooltip
    const showTooltip = (event: MouseEvent, d: PolicyCount) => {
      if (!tooltipRef.current) return;

      // Store a reference to the current tooltip element to use in the callback
      const tooltip = tooltipRef.current;

      tooltip.innerHTML = "";

      const titleDiv = document.createElement("div");
      titleDiv.style.fontWeight = "bold";
      titleDiv.textContent = `${d.name}: ${d.count} policies`;
      tooltip.appendChild(titleDiv);

      if (d.subcategories && d.subcategories.length > 0) {
        const subCatHeader = document.createElement("div");
        subCatHeader.textContent = "Subcategories:";
        tooltip.appendChild(subCatHeader);

        d.subcategories.forEach((subcategory) => {
          const subCatItem = document.createElement("div");
          subCatItem.style.marginTop = "3px";
          subCatItem.textContent = `- ${subcategory}`;
          tooltip.appendChild(subCatItem); // Now using the local variable
        });
      }

      tooltip.style.visibility = "visible";
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY - 10}px`;
    };

    const hideTooltip = () => {
      if (tooltipRef.current) {
        tooltipRef.current.style.visibility = "hidden";
      }
    };

    const moveTooltip = (event: MouseEvent) => {
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `${event.pageX + 10}px`;
        tooltipRef.current.style.top = `${event.pageY - 10}px`;
      }
    };

    // Create bars with transitions (with rounded corners)
    chartContent
      .selectAll(".bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) || 0)
      .attr("width", x.bandwidth())
      .attr("y", height) // Start at bottom for transition
      .attr("height", 0) // Start with height 0 for transition
      .attr("rx", 4) // Rounded corners
      .attr("ry", 4) // Rounded corners
      .attr("fill", (d) => (d.count > 0 ? "steelblue" : "#e0e0e0"))
      .on("mouseover", function (event, d) {
        showTooltip(event, d);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => height - y(d.count));

    // Add bar value labels with transitions
    chartContent
      .selectAll(".bar-label")
      .data(processedData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => (x(d.name) || 0) + x.bandwidth() / 2)
      .attr("y", height) // Start at bottom for transition
      .attr("text-anchor", "middle")
      .text((d) => d.count)
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .attr("opacity", 0) // Start transparent for transition
      .attr("y", (d) => y(d.count) - 5)
      .attr("opacity", 1);
  }, [processedData, chartDimensions]); // Removed selectedDate from dependencies

  return (
    <Card
      className={cn("policy-breakdown border-0 shadow-none", className)}
      {...props}
    >
      <CardContent className="pt-6 px-0">
        <div className="flex flex-col mb-4 px-6">
          {!error && processedData.some((d) => d.count > 0) && (
            <div className="text-sm text-muted-foreground mt-1">
              {totalPolicies} active{" "}
              {totalPolicies === 1 ? "policy" : "policies"} across{" "}
              {processedData.filter((d) => d.count > 0).length}{" "}
              {processedData.filter((d) => d.count > 0).length === 1
                ? "category"
                : "categories"}
            </div>
          )}
        </div>
        {error ? (
          <div className="text-lg text-red-500 mb-4 px-6">{error}</div>
        ) : (
          <div className="w-full">
            {policyData.length === 0 &&
              processedData.every((d) => d.count === 0) && (
                <b className="text-lg mb-4">
                  No policy data available for {countryName || country} on{" "}
                  {formatDate(selectedDate)}
                </b>
              )}

            <div
              ref={chartRef}
              className="w-full relative flex items-center justify-center"
              style={{ minHeight: "320px" }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
