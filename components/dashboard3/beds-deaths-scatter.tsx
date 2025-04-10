"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import continentColorMap from "./continent-colour-map";

interface ContinentPopulationBarProps {
  selectedRegion: string | null;
}

interface HospitalBedsDataPoint {
  continent: string;
  country: string;
  avg_beds: number;
  avg_deaths: number;
}

export default function HospitalBedsScatter({ selectedRegion }: ContinentPopulationBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HospitalBedsDataPoint[]>([]);

  useEffect(() => {
    fetch("https://is428project.onrender.com/hospital_beds_vs_death_rate")
      .then((res) => res.json())
      .then((fetched: HospitalBedsDataPoint[]) => setData(fetched));
  }, []);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const container = ref.current;

    const drawChart = () => {
      d3.select(container).selectAll("svg").remove();

      const boundingRect = container.getBoundingClientRect();
      const containerWidth = boundingRect.width;

      const margin = { top: 50, right: 30, bottom: 50, left: 70 };
      const width = containerWidth - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      const filteredData = selectedRegion === "All" || !selectedRegion
        ? data
        : data.filter((d) => d.continent === selectedRegion);

      const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, (d) => d.avg_beds)! * 1.1])
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, (d) => d.avg_deaths)! * 1.1])
        .range([height, 0]);

      const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      svg.selectAll("circle")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.avg_beds))
        .attr("cy", (d) => y(d.avg_deaths))
        .attr("r", 6)
        .attr("fill", (d) => continentColorMap[d.continent])
        .attr("opacity", 0.8)
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", 10)
            .style("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.5))");

          d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "6px 10px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("font-size", "14px")
            .html(`
              <strong>Country:</strong> ${d.country}<br/>
              <strong>Continent:</strong> ${d.continent}<br/>
              <strong>Avg. Total Deaths Per Million:</strong> ${d3.format(",")(d.avg_deaths)}<br/>
              <strong>Hospital Beds Per Thousand:</strong> ${d.avg_beds.toFixed(2)}
            `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 40}px`);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", 6)
            .style("filter", "none");

          d3.selectAll(".tooltip").remove();
        });

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(",")));

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Avg. Hospital Beds Per Thousand");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Avg. Total Deaths Per Million");

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Hospital Beds vs Death Rate");
    };

    drawChart();

    const resizeObserver = new ResizeObserver(() => {
      drawChart();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedRegion, data]);

  return <div ref={ref} className="w-full" />;
}
