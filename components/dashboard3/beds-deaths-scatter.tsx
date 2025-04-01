"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import continentColorMap from "./continent-colour-map"

export default function HospitalBedsScatter() {
  const ref = useRef(null)
  

  useEffect(() => {
    fetch("http://localhost:5002/hospital_beds_vs_death_rate")
    .then((res) => res.json())
      .then((data: any[]) => {
        const margin = { top: 50, right: 30, bottom: 50, left: 70 }
        const width = 500 - margin.left - margin.right
        const height = 300 - margin.top - margin.bottom

        d3.select(ref.current).selectAll("svg").remove()

        const svg = d3
          .select(ref.current)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`)

        const filtered = data.filter(d => d.continent && d.avg_beds && d.avg_deaths)

        const x = d3
          .scaleLinear()
          .domain([0, d3.max(filtered, d => d.avg_beds)! * 1.1])
          .range([0, width])

        const y = d3
          .scaleLinear()
          .domain([0, d3.max(filtered, d => d.avg_deaths)! * 1.1])
          .range([height, 0])

        svg.selectAll("circle")
          .data(filtered)
          .enter()
          .append("circle")
          .attr("cx", d => x(d.avg_beds))
          .attr("cy", d => y(d.avg_deaths))
          .attr("r", 10)
          .attr("fill", d => continentColorMap[d.continent])
          .attr("opacity", 0.8)
          .on("mouseover", function (event, d) {
            d3.select("body").append("div")
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
                <strong>Avg. Total Deaths Per Million:</strong> ${d3.format(",")(d.avg_deaths)}<br/>
                <strong>Hospital Beds Per Thousand:</strong> ${d.avg_beds.toFixed(3)}`
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
          .text("Avg. Hospital Beds Per Thousand")

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -50)
          .attr("text-anchor", "middle")
          .text("Avg. Total Deaths Per Million")

        // Title
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", -20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("Hospital Beds vs Death Rate")
      })
  }, [])

  return <div ref={ref} />
}