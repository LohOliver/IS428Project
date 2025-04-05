"use client";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

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
  newlyImplemented?: boolean;
  isFirstInGroup?: boolean;
  groupSize?: number;
}

interface PolicyCount {
  name: string;
  count: number;
  subcategories: string[];
  newlyImplemented: number;
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
  apiUrl = "https://is428project.onrender.com/policies",
  selectedDate = "2020-01",
  ...props
}: PolicyBreakdownProps) {
  // State management
  const [policyData, setPolicyData] = useState<PolicyData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chartDimensions, setChartDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPolicies, setCategoryPolicies] = useState<PolicyData[]>([]);

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

        // Parse the selected date from YYYY-MM format
        const [year, month] = selectedDate.split("-").map(Number);

        // Create date objects for the first and last day of the selected month
        const firstDayOfMonth = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
        firstDayOfMonth.setHours(0, 0, 0, 0); // Set to beginning of day

        const lastDayOfMonth = new Date(year, month, 0).getDate(); // Get last day of the month
        const lastDateOfMonth = new Date(year, month - 1, lastDayOfMonth);
        lastDateOfMonth.setHours(23, 59, 59, 999); // Set to end of day

        console.log(
          `Filtering policies for the period: ${firstDayOfMonth.toISOString()} to ${lastDateOfMonth.toISOString()}`
        );

        // Filter policies by date and also track which ones were newly implemented in this month
        const filteredPolicies = countryPoliciesData.filter((policy) => {
          // Skip policies without a category
          if (!policy.policy_category) return false;

          // Parse dates safely
          let startDate = null;
          let endDate = null;

          try {
            if (policy.effective_start_date) {
              startDate = new Date(policy.effective_start_date);
              if (!isNaN(startDate.getTime())) {
                startDate.setHours(0, 0, 0, 0); // Set to beginning of day
              } else {
                startDate = null;
              }
            }
          } catch (err) {
            console.error(
              "Error parsing start date:",
              err,
              policy.effective_start_date
            );
          }

          try {
            if (policy.actual_end_date) {
              endDate = new Date(policy.actual_end_date);
              if (!isNaN(endDate.getTime())) {
                endDate.setHours(23, 59, 59, 999); // Set to end of day
              } else {
                endDate = null;
              }
            }
          } catch (err) {
            console.error(
              "Error parsing end date:",
              err,
              policy.actual_end_date
            );
          }

          // Policy is active if it overlaps with the selected month at all:
          // 1. Start date is null OR start date is on or before the last day of the selected month
          // 2. AND end date is null OR end date is on or after the first day of the selected month
          const isStartDateValid = !startDate || startDate <= lastDateOfMonth;
          const isEndDateValid = !endDate || endDate >= firstDayOfMonth;

          // Add a property to identify if this policy was newly implemented in this month
          if (
            startDate &&
            startDate.getFullYear() === year &&
            startDate.getMonth() === month - 1
          ) {
            policy.newlyImplemented = true;
          } else {
            policy.newlyImplemented = false;
          }

          return isStartDateValid && isEndDateValid;
        });

        console.log(
          `Found ${filteredPolicies.length} policies active during ${selectedDate}`
        );
        setPolicyData(filteredPolicies);
        setError(null);

        // Clear selected category when date changes
        setSelectedCategory(null);
        setCategoryPolicies([]);
      } catch (err:any) {
        console.error("Error fetching policy data:", err);
        setError(`Failed to load policy data: ${err.message}`);
        setPolicyData([]);
      }
    };

    fetchData();
    // Update the previous date ref after fetching
    prevDateRef.current = selectedDate;
  }, [apiUrl, country, countryName, selectedDate]);

  // Process data to get unique policy counts by category
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

    // Initialize counts object with all categories set to 0
    const categoryCounts: Record<string, PolicyCount> = {};

    allCategories.forEach((category) => {
      categoryCounts[category] = {
        name: category,
        count: 0,
        subcategories: [],
        newlyImplemented: 0,
      };
    });

    // Create sets to track unique policy implementations by combining subcategory and start date
    const uniquePolicies: Record<string, Set<string>> = {};
    allCategories.forEach((category) => {
      uniquePolicies[category] = new Set();
    });

    // Track newly implemented unique policies
    const newlyImplementedPolicies: Record<string, Set<string>> = {};
    allCategories.forEach((category) => {
      newlyImplementedPolicies[category] = new Set();
    });

    // Helper function to format a date consistently
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return "no-date";
      try {
        const date = new Date(dateString);
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      } catch (e) {
        return "invalid-date";
      }
    };

    // Process policies to track truly unique implementations
    policyData.forEach((policy) => {
      const category = policy.policy_category;
      const subcategory = policy.policy_subcategory;
      const startDate = formatDate(policy.effective_start_date);

      if (category && subcategory && categoryCounts[category]) {
        // Create a unique identifier by combining subcategory and start date
        const uniqueKey = `${subcategory}__${startDate}`;

        // Add this unique policy implementation to the set
        uniquePolicies[category].add(uniqueKey);

        // Track newly implemented policies
        if (policy.newlyImplemented) {
          newlyImplementedPolicies[category].add(uniqueKey);
        }

        // Track the subcategory itself (without duplicates)
        if (!categoryCounts[category].subcategories.includes(subcategory)) {
          categoryCounts[category].subcategories.push(subcategory);
        }
      }
    });

    // Now update the counts based on the unique implementations
    Object.keys(uniquePolicies).forEach((category) => {
      if (categoryCounts[category]) {
        // Set count to number of unique implementations
        categoryCounts[category].count = uniquePolicies[category].size;

        // Count newly implemented unique policies
        categoryCounts[category].newlyImplemented =
          newlyImplementedPolicies[category].size;
      }
    });

    // Convert to array and sort by count (descending)
    return Object.values(categoryCounts).sort((a, b) => b.count - a.count);
  }, [policyData]);

  // Resize observer effect for responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const { width, height } = chartRef.current.getBoundingClientRect();
        setChartDimensions({ width, height: Math.max(height, 300) });
      }
    };

    // Initial dimensions
    updateDimensions();

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver(updateDimensions);
    if (chartRef.current) {
      resizeObserverRef.current.observe(chartRef.current);
    }

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // D3 chart rendering effect
  useEffect(() => {
    if (!chartRef.current || chartDimensions.width === 0) return;

    // Clear any existing chart
    d3.select(chartRef.current).select("svg").remove();

    // Create new SVG element
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", chartDimensions.width)
      .attr("height", chartDimensions.height)
      .attr("viewBox", [0, 0, chartDimensions.width, chartDimensions.height])
      .attr("style", "max-width: 100%; height: 100%;");

    svgRef.current = svg.node();

    // Create tooltip if it doesn't exist
    if (!tooltipRef.current) {
      tooltipRef.current = d3
        .select(chartRef.current)
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("max-width", "300px")
        .style("z-index", "1000")
        .node();
    }

    // If no data, show empty chart with message
    if (processedData.length === 0) {
      svg
        .append("text")
        .attr("x", chartDimensions.width / 2)
        .attr("y", chartDimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text("No policy data available for the selected date.")
        .style("fill", "#6b7280");
      return;
    }

    // Chart dimensions with margins
    const margin = { top: 30, right: 30, bottom: 120, left: 60 };
    const width = chartDimensions.width - margin.left - margin.right;
    const height = chartDimensions.height - margin.top - margin.bottom;

    // Create chart group with margins
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale (categories)
    const x = d3
      .scaleBand()
      .domain(processedData.map((d) => d.name))
      .range([0, width])
      .padding(0.3);

    // Y scale (counts)
    const maxCount = d3.max(processedData, (d) => d.count) || 0;
    const y = d3
      .scaleLinear()
      .domain([0, maxCount + Math.ceil(maxCount * 0.3)]) // Add 30% padding at the top
      .range([height, 0]);

    // Color scale
    const color = d3
      .scaleOrdinal()
      .domain(processedData.map((d) => d.name))
      .range(d3.schemeCategory10);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("font-size", "14px")
      .attr("y", 10) // Add more space between axis and labels
      .each(function (d) {
        // Handle long labels with wrapping if needed
        const self = d3.select(this);
        const text = self.text();
        const words = text.split(/\s+/);

        if (words.length > 2) {
          self.text("");
          self.attr("dy", "0em");

          // Create first line
          self
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "0em")
            .text(words.slice(0, words.length / 2).join(" "));

          // Create second line
          self
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "1em")
            .text(words.slice(words.length / 2).join(" "));
        }
      });

    // Add Y axis with more ticks
    g.append("g")
      .call(d3.axisLeft(y).ticks(Math.min(10, maxCount)))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text("Unique Policy Types");

    // Add title
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -10)
      .text(
        `Policy Categories (${new Date(
          new Date(selectedDate + "-01").setDate(1)
        ).toLocaleDateString(undefined, { year: "numeric", month: "long" })})`
      )
      .style("font-size", "14px")
      .style("font-weight", "bold");

    // Add total active bar first
    g.selectAll(".bar")
      .data(processedData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) || 0)
      .attr("width", x.bandwidth())
      .attr("y", (d) => (d.count === 0 ? height - 2 : y(d.count))) // Position zero bars at the bottom with 2px height
      .attr("height", (d) => (d.count === 0 ? 2 : height - y(d.count))) // Ensure 2px min height for zero values
      .attr("fill", (d) => color(d.name) as string)
      .style("cursor", "pointer") // Add pointer cursor to indicate clickability
      .on("mouseover", function (event, d) {
        // Create subcategories list HTML if there are any
        const subcategoriesHtml =
          d.subcategories.length > 0
            ? `<br/><strong>Subcategories:</strong><br/>${d.subcategories
                .map((sub) => `• ${sub}`)
                .join("<br/>")}`
            : "";

        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style("opacity", 1)
            .html(
              `
                  <div>
                    <strong>${d.name}</strong><br/>
                    <strong>Unique Policy Implementations:</strong> ${d.count}<br/>
                    <strong>Newly Implemented This Month:</strong> ${d.newlyImplemented}
                    ${subcategoriesHtml}
                  </div>
                `
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        }

        d3.select(this).attr(
          "fill",
          d3.rgb(color(d.name) as string).brighter(0.5) as unknown as string
        );
      })
      .on("mouseout", function (event, d) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("opacity", 0);
        }

        d3.select(this).attr("fill", color(d.name) as string);
      })
      .on("click", function (event, d) {
        if (selectedCategory === d.name) {
          // If clicking the same category, toggle it off
          setSelectedCategory(null);
          setCategoryPolicies([]);
        } else {
          // Get all policies for this category
          const allPolicies = policyData.filter(
            (policy) => policy.policy_category === d.name
          );

          // Deduplicate policies based on subcategory and implementation date
          const uniquePolicies: PolicyData[] = [];
          const seenKeys = new Set();

          allPolicies.forEach((policy) => {
            // Create a unique key from subcategory and start date
            const startDate = policy.effective_start_date
              ? new Date(policy.effective_start_date)
                  .toISOString()
                  .split("T")[0]
              : "no-date";
            const uniqueKey = `${policy.policy_subcategory}__${startDate}`;

            // Only add this policy if we haven't seen this combination before
            if (!seenKeys.has(uniqueKey)) {
              seenKeys.add(uniqueKey);
              uniquePolicies.push(policy);
            }
          });

          // Group unique policies by subcategory
          const groupedPolicies = uniquePolicies.reduce((groups, policy) => {
            const key = policy.policy_subcategory || "Uncategorized";
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(policy);
            return groups;
          }, {} as Record<string, PolicyData[]>);

          // Convert to array of policies with subcategory grouping info
          const policiesWithGroupInfo = Object.entries(groupedPolicies).flatMap(
            ([subcategory, policies]) => {
              return policies.map((policy, index) => ({
                ...policy,
                isFirstInGroup: index === 0,
                groupSize: policies.length,
              }));
            }
          );

          setCategoryPolicies(policiesWithGroupInfo);
          setSelectedCategory(d.name);
        }
      });

    // Add newly implemented segment with a different pattern/color
    g.selectAll(".new-policy")
      .data(processedData.filter((d) => d.newlyImplemented > 0))
      .join("rect")
      .attr("class", "new-policy")
      .attr("x", (d) => x(d.name) || 0)
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.newlyImplemented))
      .attr("height", (d) => height - y(d.newlyImplemented))
      .attr(
        "fill",
        (d) =>
          d3.rgb(color(d.name) as string).brighter(1.5) as unknown as string
      )
      .style("stroke", "black")
      .style("stroke-width", 1)
      .style("stroke-dasharray", "4,2")
      .style("pointer-events", "none") // Make this transparent to mouse events
      .on("mouseover", function (event, d) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style("opacity", 1)
            .html(
              `
          <div>
            <strong>${d.name}</strong><br/>
            <strong>Newly Implemented Types This Month:</strong> ${d.newlyImplemented}
          </div>
        `
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        }
      })
      .on("mouseout", function (event, d) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("opacity", 0);
        }
      });

    // Add policy count labels on top of bars
    g.selectAll(".label")
      .data(processedData)
      .join("text")
      .attr("class", "label")
      .attr("x", (d) => (x(d.name) || 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 5) // Set final y position immediately
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("opacity", 1) // Visible immediately
      .text((d) => (d.count > 0 ? d.count : ""));

    // Add legend for newly implemented policies
    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 150}, ${height + 30})`);

    // Add legend title
    legend
      .append("text")
      .attr("y", -10)
      .text("Legend")
      .style("font-weight", "bold");

    // Add legend items
    const legendItems = [
      { label: "Unique Policy Types", color: "#4285F4", pattern: false },
      { label: "Newly Implemented", color: "#8AB4F8", pattern: true },
    ];

    legendItems.forEach((item, i) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendItem
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", item.color);

      if (item.pattern) {
        legendItem
          .select("rect")
          .style("stroke", "black")
          .style("stroke-width", 1)
          .style("stroke-dasharray", "4,2");
      }

      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(item.label)
        .style("font-size", "12px");
    });
  }, [
    processedData,
    chartDimensions,
    selectedDate,
    policyData,
    selectedCategory,
  ]);

  // Render component with improved height handling
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="p-4 pt-20">
        {error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <div className="w-full h-96" ref={chartRef}>
              {/* Chart will be rendered here by D3 */}
            </div>

            {/* Policy Details Section Below Chart */}
            {selectedCategory && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {selectedCategory} Policies
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({categoryPolicies.length}{" "}
                        {categoryPolicies.length === 1 ? "policy" : "policies"})
                      </span>
                    </h2>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setCategoryPolicies([]);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {categoryPolicies.length > 0 ? (
                    categoryPolicies.map((policy, index) => (
                      <div
                        key={index}
                        className={`p-4 hover:bg-gray-50 ${
                          policy.isFirstInGroup
                            ? "border-t-2 border-gray-200"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between flex-wrap gap-2">
                          <h3 className="font-medium text-gray-900">
                            {policy.policy_subcategory}
                            {policy.isFirstInGroup &&
                              policy.groupSize &&
                              policy.groupSize > 1 && (
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  ({policy.groupSize} related{" "}
                                  {policy.groupSize === 1
                                    ? "policy"
                                    : "policies"}
                                  )
                                </span>
                              )}
                          </h3>
                          {policy.newlyImplemented && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              New This Month
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Start Date:</span>{" "}
                            {policy.effective_start_date
                              ? new Date(
                                  policy.effective_start_date
                                ).toLocaleDateString()
                              : "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">End Date:</span>{" "}
                            {policy.actual_end_date
                              ? new Date(
                                  policy.actual_end_date
                                ).toLocaleDateString()
                              : "Ongoing"}
                          </div>
                          {policy.isFirstInGroup && (
                            <div className="col-span-2 mt-1 text-gray-500 text-xs">
                              <strong>Note:</strong> Similar policies with
                              identical subcategory and implementation date have
                              been combined.
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No policy information available.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
