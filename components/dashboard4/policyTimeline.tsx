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

interface FilterState {
  countries: string[];
  category: string | null;
  subcategory: string | null;
}

export default function PolicyTimelineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // State for data, loading, and error
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for available countries
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    countries: ['SGP'], // Default to USA
    category: null,
    subcategory: null
  });
  
  // Fetch policy data
  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Create an array to hold all country data
        let allPolicies: Policy[] = [];
        
        // Start with USA since we have that endpoint
        const response = await fetch('https://is428project.onrender.com/policies/SGP');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch policy data: ${response.status}`);
        }
        
        const data = await response.json();
        // Filter to only include policies with end dates
        allPolicies = data.filter(policy => policy.actual_end_date);
        
        // Set the policies
        setPolicies(allPolicies);
        
        // Extract available countries
        const countries = [...new Set(allPolicies.map(p => p.authorizing_country_iso))].sort();
        setAvailableCountries(countries);
        
      } catch (err) {
        console.error('Error fetching policy data:', err);
        setError('Failed to load policy data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolicies();
  }, []);
  
  // Extract unique categories for filters
  const uniqueCategories = [...new Set(policies.map(policy => policy.policy_category))].sort();
  
  // Get subcategories based on selected category
  const availableSubcategories = filters.category
    ? [...new Set(policies
        .filter(policy => policy.policy_category === filters.category)
        .map(policy => policy.policy_subcategory))]
        .sort()
    : [];
    
  // Filtered policies based on current filters
  const filteredPolicies = policies.filter(policy => {
    // Filter by country if countries are selected
    if (filters.countries.length > 0 && !filters.countries.includes(policy.authorizing_country_iso)) {
      return false;
    }
    
    // Filter by category if selected
    if (filters.category && policy.policy_category !== filters.category) {
      return false;
    }
    
    // Filter by subcategory if selected
    if (filters.subcategory && policy.policy_subcategory !== filters.subcategory) {
      return false;
    }
    
    return true;
  });
  
  // Handle filter changes
  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const selectedCountries: string[] = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedCountries.push(options[i].value);
      }
    }
    
    setFilters(prev => ({
      ...prev,
      countries: selectedCountries
    }));
  };
  
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = event.target.value || null;
    setFilters(prev => ({
      ...prev,
      category: newCategory,
      subcategory: null // Reset subcategory when category changes
    }));
  };
  
  const handleSubcategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubcategory = event.target.value || null;
    setFilters(prev => ({
      ...prev,
      subcategory: newSubcategory
    }));
  };
  
  // Draw the timeline chart using D3
  useEffect(() => {
    if (!svgRef.current || filteredPolicies.length === 0) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Chart dimensions
    const margin = { top: 40, right: 30, bottom: 50, left: 200 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(400, filteredPolicies.length * 40) - margin.top - margin.bottom;
    
    // Create chart container
    const chart = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Parse dates - all policies should have end dates based on our filter
    const parsedPolicies = filteredPolicies.map(policy => ({
      ...policy,
      parsed_start_date: new Date(policy.effective_start_date),
      parsed_end_date: new Date(policy.actual_end_date)
    }));
    
    // Find min and max dates for x-axis
    const currentDate = new Date();
    const minDate = d3.min(parsedPolicies, d => d.parsed_start_date) || new Date("2020-01-01");
    const maxDate = d3.max(parsedPolicies, d => d.parsed_end_date) || currentDate;
    
    // Add a buffer to the start and end dates
    const startBuffer = new Date(minDate);
    startBuffer.setMonth(startBuffer.getMonth() - 1);
    
    const endBuffer = new Date(maxDate);
    endBuffer.setMonth(endBuffer.getMonth() + 1);
    
    // Scales
    const xScale = d3.scaleTime()
      .domain([startBuffer, endBuffer])
      .range([0, width]);
    
    // Group by categories or subcategories for y-axis
    const yGrouping = filters.category 
      ? parsedPolicies.map(p => p.policy_subcategory) 
      : parsedPolicies.map(p => p.policy_category);
    
    const uniqueYLabels = [...new Set(yGrouping)].sort();
    
    const yScale = d3.scaleBand()
      .domain(uniqueYLabels)
      .range([0, height])
      .padding(0.2);
    
    // Color scale by country
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(availableCountries);
    
    // X axis
    chart.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d => d3.timeFormat("%b %Y")(d as Date)))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    // X axis label
    chart.append("text")
      .attr("transform", `translate(${width/2},${height + 40})`)
      .style("text-anchor", "middle")
      .text("Date");
    
    // Y axis
    chart.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px");
    
    // Y axis label
    chart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height/2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(filters.category ? "Policy Subcategories" : "Policy Categories");
    
    // Draw policy bars
    chart.selectAll(".policy-bar")
      .data(parsedPolicies)
      .enter()
      .append("rect")
      .attr("class", "policy-bar")
      .attr("y", d => {
        const label = filters.category ? d.policy_subcategory : d.policy_category;
        return (yScale(label) || 0) + yScale.bandwidth() / 4;
      })
      .attr("x", d => xScale(d.parsed_start_date))
      .attr("width", d => {
        const endDate = d.parsed_end_date;
        return Math.max(xScale(endDate) - xScale(d.parsed_start_date), 5); // Minimum width of 5px
      })
      .attr("height", yScale.bandwidth() / 2)
      .attr("rx", 4) // Rounded corners
      .attr("ry", 4)
      .style("fill", d => colorScale(d.authorizing_country_iso) as string)
      .style("stroke", "#333")
      .style("stroke-width", 1)
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 2);
        
        // Format dates
        const startFormatted = d3.timeFormat("%b %d, %Y")(d.parsed_start_date);
        const endFormatted = d3.timeFormat("%b %d, %Y")(d.parsed_end_date);
        
        // Position and show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`)
          .html(`
            <div class="font-bold">${d.policy_subcategory}</div>
            <div><span class="font-semibold">Country:</span> ${d.authorizing_country_name}</div>
            <div><span class="font-semibold">Category:</span> ${d.policy_category}</div>
            <div><span class="font-semibold">Subcategory:</span> ${d.policy_subcategory}</div>
            <div><span class="font-semibold">Start:</span> ${startFormatted}</div>
            <div><span class="font-semibold">End:</span> ${endFormatted}</div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 1);
        
        tooltip.style("opacity", 0);
      });
    
    // Add policy subcategory text on bars if there's enough space
    chart.selectAll(".policy-label")
      .data(parsedPolicies)
      .enter()
      .append("text")
      .attr("class", "policy-label")
      .attr("y", d => {
        const label = filters.category ? d.policy_subcategory : d.policy_category;
        return (yScale(label) || 0) + yScale.bandwidth() / 1.6;
      })
      .attr("x", d => {
        const start = xScale(d.parsed_start_date);
        const end = xScale(d.parsed_end_date);
        const width = end - start;
        return start + 5; // Add a small padding
      })
      .text(d => {
        const start = xScale(d.parsed_start_date);
        const end = xScale(d.parsed_end_date);
        const width = end - start;
        
        // Only show text if bar is wide enough
        if (width > 80) {
          return d.policy_subcategory;
        }
        return "";
      })
      .style("font-size", "10px")
      .style("fill", "white")
      .style("pointer-events", "none") // Prevent text from interfering with mouse events
      .each(function(d) {
        // Truncate text if too long for the bar
        const textElement = d3.select(this);
        const start = xScale(d.parsed_start_date);
        const end = xScale(d.parsed_end_date);
        const availableWidth = end - start - 10;
        
        if (this.getComputedTextLength() > availableWidth) {
          let text = d.policy_subcategory;
          while (text.length > 3 && this.getComputedTextLength() > availableWidth) {
            text = text.slice(0, -1);
            textElement.text(text + "...");
          }
          if (text.length <= 3) {
            textElement.text("");
          }
        }
      });
      
    // Add legend
    const legendCountries = [...new Set(parsedPolicies.map(p => p.authorizing_country_iso))].sort();
    
    const legend = chart.append("g")
      .attr("transform", `translate(${width - 150}, -30)`);
      
    legend.selectAll(".legend-item")
      .data(legendCountries)
      .enter()
      .append("rect")
      .attr("class", "legend-item")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", d => colorScale(d) as string);
      
    legend.selectAll(".legend-text")
      .data(legendCountries)
      .enter()
      .append("text")
      .attr("class", "legend-text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 12)
      .text(d => d)
      .style("font-size", "12px");
  }, [filteredPolicies, filters.category, availableCountries]);
  
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
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Country Filter */}
        <div className="space-y-2">
          <label htmlFor="country-filter" className="block font-medium">
            Countries
          </label>
          <select
            id="country-filter"
            className="w-full p-2 border rounded"
            multiple
            size={Math.min(5, availableCountries.length)}
            onChange={handleCountryChange}
            value={filters.countries}
          >
            {availableCountries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</div>
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
            {uniqueCategories.map(category => (
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
              {availableSubcategories.map(subcategory => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Timeline Chart */}
      <div className="relative border rounded p-4 bg-white">
        <svg 
          ref={svgRef} 
          className="w-full overflow-visible"
          style={{ minHeight: "400px" }}
        ></svg>
        
        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute bg-white p-2 rounded shadow-lg border text-sm pointer-events-none"
          style={{
            opacity: 0,
            transition: "opacity 0.2s",
            maxWidth: "300px"
          }}
        ></div>
      </div>
      
      {filteredPolicies.length === 0 && !loading && (
        <div className="text-center p-4 border rounded bg-gray-50">
          No policies with end dates match the selected filters.
        </div>
      )}
    </div>
  );
}