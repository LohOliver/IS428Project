import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Country name to alpha-3 code mapping
const countryNameToAlpha3: Record<string, string> = {
  Afghanistan: "AFG",
  Albania: "ALB",
  Algeria: "DZA",
  Andorra: "AND",
  Angola: "AGO",
  Argentina: "ARG",
  Armenia: "ARM",
  Australia: "AUS",
  Austria: "AUT",
  Azerbaijan: "AZE",
  // ... rest of the mapping (truncated for brevity)
  "United Kingdom": "GBR",
  "United States": "USA",
  Uruguay: "URY",
  Uzbekistan: "UZB",
  Vanuatu: "VUT",
  "Vatican City": "VAT",
  Venezuela: "VEN",
  Vietnam: "VNM",
  Yemen: "YEM",
  Zambia: "ZMB",
  Zimbabwe: "ZWE",
  Singapore: "SGP", // Ensuring Singapore is definitely included
};

interface PolicyCategoryData {
  policy_category: string;
  policy_count: number;
}

interface PolicyCategoryPieChartProps {
  location: string;
}

const PolicyCategoryPieChart: React.FC<PolicyCategoryPieChartProps> = ({ location }) => {
  const [data, setData] = useState<PolicyCategoryData[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const fetchPolicyCategoryData = async () => {
      try {
        // Convert location to alpha-3 code if mapping exists, otherwise use original location
        const countryCode = countryNameToAlpha3[location] || location;
        
        const response = await fetch(`https://is428project.onrender.com/policy_category_count/${countryCode}`);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching policy category data:', error);
        setData([]); // Ensure data is reset on error
      }
    };

    fetchPolicyCategoryData();
  }, [location]);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const width = 400;
    const height = 400;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Pie generator
    const pie = d3.pie<PolicyCategoryData>()
      .value(d => d.policy_count)
      .sort(null);

    // Arc generator
    const arc = d3.arc<d3.PieArcDatum<PolicyCategoryData>>()
      .innerRadius(0)
      .outerRadius(radius);

    // Create pie chart
    const arcs = svg.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw arcs
    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i.toString()))
      .attr("stroke", "white")
      .attr("stroke-width", "2px");

    // Add labels
    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text(d => `${d.data.policy_category}\n(${d.data.policy_count})`);

    // Add legend
    const legend = svg.selectAll(".legend")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${width/2 + 50}, ${-height/2 + 20 + i * 20})`);

    legend.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", (d, i) => color(i.toString()));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("font-size", "12px")
      .text(d => `${d.data.policy_category} (${d.data.policy_count})`);

  }, [data]);

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Policy Categories for {location}</h2>
      <div className="flex justify-center items-center">
        {data.length > 0 ? (
          <svg ref={svgRef}></svg>
        ) : (
          <p className="text-gray-500">No policy data available for {location}</p>
        )}
      </div>
    </div>
  );
};

export default PolicyCategoryPieChart;