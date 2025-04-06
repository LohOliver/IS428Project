"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

// TypeScript interfaces
interface Policy {
  actual_end_date: string;
  authorizing_country_iso: string;
  authorizing_country_name: string;
  effective_start_date: string;
  policy_category: string;
  policy_subcategory: string;
}

interface AggregatedPolicy {
  category: string;
  subcategory: string | null;
  startDate: Date;
  endDate: Date;
  count: number;
  countries: Set<string>;
  countryNames: Set<string>;
}

interface FilterState {
  countries: string[];
  category: string | null;
  subcategory: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

export default function PolicyTimelineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for data, loading, and error
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for available countries
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // State for selected policies (for detail view)
  const [selectedPolicies, setSelectedPolicies] = useState<Policy[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    countries: ["SGP"], // Default to Singapore
    category: null,
    subcategory: null,
    startDate: null,
    endDate: null,
  });

  // State for pagination
  const [page, setPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 20;

  // Fetch policy data
  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "https://is428project.onrender.com/policies/SGP"
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch policy data: ${response.status}`);
        }

        const data = await response.json();

        // Fix for the policy filter error
        const policiesWithEndDates = data.filter(
          (policy: Policy) => policy.actual_end_date
        );

        // Fix for the date mapping errors
        if (policiesWithEndDates.length > 0) {
          const startDates = policiesWithEndDates.map(
            (p: Policy) => new Date(p.effective_start_date)
          );
          const endDates = policiesWithEndDates.map(
            (p: Policy) => new Date(p.actual_end_date)
          );

          const minDate = new Date(
            Math.min(...startDates.map((d: Date) => d.getTime()))
          );
          const maxDate = new Date(
            Math.max(...endDates.map((d: Date) => d.getTime()))
          );

          // Set initial date range if not already set
          if (!filters.startDate && !filters.endDate) {
            setFilters((prev) => ({
              ...prev,
              startDate: minDate,
              endDate: maxDate,
            }));
          }
        }

        // Set the policies
        setPolicies(policiesWithEndDates);

        // Extract available countries
        // Fix for the parameter 'p' type error and the countries type mismatch
        const countries = [
          ...new Set(
            policiesWithEndDates.map((p: Policy) => p.authorizing_country_iso)
          ),
        ].sort();

        // Convert to string array before passing to setAvailableCountries
        setAvailableCountries(countries as string[]);
      } catch (err) {
        console.error("Error fetching policy data:", err);
        setError("Failed to load policy data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

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

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      const policyStartDate = new Date(policy.effective_start_date);
      const policyEndDate = new Date(policy.actual_end_date);

      if (filters.startDate && policyEndDate < filters.startDate) {
        return false;
      }

      if (filters.endDate && policyStartDate > filters.endDate) {
        return false;
      }
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

  // Handle filter changes
  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const selectedCountries: string[] = [];

    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedCountries.push(options[i].value);
      }
    }

    setFilters((prev) => ({
      ...prev,
      countries: selectedCountries,
    }));
    setPage(1); // Reset to first page when filter changes
  };

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

  // Draw the timeline chart using D3 - COMPLETELY REVISED
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

    // Color scale based on policy count
    const maxCount = d3.max(paginatedPolicies, (d) => d.count) || 1;
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxCount]);

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
      .style("fill", (d) => colorScale(d.count))
      .style("stroke", "#333")
      .style("stroke-width", 1)
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

    // Add labels with count
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
        return (yScale(label) || 0) + yScale.bandwidth() / 2 + 5;
      })
      .attr("x", (d) => {
        const barWidth = xScale(d.endDate) - xScale(d.startDate);
        return xScale(d.startDate) + barWidth / 2;
      })
      .text((d) => (d.count > 1 ? `${d.count} policies` : "1 policy"))
      .attr("text-anchor", "middle")
      .style("fill", (d) => (d.count > maxCount / 2 ? "white" : "black"))
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

    // Add category/subcategory labels
    chart
      .selectAll(".category-label")
      .data(paginatedPolicies)
      .enter()
      .append("text")
      .attr("class", "category-label")
      .attr("y", (d) => {
        const label = filters.category
          ? d.subcategory || "Unknown"
          : d.category;
        return (yScale(label) || 0) + yScale.bandwidth() / 2 - 5;
      })
      .attr("x", (d) => {
        const barWidth = xScale(d.endDate) - xScale(d.startDate);
        return xScale(d.startDate) + barWidth / 2;
      })
      .text((d) => (filters.category ? d.subcategory || "Unknown" : d.category))
      .attr("text-anchor", "middle")
      .style("fill", (d) => (d.count > maxCount / 2 ? "white" : "black"))
      .style("font-size", "11px")
      .style("pointer-events", "none") // Prevent text from interfering with mouse events
      .each(function (d) {
        // Hide text if bar is too small
        const barWidth = xScale(d.endDate) - xScale(d.startDate);
        if (barWidth < 100) {
          d3.select(this).style("opacity", 0);
        }
      });

    // Add legend for policy count
    const legendData = [
      1,
      Math.ceil(maxCount / 3),
      Math.ceil((2 * maxCount) / 3),
      maxCount,
    ];
    const legendWidth = 200;
    const legendHeight = 20;

    const legendX = width - legendWidth;
    const legendY = -35;

    // Legend container
    const legend = chart
      .append("g")
      .attr("transform", `translate(${legendX},${legendY})`);

    // Legend title
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text("Number of Policies");

    // Legend gradient
    const legendScale = d3
      .scaleLinear()
      .domain([1, maxCount])
      .range([0, legendWidth]);

    // Add color gradient rectangles
    legendData.forEach((value, i) => {
      if (i < legendData.length - 1) {
        const startX = legendScale(value);
        const endX = legendScale(legendData[i + 1]);
        const rectWidth = endX - startX;

        legend
          .append("rect")
          .attr("x", startX)
          .attr("y", 0)
          .attr("width", rectWidth)
          .attr("height", legendHeight)
          .style("fill", colorScale(value));
      }
    });

    // Add ticks and labels
    legendData.forEach((value) => {
      legend
        .append("line")
        .attr("x1", legendScale(value))
        .attr("x2", legendScale(value))
        .attr("y1", legendHeight)
        .attr("y2", legendHeight + 4)
        .style("stroke", "#333");

      legend
        .append("text")
        .attr("x", legendScale(value))
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(value);
    });
  }, [paginatedPolicies, filters.category, filters.startDate, filters.endDate]);

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
        {/* Country Filter */}
        <div className="space-y-2">
          <label htmlFor="country-filter" className="block font-medium">
            Countries
          </label>
          <select
            id="country-filter"
            className="w-full p-2 border rounded"
            multiple
            size={Math.min(4, availableCountries.length)}
            onChange={handleCountryChange}
            value={filters.countries}
          >
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            Hold Ctrl/Cmd to select multiple
          </div>
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
          No policies with end dates match the selected filters.
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
                      {new Date(policy.actual_end_date).toLocaleDateString()}
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
