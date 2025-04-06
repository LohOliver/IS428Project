"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

// TypeScript interfaces
interface Policy {
  actual_end_date: string | null;
  authorizing_country_iso: string;
  authorizing_country_name: string;
  effective_start_date: string;
  policy_category: string;
  policy_subcategory: string;
  policy_description: string;
  is_active?: boolean; // Add flag for active policies
}

interface ProcessedPolicy extends Policy {
  actual_end_date: string; // This will always have a value after processing
}

interface AggregatedPolicy {
  category: string;
  subcategory: string | null;
  startDate: Date;
  endDate: Date;
  count: number;
  activeCount: number; // Track how many policies are active
  countries: Set<string>;
  countryNames: Set<string>;
}

interface FilterState {
  countries: string[]; // This will store ISO alpha-3 codes
  category: string | null;
  subcategory: string | null;
  startDate: Date | null;
  endDate: Date | null;
  includeActivePolicies: boolean; // New filter for active policies
}

// Country name to alpha-3 code mapping
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
  // ... rest of the mapping (truncated for brevity)
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
  Singapore: "SGP", // Ensuring Singapore is definitely included
};

// Create reverse mapping from alpha-3 code to country name
const alpha3ToCountryName: Record<string, string> = {};
Object.entries(countryNameToAlpha3).forEach(([name, code]) => {
  alpha3ToCountryName[code] = name;
});

