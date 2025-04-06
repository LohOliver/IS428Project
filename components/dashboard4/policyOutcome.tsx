import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface CovidData {
  [key: string]: {
    [yearMonth: string]: number;
  };
}

interface StepGraphProps {
  location: string;
  startDate: string; // Format: YYYY-MM
  endDate: string; // Format: YYYY-MM
}

const StepGraph: React.FC<StepGraphProps> = ({
  location,
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<CovidData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch("https://is428project.onrender.com/cases_by_month_and_country")
      .then((res) => res.json())
      .then((fetchedData: CovidData) => setData(fetchedData))
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  useEffect(() => {
    if (!data || !location || !data[location]) return;

    const margin = { top: 20, right: 30, bottom: 50, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const graph = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use default values for startDate and endDate if they are null or undefined
    const parseDate = d3.timeParse("%Y-%m");
    const defaultStartDate = "2020-01"; // Default start date
    const defaultEndDate = "2023-12"; // Default end date

    const start = parseDate(startDate || defaultStartDate);
    const end = parseDate(endDate || defaultEndDate);

    const filteredDataset = Object.entries(data[location])
      .map(([date, cases]) => {
        const parsedDate = parseDate(date);
        return parsedDate ? { date: parsedDate, cases } : undefined; // Return `undefined` for invalid dates
      })
      .filter((d): d is { date: Date; cases: number } => {
        // Ensure start and end are valid dates and not null
        const isStartValid = start !== null && start !== undefined;
        const isEndValid = end !== null && end !== undefined;

        // Ensure all values are valid booleans and filter accordingly
        return (
          isStartValid &&
          isEndValid &&
          d !== undefined &&
          d.date >= start &&
          d.date <= end
        );
      });

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(filteredDataset, (d) => d.date) as [Date, Date]) // Safe since filteredDataset is guaranteed to have valid dates
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(filteredDataset, (d) => d.cases)!]) // Non-null assertion since `filteredDataset` should have cases
      .range([height, 0]);

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date))
      .ticks(6);

    const yAxis = d3.axisLeft(yScale);

    graph
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle");

    graph.append("g").call(yAxis);

    graph
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Month");

    graph
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Cases");

    const line = d3
      .line<{ date: Date; cases: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.cases))
      .curve(d3.curveStepAfter);

    graph
      .append("path")
      .datum(filteredDataset)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  }, [data, location, startDate, endDate]); // Added startDate and endDate as dependencies

  return <svg ref={svgRef} width={800} height={400}></svg>;
};

export default StepGraph;
