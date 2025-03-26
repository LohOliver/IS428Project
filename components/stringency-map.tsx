import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

const OverviewMap = () => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch COVID data from the API endpoint
        const response = await fetch('http://localhost:5002/total_cases_by_country');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const covidCases = await response.json();
        
        // Remove non-country entries and zeros
        const filteredData = _.pickBy(covidCases, (value, key) => {
          return value > 0 && 
                 !['location', 'World', 'Asia', 'Europe', 'Africa', 'North America', 
                  'South America', 'Oceania', 'High-income countries', 
                  'Low-income countries', 'Lower-middle-income countries', 
                  'Upper-middle-income countries', 'European Union (27)'].includes(key);
        });
        
        createMap(filteredData);
      } catch (error) {
        console.error('Error fetching data from API:', error);
      }
    };
    
    fetchData();
  }, []);
  
  const createMap = (covidData) => {
    const width = 960;
    const height = 500;
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");
    
    // Create a group for the map
    const g = svg.append("g");
    
    // Create a color scale for the cases
    const maxCases = d3.max(Object.values(covidData)) || 100000000;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, Math.log(maxCases)]);
    
    // Create a projection and path generator
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);
    
    const pathGenerator = d3.geoPath().projection(projection);
    
    // Create a tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("opacity", 0);
    
    // Load world map data
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then(mapData => {
        // Draw the map
        g.selectAll("path")
          .data(mapData.features)
          .join("path")
          .attr("d", pathGenerator)
          .attr("fill", d => {
            const countryName = d.properties.name;
            // Try to match country names (this is a simplified approach)
            const cases = covidData[countryName] || 0;
            return cases > 0 ? colorScale(Math.log(cases)) : "#eee";
          })
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .on("mouseover", (event, d) => {
            const countryName = d.properties.name;
            const cases = covidData[countryName] || "No data";
            
            tooltip.transition()
              .duration(200)
              .style("opacity", 0.9);
            
            tooltip.html(`<strong>${countryName}</strong><br/>Cases: ${cases.toLocaleString()}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
          });
        
        // Add a legend
        const legendWidth = 300;
        const legendHeight = 10;
        const legendPosition = {x: width - legendWidth - 10, y: height - 30};
        
        const legendScale = d3.scaleLog()
          .domain([1000, maxCases])
          .range([0, legendWidth]);
        
        const legendAxis = d3.axisBottom(legendScale)
          .tickValues([1000, 10000, 100000, 1000000, 10000000, 100000000])
          .tickFormat(d => {
            if (d >= 1000000) return `${d/1000000}M`;
            if (d >= 1000) return `${d/1000}K`;
            return d;
          });
        
        const legend = svg.append("g")
          .attr("transform", `translate(${legendPosition.x}, ${legendPosition.y})`);
        
        // Create linear gradient for the legend
        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
          .attr("id", "legend-gradient")
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "100%")
          .attr("y2", "0%");
        
        // Add color stops
        const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
        stops.forEach(stop => {
          linearGradient.append("stop")
            .attr("offset", `${stop * 100}%`)
            .attr("stop-color", colorScale(Math.log(1000) + stop * (Math.log(maxCases) - Math.log(1000))));
        });
        
        // Draw the legend rectangle
        legend.append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#legend-gradient)");
        
        // Add the legend axis
        legend.append("g")
          .attr("transform", `translate(0, ${legendHeight})`)
          .call(legendAxis);
        
        // Add a title to the legend
        legend.append("text")
          .attr("x", 0)
          .attr("y", -5)
          .attr("text-anchor", "start")
          .style("font-size", "12px")
          .text("COVID-19 Total Cases");
        
        // Add a title to the map
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("font-size", "20px")
          .style("font-weight", "bold")
          .text("COVID-19 Total Cases by Country");
      })
      .catch(error => {
        console.error("Error loading the map data:", error);
      });
  };
  
  return (
    <div className="w-full p-4">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};

export default OverviewMap;