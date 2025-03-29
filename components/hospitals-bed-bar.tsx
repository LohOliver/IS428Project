"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import continentColorMap from "./continent-colour-map"

export default function HospitalBedsBar() {
  const ref = useRef(null)

  useEffect(() => {
    fetch("http://localhost:5002/avg_hospital_beds_by_continent")
      .then((res) => res.json())
      .then((rawData) => {
        const data = Object.entries(rawData)
          .filter(([continent]) => continent !== "")
          .map(([continent, beds]) => ({
            continent,
            beds: Number(beds) || 0,
          }))

        const margin = { top: 40, right: 20, bottom: 40, left: 95 }
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

        const y = d3
          .scaleBand()
          .domain(data.map((d) => d.continent))
          .range([0, height])
          .padding(0.2)

        const x = d3
          .scaleLinear()
          .domain([0, d3.max(data, (d) => d.beds)!])
          .range([0, width])

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
            const tooltip = d3.select(ref.current).append("div")
              .attr("class", "tooltip")
              .style("position", "absolute")
              .style("background", "white")
              .style("padding", "4px 8px")
              .style("border", "1px solid #ccc")
              .style("border-radius", "4px")
              .style("pointer-events", "none")
              .html(`<strong>Continent:</strong> ${d.continent}<br/><strong>Avg. Hospital Beds Per Thousand:</strong> ${d.beds.toFixed(3)}`)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY - 28}px`)
          })
          .on("mouseout", () => {
            d3.select(ref.current).selectAll(".tooltip").remove()
          })

        svg.append("g").call(d3.axisLeft(y))
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))

        //Title
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", -10)
          .attr("text-anchor", "middle")
          .attr("font-size", "18px")
          .attr("font-weight", "bold")
          .text("Avg Hospital Beds by Continent")

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height + 35)
          .attr("text-anchor", "middle")
          .text("Avg. Hospital Beds Per Thousand")
        
        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -80)
          .attr("text-anchor", "middle")
          .text("Continent")
      })
  }, [])

  return <div ref={ref} />
}