export default function PolicyTimelineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    [key: number]: boolean;
  }>({});

  // Toggle description expansion
  const toggleDescription = (index: number) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Truncate description if too long
  const truncateDescription = (
    description: string,
    isExpanded: boolean,
    index: number
  ) => {
    if (!description) return "No description available";

    const maxLength = 200;
    if (description.length <= maxLength) return description;

    if (isExpanded) {
      return (
        <>
          {description}
          <button
            onClick={() => toggleDescription(index)}
            className="ml-2 text-blue-600 text-xs"
          >
            Collapse
          </button>
        </>
      );
    }

    return (
      <>
        {description.slice(0, maxLength)}...
        <button
          onClick={() => toggleDescription(index)}
          className="ml-2 text-blue-600 text-xs"
        >
          Read more
        </button>
      </>
    );
  };
  // State for data, loading, and error
  const [policies, setPolicies] = useState<ProcessedPolicy[]>([]);
  const [rawPolicies, setRawPolicies] = useState<Policy[]>([]); // Store original API data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for dropdown
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // State for available countries and their names
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCountryNames, setAvailableCountryNames] = useState<string[]>(
    []
  );

  // State for selected policies (for detail view)
  const [selectedPolicies, setSelectedPolicies] = useState<ProcessedPolicy[]>(
    []
  );
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  // Initialize default date range
  const DEFAULT_START_DATE = new Date(2020, 0, 1); // January 1, 2020
  const DEFAULT_END_DATE = new Date(2023, 0, 31); // January 31, 2023

  // State for filters - now including active policies toggle and default date range
  const [filters, setFilters] = useState<FilterState>({
    countries: ["SGP"], // Default to Singapore
    category: null,
    subcategory: null,
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    includeActivePolicies: true, // Default to including active policies
  });

  // Stats about active vs. ended policies
  const [policyStats, setPolicyStats] = useState({
    totalPolicies: 0,
    activePolicies: 0,
    endedPolicies: 0,
  });

  // State for pagination
  const [page, setPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 20;

  // Initialize country name to code mapping
  useEffect(() => {
    // Make sure Singapore is in both mappings
    if (!countryNameToAlpha3["Singapore"]) {
      countryNameToAlpha3["Singapore"] = "SGP";
    }
    if (!alpha3ToCountryName["SGP"]) {
      alpha3ToCountryName["SGP"] = "Singapore";
    }

    // Initialize availableCountryNames with all country names from the mapping
    const initialCountryNames = Object.keys(countryNameToAlpha3).sort();
    setAvailableCountryNames(initialCountryNames);
  }, []);

  // Process policies to handle those without end dates
  const processPolicies = (allPolicies: Policy[]): ProcessedPolicy[] => {
    // We'll use the default end date for policies with no end date
    const limitDate = DEFAULT_END_DATE;

    // Process all policies
    const processed = allPolicies.map((policy) => {
      // Check if the policy has no end date
      if (!policy.actual_end_date) {
        return {
          ...policy,
          actual_end_date: limitDate.toISOString(), // Set Jan 2023 as end date
          is_active: true, // Mark as active
        };
      }
      return {
        ...policy,
        is_active: false, // Explicitly mark as inactive
      };
    });

    // Calculate statistics for policies within our date range
    const inRangePolicies = processed.filter((p) => {
      const startDate = new Date(p.effective_start_date);
      const endDate = new Date(p.actual_end_date);

      // Policy is in range if:
      // 1. It starts before DEFAULT_END_DATE, and
      // 2. It ends after DEFAULT_START_DATE
      return startDate <= DEFAULT_END_DATE && endDate >= DEFAULT_START_DATE;
    });

    const activePolicies = inRangePolicies.filter((p) => p.is_active).length;
    const endedPolicies = inRangePolicies.length - activePolicies;

    setPolicyStats({
      totalPolicies: inRangePolicies.length,
      activePolicies,
      endedPolicies,
    });

    return processed;
  };

  // Fetch policy data
  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      setError(null);

      try {
        // We need to fetch data for each selected country
        const selectedCountries =
          filters.countries.length > 0 ? filters.countries : ["SGP"]; // Default to SGP if none selected

        console.log("Fetching data for countries:", selectedCountries);

        // Create an array of promises for all country requests
        const countryRequests = selectedCountries.map(async (countryCode) => {
          const url = `https://is428project.onrender.com/policies/${countryCode}`;
          const response = await fetch(url);

          if (!response.ok) {
            console.warn(
              `Failed to fetch data for country ${countryCode}: ${response.status}`
            );
            return []; // Return empty array for failed requests
          }

          const data = await response.json();
          return data;
        });

        // Wait for all requests to complete
        const results = await Promise.all(countryRequests);

        // Combine all results into a single array
        const allPolicies = results.flat();

        // Store raw policies from API
        setRawPolicies(allPolicies);

        // Process policies to handle those without end dates
        const processedPolicies = processPolicies(allPolicies);

        // Set the policies
        setPolicies(processedPolicies);

        // Extract all unique countries from the data
        const apiCountryCodes = [
          ...new Set(processedPolicies.map((p) => p.authorizing_country_iso)),
        ].sort();

        console.log("API returned country codes:", apiCountryCodes);

        // Update the available countries (alpha-3 codes)
        setAvailableCountries(apiCountryCodes);
      } catch (err) {
        console.error("Error fetching policy data:", err);
        setError("Failed to load policy data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [filters.countries]); // Re-fetch when selected countries change

  // Extract unique categories for filters
  const uniqueCategories = [
    ...new Set(policies.map((policy) => policy.policy_category)),
  ].sort();

  // Get subcategories based on selected category
  const availableSubcategories = filters.category
    ? [
        ...new Set(
          policies
            .filter((policy) => policy.policy_category === filters.category)
            .map((policy) => policy.policy_subcategory)
        ),
      ].sort()
    : [];

  // Filtered policies based on current filters
  const filteredPolicies = policies.filter((policy) => {
    // First, apply date range filter to exclude policies outside our time window
    const policyStartDate = new Date(policy.effective_start_date);
    const policyEndDate = new Date(policy.actual_end_date);

    // Filter out policies that end before our start date or start after our end date
    if (
      policyEndDate < filters.startDate ||
      policyStartDate > filters.endDate
    ) {
      return false;
    }

    // Filter active policies if toggle is off
    if (!filters.includeActivePolicies && policy.is_active) {
      return false;
    }

    // Filter by country if countries are selected
    if (
      filters.countries.length > 0 &&
      !filters.countries.includes(policy.authorizing_country_iso)
    ) {
      return false;
    }

    // Filter by category if selected
    if (filters.category && policy.policy_category !== filters.category) {
      return false;
    }

    // Filter by subcategory if selected
    if (
      filters.subcategory &&
      policy.policy_subcategory !== filters.subcategory
    ) {
      return false;
    }

    return true;
  });

  // AGGREGATION FUNCTION: Group policies by category/subcategory
  const aggregatedPolicies = React.useMemo(() => {
    // Define grouping field based on filters
    const groupingField = filters.category
      ? "policy_subcategory"
      : "policy_category";

    // Create a map to hold aggregated policies
    const aggregatedMap = new Map<string, AggregatedPolicy>();

    // Process each policy
    filteredPolicies.forEach((policy) => {
      const groupKey = policy[groupingField];
      const startDate = new Date(policy.effective_start_date);
      const endDate = new Date(policy.actual_end_date);

      if (aggregatedMap.has(groupKey)) {
        // Update existing entry
        const existing = aggregatedMap.get(groupKey)!;

        // Update start/end dates if needed
        if (startDate < existing.startDate) existing.startDate = startDate;
        if (endDate > existing.endDate) existing.endDate = endDate;

        // Increment count and add country
        existing.count += 1;
        if (policy.is_active) existing.activeCount += 1;
        existing.countries.add(policy.authorizing_country_iso);
        existing.countryNames.add(policy.authorizing_country_name);
      } else {
        // Create new entry
        aggregatedMap.set(groupKey, {
          category: policy.policy_category,
          subcategory: policy.policy_subcategory,
          startDate,
          endDate,
          count: 1,
          activeCount: policy.is_active ? 1 : 0,
          countries: new Set([policy.authorizing_country_iso]),
          countryNames: new Set([policy.authorizing_country_name]),
        });
      }
    });

    // Convert map to array and sort
    return Array.from(aggregatedMap.values()).sort((a, b) => {
      if (filters.category) {
        // If category filter is applied, sort by subcategory
        return (a.subcategory || "").localeCompare(b.subcategory || "");
      } else {
        // Otherwise sort by category
        return a.category.localeCompare(b.category);
      }
    });
  }, [filteredPolicies, filters.category]);

  // Get paginated aggregated policies
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPolicies = aggregatedPolicies.slice(startIndex, endIndex);
  const totalPages = Math.ceil(aggregatedPolicies.length / ITEMS_PER_PAGE);

  // Toggle dropdown
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Handle country selection (single select)
  const handleCountryChange = (countryName: string) => {
    const countryCode = countryNameToAlpha3[countryName] || countryName;

    // Set just this one country
    setFilters((prev) => ({
      ...prev,
      countries: [countryCode],
    }));

    setPage(1); // Reset to first page when filter changes
    setDropdownOpen(false); // Close dropdown after selection
  };

  // Handle category change
  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newCategory = event.target.value || null;
    setFilters((prev) => ({
      ...prev,
      category: newCategory,
      subcategory: null, // Reset subcategory when category changes
    }));
    setPage(1); // Reset to first page when filter changes
  };

  // Handle subcategory change
  const handleSubcategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newSubcategory = event.target.value || null;
    setFilters((prev) => ({
      ...prev,
      subcategory: newSubcategory,
    }));
    setPage(1); // Reset to first page when filter changes
  };

  // Handle date change
  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    // Handle empty string (clear filter)
    if (!value) {
      setFilters((prev) => ({
        ...prev,
        [field]: null,
      }));
      setPage(1);
      return;
    }

    // Parse the date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setFilters((prev) => ({
        ...prev,
        [field]: date,
      }));
      setPage(1); // Reset to first page when filter changes
    }
  };

  // Handle toggle for including active policies
  const handleActivePoliciesToggle = () => {
    setFilters((prev) => ({
      ...prev,
      includeActivePolicies: !prev.includeActivePolicies,
    }));
    setPage(1); // Reset to first page when filter changes
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("country-dropdown");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle pagination
  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  // Draw the timeline chart using D3
  useEffect(() => {
    if (!svgRef.current || paginatedPolicies.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    // Chart dimensions
    const margin = { top: 40, right: 30, bottom: 50, left: 200 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height =
      Math.min(600, Math.max(300, paginatedPolicies.length * 40)) -
      margin.top -
      margin.bottom;

    // Create chart container
    const chart = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Find min and max dates for x-axis
    const minDate =
      filters.startDate ||
      d3.min(paginatedPolicies, (d) => d.startDate) ||
      new Date("2020-01-01");

    const maxDate =
      filters.endDate ||
      d3.max(paginatedPolicies, (d) => d.endDate) ||
      new Date();

    // Add a buffer to the start and end dates if no filters are set
    const startDate = !filters.startDate
      ? new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1)
      : minDate;

    const endDate = !filters.endDate
      ? new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1)
      : maxDate;

    // Scales
    const xScale = d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);

    // Set the domain for y-axis - either subcategories or categories
    const yDomain = paginatedPolicies.map((p) =>
      filters.category ? p.subcategory || "Unknown" : p.category
    );

    const yScale = d3
      .scaleBand()
      .domain(yDomain)
      .range([0, height])
      .padding(0.2);

    // Categorical color scale instead of intensity
    const colorScale = d3
      .scaleOrdinal()
      .domain(yDomain)
      .range([
        "#4e79a7",
        "#f28e2c",
        "#e15759",
        "#76b7b2",
        "#59a14f",
        "#edc949",
        "#af7aa1",
        "#ff9da7",
        "#9c755f",
        "#bab0ab",
        "#6b9ac4",
        "#d7b5a6",
        "#668eb2",
        "#f1a55b",
        "#e68d8e",
        "#a2d9d5",
        "#8bbc81",
        "#f4d279",
        "#c9a6c5",
        "#ffccd0",
      ]); // 20 distinct colors

    // X axis
    chart
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date))
      )
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // X axis label
    chart
      .append("text")
      .attr("transform", `translate(${width / 2},${height + 40})`)
      .style("text-anchor", "middle")
      .text("Date");

    // Y axis
    chart
      .append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px");

    // Y axis label
    chart
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(filters.category ? "Policy Subcategories" : "Policy Categories");

    // Draw aggregated policy bars
    chart
      .selectAll(".policy-bar")
      .data(paginatedPolicies)
      .enter()
      .append("rect")
      .attr("class", "policy-bar")
      .attr("y", (d) => {
        const label = filters.category
          ? d.subcategory || "Unknown"
          : d.category;
        return (yScale(label) || 0) + yScale.bandwidth() * 0.05;
      })
      .attr("x", (d) => xScale(d.startDate))
      .attr("width", (d) =>
        Math.max(xScale(d.endDate) - xScale(d.startDate), 5)
      )
      .attr("height", yScale.bandwidth() * 0.9)
      .attr("rx", 6) // Rounded corners
      .attr("ry", 6)
      .style("fill", (d) => {
        const label = filters.category
          ? d.subcategory || "Unknown"
          : d.category;
        return colorScale(label);
      })
      // Use dashed stroke for bars that contain active policies
      .style("stroke", "#333")
      .style("stroke-width", 1)
      .style("stroke-dasharray", (d) => (d.activeCount > 0 ? "5,5" : "none"))
      .on("mouseover", function (event, d) {
        d3.select(this).style("stroke-width", 2);

        // Format dates
        const startFormatted = d3.timeFormat("%b %d, %Y")(d.startDate);
        const endFormatted = d3.timeFormat("%b %d, %Y")(d.endDate);

        // Format countries list
        const countriesList = Array.from(d.countryNames).join(", ");

        // Position and show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`).html(`
            <div class="font-bold">${
              filters.category ? d.subcategory || "Unknown" : d.category
            }</div>
            <div><span class="font-semibold">Policies:</span> ${d.count}</div>
            ${
              d.activeCount > 0
                ? `<div><span class="font-semibold">Active Policies:</span> ${d.activeCount}</div>`
                : ""
            }
            <div><span class="font-semibold">Countries:</span> ${countriesList}</div>
            <div><span class="font-semibold">Start:</span> ${startFormatted}</div>
            <div><span class="font-semibold">End:</span> ${endFormatted}</div>
            ${
              !filters.category
                ? `<div><span class="font-semibold">Category:</span> ${d.category}</div>`
                : ""
            }
            ${
              filters.category
                ? `<div><span class="font-semibold">Subcategory:</span> ${
                    d.subcategory || "Unknown"
                  }</div>`
                : ""
            }
            <div class="mt-1 text-blue-600 italic">Click to view individual policies</div>
          `);
      })
      .on("mouseout", function () {
        d3.select(this).style("stroke-width", 1);

        tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        // Get the grouping key - either category or subcategory
        const groupKey = filters.category
          ? "policy_subcategory"
          : "policy_category";
        const groupValue = filters.category ? d.subcategory : d.category;

        // Filter policies to show only those in this group
        const groupPolicies = filteredPolicies.filter(
          (p) => p[groupKey] === groupValue
        );

        // Set the selected policies for detail view
        setSelectedPolicies(groupPolicies);
        setSelectedGroupName(
          filters.category ? d.subcategory || "Unknown" : d.category
        );
        setShowDetails(true);
      });

    // Add only count labels to the bars
    chart
      .selectAll(".count-label")
      .data(paginatedPolicies)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("y", (d) => {
        const label = filters.category
          ? d.subcategory || "Unknown"
          : d.category;
        return (yScale(label) || 0) + yScale.bandwidth() / 2;
      })
      .attr("x", (d) => {
        const barWidth = xScale(d.endDate) - xScale(d.startDate);
        return xScale(d.startDate) + barWidth / 2;
      })
      .text((d) => (d.count > 1 ? `${d.count} policies` : "1 policy"))
      .attr("text-anchor", "middle")
      .style("fill", "white") // White text for all bars
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("pointer-events", "none") // Prevent text from interfering with mouse events
      .each(function (d) {
        // Hide text if bar is too small
        const barWidth = xScale(d.endDate) - xScale(d.startDate);
        if (barWidth < 60) {
          d3.select(this).style("opacity", 0);
        }
      });

    // Add legend for active policies
    if (policyStats.activePolicies > 0) {
      const activeLegend = chart
        .append("g")
        .attr("transform", `translate(20, -35)`);

      // Add label
      activeLegend
        .append("text")
        .attr("x", 25)
        .attr("y", 8)
        .style("font-size", "10px")
        .style("alignment-baseline", "middle")
        .text("Contains active policies (Jan 2020 - Jan 2023)");
    }
  }, [
    paginatedPolicies,
    filters.category,
    filters.startDate,
    filters.endDate,
    policyStats,
  ]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Redraw chart on window resize
      if (paginatedPolicies.length > 0 && svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
        // The chart will be redrawn by the other useEffect
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [paginatedPolicies]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded text-red-800">
        <p className="font-bold">Error loading data</p>
        <p>{error}</p>
        <button
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" ref={containerRef}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Country Filter Dropdown (Single Select) */}
        <div className="space-y-2 relative" id="country-dropdown">
          <label htmlFor="country-filter" className="block font-medium">
            Country
          </label>

          {/* Dropdown button */}
          <button
            className="w-full p-2 border rounded bg-white flex justify-between items-center"
            onClick={toggleDropdown}
            type="button"
          >
            <span>
              {filters.countries.length === 0
                ? "Select a country"
                : alpha3ToCountryName[filters.countries[0]] ||
                  filters.countries[0]}
            </span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={dropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
              <div className="p-2 sticky top-0 bg-white border-b">
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Search countries..."
                  onChange={(e) => {
                    // Filter countries based on search input
                    const searchTerm = e.target.value.toLowerCase();
                    const filtered = Object.keys(countryNameToAlpha3)
                      .filter((name) => name.toLowerCase().includes(searchTerm))
                      .sort();
                    setAvailableCountryNames(filtered);
                  }}
                />
              </div>
              <div className="p-2">
                {availableCountryNames.map((countryName) => {
                  const countryCode =
                    countryNameToAlpha3[countryName] || countryName;
                  const isSelected = filters.countries[0] === countryCode;

                  return (
                    <div
                      key={countryName}
                      className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${
                        isSelected ? "bg-blue-100" : ""
                      }`}
                      onClick={() => handleCountryChange(countryName)}
                    >
                      <span>{countryName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label htmlFor="category-filter" className="block font-medium">
            Policy Category
          </label>
          <select
            id="category-filter"
            className="w-full p-2 border rounded"
            value={filters.category || ""}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory Filter (conditional on category) */}
        {filters.category && (
          <div className="space-y-2">
            <label htmlFor="subcategory-filter" className="block font-medium">
              Policy Subcategory
            </label>
            <select
              id="subcategory-filter"
              className="w-full p-2 border rounded"
              value={filters.subcategory || ""}
              onChange={handleSubcategoryChange}
            >
              <option value="">All Subcategories</option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="space-y-2 md:col-span-2 lg:col-span-1">
          <label htmlFor="date-filter" className="block font-medium">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="start-date" className="text-xs text-gray-500">
                Start
              </label>
              <input
                id="start-date"
                type="date"
                className="w-full p-2 border rounded"
                value={
                  filters.startDate
                    ? filters.startDate.toISOString().substr(0, 10)
                    : ""
                }
                onChange={(e) => handleDateChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="end-date" className="text-xs text-gray-500">
                End
              </label>
              <input
                id="end-date"
                type="date"
                className="w-full p-2 border rounded"
                value={
                  filters.endDate
                    ? filters.endDate.toISOString().substr(0, 10)
                    : ""
                }
                onChange={(e) => handleDateChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active Policies Toggle and Stats */}
      <div className="flex flex-col md:flex-row justify-between bg-gray-50 p-3 rounded items-start md:items-center gap-2">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-active"
              checked={filters.includeActivePolicies}
              onChange={handleActivePoliciesToggle}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="include-active" className="select-none">
              Include currently active policies (shown until Jan 2023)
            </label>
          </div>
          <div className="text-xs text-gray-600 italic ml-6">
            Showing policies from Jan 2020 to Jan 2023
          </div>
        </div>

        <div className="text-sm flex flex-wrap gap-3">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Total: {policyStats.totalPolicies} policies
          </span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Active: {policyStats.activePolicies} policies
          </span>
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
            Ended: {policyStats.endedPolicies} policies
          </span>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
        <div className="text-sm">
          {filteredPolicies.length} individual policies in{" "}
          {aggregatedPolicies.length} groups
          {aggregatedPolicies.length > 0
            ? ` (showing ${startIndex + 1}-${Math.min(
                endIndex,
                aggregatedPolicies.length
              )} of ${aggregatedPolicies.length} groups)`
            : ""}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? "bg-gray-200 text-gray-500"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={page === totalPages}
              className={`px-3 py-1 rounded ${
                page === totalPages
                  ? "bg-gray-200 text-gray-500"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Timeline Chart */}
      <div className="relative border rounded p-4 bg-white">
        <svg
          ref={svgRef}
          className="w-full overflow-visible"
          style={{ minHeight: "300px", maxHeight: "600px" }}
        ></svg>

        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute bg-white p-2 rounded shadow-lg border text-sm pointer-events-none z-10"
          style={{
            opacity: 0,
            transition: "opacity 0.2s",
            maxWidth: "300px",
          }}
        ></div>
      </div>

      {filteredPolicies.length === 0 && !loading && (
        <div className="text-center p-4 border rounded bg-gray-50">
          No policies match the selected filters.
        </div>
      )}

      {/* Individual Policies Section */}
      {showDetails && (
        <div className="mt-6 border rounded bg-white">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold">
              Policies in {selectedGroupName}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({selectedPolicies.length} policies)
              </span>
            </h2>
            <button
              onClick={() => setShowDetails(false)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              Hide details
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Country
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Subcategory
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Start Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    End Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedPolicies.map((policy, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {policy.authorizing_country_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {policy.policy_category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {policy.policy_subcategory}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(
                        policy.effective_start_date
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {policy.is_active ? (
                        <span className="text-gray-500 italic">
                          Jan 2023 (currently active)
                        </span>
                      ) : (
                        new Date(policy.actual_end_date).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {policy.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Ended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-w-xs">
                        {truncateDescription(
                          policy.policy_description,
                          !!expandedDescriptions[index],
                          index
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
