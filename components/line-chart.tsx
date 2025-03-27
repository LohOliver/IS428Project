import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

const ContinentalCasesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5002/continents_new_cases_per_month');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    if (data && chartRef.current) {
      createChart();
    }
  }, [data]);
  
  const createChart = () => {
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    // Process data
    const processedData = [];
    Object.entries(data).forEach(([continent, monthlyData]) => {
      Object.entries(monthlyData).forEach(([dateStr, cases]) => {
        const [year, month] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1);
        
        processedData.push({
          date,
          continent,
          cases
        });
      });
    });
    
    // Sort data by date
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Set up dimensions
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get unique continents and dates
    const continents = Array.from(new Set(processedData.map(d => d.continent)));
    const dates = Array.from(new Set(processedData.map(d => d.date)))
      .sort((a, b) => a.getTime() - b.getTime());
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.date))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.cases)])
      .range([height, 0])
      .nice();
    
    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(continents)
      .range(d3.schemeCategory10);
    
    // Create line generator
    const lineGenerator = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.cases))
      .curve(d3.curveMonotoneX);
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .ticks(d3.timeMonth.every(3))
        .tickFormat(d => d3.timeFormat('%b %Y')(d)))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    // Add Y axis with formatted ticks (K for thousands, M for millions)
    svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(d => {
          if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
          if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
          return d;
        }));
    
    // Add axis labels
    svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 10)
      .text('Date');
    
    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 20)
      .text('New COVID-19 Cases');
    
    // Add title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('New COVID-19 Cases by Continent per Month');
    
    // Draw lines for each continent
    continents.forEach(continent => {
      const continentData = processedData.filter(d => d.continent === continent);
      
      // Only draw if there's data
      if (continentData.length > 0) {
        // Sort by date to ensure line is drawn correctly
        continentData.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        svg.append('path')
          .datum(continentData)
          .attr('fill', 'none')
          .attr('stroke', colorScale(continent))
          .attr('stroke-width', 2)
          .attr('d', lineGenerator);
        
        // Add label at the end of each line
        const lastPoint = continentData[continentData.length - 1];
        
        svg.append('text')
          .attr('x', xScale(lastPoint.date) + 5)
          .attr('y', yScale(lastPoint.cases))
          .attr('dy', '.35em')
          .style('font-size', '12px')
          .style('fill', colorScale(continent))
          .text(continent);
      }
    });
    
    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 100}, 0)`);
    
    continents.forEach((continent, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale(continent));
      
      legendRow.append('text')
        .attr('x', 15)
        .attr('y', 10)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .text(continent);
    });
  };
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">COVID-19 New Cases by Continent Dashboard</h1>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error: {error}</p>
        </div>
      )}
      
      {!loading && !error && (
        <div className="bg-white p-4 rounded shadow">
          <div ref={chartRef} className="w-full h-full" />
        </div>
      )}
      
      <div className="mt-4 text-gray-600 text-sm">
        <p>Data source: COVID-19 API - http://localhost:5002/continents_new_cases_per_month</p>
      </div>
    </div>
  );
};

export default ContinentalCasesDashboard;