"use client";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define types for raw policy data from API
interface RawPolicyData {
  country: string;
  region: string;
  category: string;
  date_implemented: string | null;
}

// Define types for processed policy counts
interface PolicyCount {
  name: string;
  count: number;
  policies?: RawPolicyData[]; // Store the actual policies for tooltip details
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
  apiUrl = "https://is428project.onrender.com/full_measures_data",
  selectedDate,
  ...props
}: PolicyBreakdownProps) {
  // State to store raw data from API
  const [rawData, setRawData] = useState<RawPolicyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        setRawData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching policy data:", err);
        setError("Failed to load policy data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  // Process raw data to get policy counts
  const processedData = useMemo(() => {
    if (!country) return [];

    const countryData = rawData.filter(
      (item) => 
        item.country === country && 
        item.date_implemented !== null &&
        new Date(item.date_implemented) <= new Date(selectedDate)
    );

    const categoryCounts: Record<string, PolicyCount> = {};

    countryData.forEach((policy) => {
      if (!categoryCounts[policy.category]) {
        categoryCounts[policy.category] = {
          name: policy.category,
          count: 0,
          policies: [],
        };
      }
      categoryCounts[policy.category].count++;
      categoryCounts[policy.category].policies?.push(policy);
    });

    const standardCategories = [
      "Public health measures",
      "Social distancing",
      "Movement restrictions",
      "Governance and socio-economic measures",
      "Lockdown", 
    ];

    return standardCategories.map((category) => {
      return (
        categoryCounts[category] || { name: category, count: 0, policies: [] }
      );
    });
  }, [rawData, country, selectedDate]);  // Added selectedDate to dependency array

  const totalActivePolicies = processedData.reduce(
    (sum, item) => sum + item.count,
    0
  );

  // Create refs for the chart container
  const chartRef = useRef<HTMLDivElement>(null);

  // D3 chart creation effect
  useEffect(() => {
    if (!chartRef.current || processedData.length === 0) return;

    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, left: 50, bottom: 100 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom+200)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(processedData.map((d) => d.name))
      .range([0, width])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, (d) => d.count) || 0])
      .nice()
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)").attr("font-size", "20px");

    svg.append("g").call(d3.axisLeft(y)).attr("font-size", "20px");;

    // Only append bars for items with count > 0
    svg
      .selectAll(".bar")
      .data(processedData.filter(d => d.count > 0)) // Filter out zero counts
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) || 0)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("fill", "steelblue");
      
    // Optional: Add text labels for category names if no data
    if (totalActivePolicies === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No active policies for selected date")
        .attr("fill", "#666")
        .attr("font-size", "16px");
    }
  }, [processedData, totalActivePolicies]);

  return (
    <div>
      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div ref={chartRef} className="w-full h-96"></div>
      )}
    </div>
  );
}