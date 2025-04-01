"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import continentColorMap from "./continent-colour-map"

interface ContinentPopulationBarProps {
  selectedRegion: string | null;
}

export default function HandwashingScatter({ selectedRegion }: ContinentPopulationBarProps) {
  const ref = useRef(null)

  d3.scaleOrdinal<string>()
  .domain(["Africa", "Asia", "Europe", "North America", "South America", "Oceania"])
  .range(["#60a5fa", "#f59e0b", "#10b981", "#ef4444", "#a855f7", "#6b7280"])


  useEffect(() => {
    fetch("http://localhost:5002/handwashing_facilities_vs_cases")
    .then((res) => res.json())
      .then((data: any[]) => {
        const margin = { top: 50, right: 30, bottom: 50, left: 70 }
        const width = 500 - margin.left - margin.right
        const height = 300 - margin.top - margin.bottom

        d3.select(ref.current).selectAll("svg").remove()

        //To adjust the plot sizes
        // const rScale = d3.scaleSqrt()
        //   .domain([0, d3.max(data, d => d.avg_total_cases_per_million)!])
        //   .range([6, 25])

        const svg = d3
          .select(ref.current)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`)

        const filteredData = data.filter((d) => d.continent && d.avg_handwashing_facilities && d.avg_total_cases_per_million)

        const x = d3
          .scaleLinear()
          .domain([0, d3.max(filteredData, (d) => d.avg_handwashing_facilities)! * 1.1])
          .range([0, width])

        const y = d3
          .scaleLinear()
          .domain([0, d3.max(filteredData, (d) => d.avg_total_cases_per_million)! * 1.1])
          .range([height, 0])

        svg
          .selectAll("circle")
          .data(filteredData)
          .enter()
          .append("circle")
          .attr("cx", (d) => x(d.avg_handwashing_facilities))
          .attr("cy", (d) => y(d.avg_total_cases_per_million))
          .attr("r", 10)
          .attr("fill", (d) => continentColorMap[d.continent])
          .attr("opacity", 0.8)
          .on("mouseover", function (event, d) {
            const tooltip = d3.select("body").append("div")
              .attr("class", "tooltip")
              .style("position", "absolute")
              .style("background", "white")
              .style("padding", "6px 10px")
              .style("border", "1px solid #ccc")
              .style("border-radius", "4px")
              .style("pointer-events", "none")
              .style("font-size", "14px")
              .html(
                `<strong>Continent:</strong> ${d.continent}<br/>
                <strong>Avg. Handwashing Facilities:</strong> ${d.avg_handwashing_facilities.toFixed(2)}<br/>
                <strong>Avg. Total Cases Per Million:</strong> ${d3.format(",")(d.avg_total_cases_per_million)}`
              )
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 40}px`)
          })
          .on("mouseout", () => {
            d3.select("body").selectAll(".tooltip").remove()
          })

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
        svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(",")))

        // Axis labels
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height + 40)
          .attr("text-anchor", "middle")
          .text("Avg. Handwashing Facilities")

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -50)
          .attr("text-anchor", "middle")
          .text("Avg. Total Cases Per Million")

        // Title
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", -20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("Handwashing Facilities vs Cases")
      })
  }, [])

  return <div ref={ref} />
}