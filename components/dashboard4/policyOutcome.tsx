import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface CovidData {
  [key: string]: {
    [yearMonth: string]: number;
  };
}

interface StepGraphProps {
  location: string;
}

const StepGraph: React.FC<StepGraphProps> = ({ location }) => {
  const [data, setData] = useState<CovidData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch("http://localhost:5002/cases_by_month_and_country")
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

    const dataset = Object.entries(data[location]).map(([date, cases]) => ({
      date: d3.timeParse("%Y-%m")(date)!,
      cases,
    }));

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataset, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(dataset, (d) => d.cases)!])
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
      .datum(dataset)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  }, [data, location]);

  return <svg ref={svgRef} width={800} height={400}></svg>;
};

export default StepGraph;
