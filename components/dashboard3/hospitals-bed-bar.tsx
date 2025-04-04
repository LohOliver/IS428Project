"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import continentColorMap from "./continent-colour-map";

interface HospitalBedDataPoint {
  continent: string;
  beds: number;
}

export default function HospitalBedsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HospitalBedDataPoint[]>([]);

  useEffect(() => {
    fetch("https://is428project.onrender.com/avg_hospital_beds_by_continent")
      .then((res) => res.json())
      .then((rawData) => {
        const processed: HospitalBedDataPoint[] = Object.entries(rawData)
          .filter(([continent]) => continent !== "")
          .map(([continent, countries]) => {
            const values = Object.values(countries as Record<string, number>).filter((v) => typeof v === "number");
            const avg = d3.mean(values) ?? 0;
            return { continent, beds: avg };
          });
        setData(processed);
      });
  }, []);

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const container = ref.current;
    const margin = { top: 40, right: 20, bottom: 40, left: 95 };
    let svg: d3.Selection<SVGGElement, unknown, null, undefined>;

    const drawChart = () => {
      const containerWidth = container.getBoundingClientRect().width;
      const width = containerWidth - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      d3.select(container).selectAll("svg").remove();

      svg = d3
        .select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const y = d3
        .scaleBand()
        .domain(data.map((d) => d.continent))
        .range([0, height])
        .padding(0.2);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.beds)!])
        .range([0, width]);

      svg
        .selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", (d) => y(d.continent)!)
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", (d) => x(d.beds))
        .attr("fill", (d) => continentColorMap[d.continent])
        .on("mouseover", function (event, d) {
          d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "4px 8px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .html(
              `<strong>Continent:</strong> ${d.continent}<br/>
               <strong>Avg. Hospital Beds Per Thousand:</strong> ${d.beds.toFixed(2)}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          d3.select("body").selectAll(".tooltip").remove();
        });

      svg.append("g").call(d3.axisLeft(y));
      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Avg Hospital Beds by Continent");

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .text("Avg. Hospital Beds Per Thousand");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -80)
        .attr("text-anchor", "middle")
        .text("Continent");
    };

    drawChart();

    const resizeObserver = new ResizeObserver(() => {
      drawChart();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  return <div ref={ref} className="w-full" />;
}
