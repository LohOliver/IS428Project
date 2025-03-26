// First, let's update the CovidWorldMap component to accept a dataType prop

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

// Define the type for our country data
interface CountryData {
  [country: string]: number;
}

// Define the possible data types
export type CovidDataType = 'cases' | 'deaths' | 'recovered' | 'vaccinated';

interface CovidWorldMapProps {
  dataType?: CovidDataType;
}

const CovidWorldMap: React.FC<CovidWorldMapProps> = ({ dataType = 'cases' }) => {
  const [data, setData] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // API endpoints for different data types
  const endpoints = {
    cases: 'http://localhost:5002/total_cases_by_country',
    deaths: 'http://localhost:5002/total_deaths_by_country',
    recovered: 'http://localhost:5002/total_recovered_by_country',
    vaccinated: 'http://localhost:5002/total_vaccinated_by_country'
  };

  useEffect(() => {
    // Reset data when data type changes
    setLoading(true);
    setError(null);
    setData(null);
    
    // Fetch data from the appropriate API
    const fetchData = async () => {
      try {
        const response = await fetch(endpoints[dataType]);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (error) {
        setError(`Error fetching ${dataType} data: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [dataType]);

  // Listen for window resize to make the map responsive
  useEffect(() => {
    const handleResize = () => {
      if (data && svgRef.current) {
        createMap();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  useEffect(() => {
    if (data && svgRef.current) {
      createMap();
    }
  }, [data, svgRef]);

  const createMap = async () => {
    if (!svgRef.current || !data) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions based on container size
    const container = svgRef.current.parentElement;
    const width = container ? container.clientWidth : 960;
    const height = container ? container.clientHeight : 500;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    try {
      // Load world topology data
      const worldData: any = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      
      // Convert TopoJSON to GeoJSON
      const countries = feature(worldData, worldData.objects.countries);
      
      // Get country names from topology data
      const countryNames: { [id: string]: string } = {};
      worldData.objects.countries.geometries.forEach((d: any) => {
        countryNames[d.id] = d.properties.name;
      });

      // Create a mapping from country names in our data to country names in the GeoJSON
      const countryNameMap: { [key: string]: string } = {
        'United States': 'United States of America',
        'Russia': 'Russian Federation',
        'South Korea': 'Korea, Republic of',
        'Iran': 'Iran, Islamic Republic of',
        'United Kingdom': 'United Kingdom of Great Britain and Northern Ireland',
        // Add more mappings as needed
      };

      // Create a reverse mapping from GeoJSON names to our data names
      const reverseMap: { [key: string]: string } = {};
      Object.entries(countryNameMap).forEach(([ourName, geoName]) => {
        reverseMap[geoName] = ourName;
      });
      
      // Filter out regions and non-country entries
      const filteredData: CountryData = {};
      Object.entries(data).forEach(([country, value]) => {
        if (
          country !== 'World' && 
          country !== 'location' && 
          !['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].includes(country) &&
          !country.includes('income-countries') &&
          value !== 0
        ) {
          filteredData[country] = value;
        }
      });

      // Find the maximum value for the color scale
      const maxValue = Math.max(...Object.values(filteredData).filter(v => v > 0));
      
      // Create a color scale (log scale works better for this kind of data)
      const colorScale = d3.scaleLog()
        .domain([10, maxValue])
        .range(getColorRangeForDataType(dataType))
        .clamp(true);

      // Create a projection
      const projection = d3.geoNaturalEarth1()
        .fitSize([width, height], countries);

      // Create a path generator
      const path = d3.geoPath()
        .projection(projection);

      // Draw the map
      svg.selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', (d: any) => {
          // Try to find the country in our data
          const geoName = d.properties.name;
          const ourName = reverseMap[geoName] || geoName;
          
          const value = filteredData[ourName];
          
          // If we have data for this country, color it accordingly
          if (value && value > 0) {
            return colorScale(value);
          }
          // Otherwise, use a default color
          return '#ccc';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .attr('class', 'country')
        .on('mouseover', function(event, d: any) {
          // Show tooltip
          const geoName = d.properties.name;
          const ourName = reverseMap[geoName] || geoName;
          const value = filteredData[ourName];
          
          tooltip
            .style('opacity', 1)
            .html(`
              <strong>${ourName}</strong><br/>
              ${getDataTypeLabel(dataType)}: ${value ? value.toLocaleString() : 'No data'}
            `);
        })
        .on('mousemove', function(event) {
          // Position tooltip near mouse
          tooltip
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', function() {
          // Hide tooltip
          tooltip.style('opacity', 0);
        });

      // Add a legend
      const legendWidth = 300;
      const legendHeight = 10;

      // Create legend scales
      const legendScale = d3.scaleLog()
        .domain([10, maxValue])
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
        .tickValues(getTickValuesForDataType(dataType, maxValue))
        .tickFormat(d3.format('.0s'));

      // Create legend container
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - legendWidth - 40}, ${height - 50})`);

      // Create gradient for legend
      const defs = svg.append('defs');
      const linearGradient = defs.append('linearGradient')
        .attr('id', `legend-gradient-${dataType}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      const [startColor, endColor] = getColorRangeForDataType(dataType);
      linearGradient.selectAll('stop')
        .data([
          { offset: '0%', color: startColor },
          { offset: '100%', color: endColor }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

      // Draw colored rectangle for legend
      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#legend-gradient-${dataType})`);

      // Add axis to legend
      legend.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll('text')
        .style('font-size', '10px');

      // Add legend title
      legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text(`COVID-19 ${getDataTypeLabel(dataType)}`);
      
    } catch (error) {
      console.error('Error creating map:', error);
      setError(`Error creating map: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Helper function to get appropriate color range for each data type
  function getColorRangeForDataType(dataType: CovidDataType): [string, string] {
    switch (dataType) {
      case 'cases':
        return ['#ffeda0', '#f03b20']; // Yellow to red
      case 'deaths':
        return ['#fee5d9', '#a50f15']; // Light pink to dark red
      case 'recovered':
        return ['#edf8e9', '#31a354']; // Light green to dark green
      case 'vaccinated':
        return ['#eff3ff', '#3182bd']; // Light blue to dark blue
      default:
        return ['#ffeda0', '#f03b20']; // Default
    }
  }

  // Helper function to get appropriate label for each data type
  function getDataTypeLabel(dataType: CovidDataType): string {
    switch (dataType) {
      case 'cases':
        return 'Total Cases';
      case 'deaths':
        return 'Total Deaths';
      case 'recovered':
        return 'Total Recovered';
      case 'vaccinated':
        return 'Total Vaccinated';
      default:
        return 'Total Cases';
    }
  }

  // Helper function to get appropriate tick values for each data type
  function getTickValuesForDataType(dataType: CovidDataType, maxValue: number): number[] {
    if (maxValue <= 1000) {
      return [10, 100, 1000];
    }
    if (maxValue <= 10000) {
      return [10, 100, 1000, 10000];
    }
    if (maxValue <= 100000) {
      return [10, 100, 1000, 10000, 100000];
    }
    if (maxValue <= 1000000) {
      return [10, 100, 1000, 10000, 100000, 1000000];
    }
    if (maxValue <= 10000000) {
      return [10, 100, 1000, 10000, 100000, 1000000, 10000000];
    }
    return [10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000];
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Loading {dataType} data...</span>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 h-full flex items-center justify-center">
      <div>
        <p className="font-bold">Error loading data</p>
        <p>{error}</p>
      </div>
    </div>;
  }

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-full bg-gray-50"></svg>
        <div 
          ref={tooltipRef} 
          className="absolute bg-white p-2 rounded shadow-lg border border-gray-200 text-sm pointer-events-none opacity-0 transition-opacity"
          style={{ 
            left: 0, 
            top: 0, 
            zIndex: 10 
          }}
        ></div>
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        Data source: Local API
      </div>
    </div>
  );
};

export default CovidWorldMap;