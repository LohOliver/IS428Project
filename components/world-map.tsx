"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Define interfaces
interface StringencyData {
  country: string;
  code: string;
  value: number;
  date?: string;
}

interface TimeSeriesData {
  [dateKey: string]: StringencyData[];
}

interface WorldMapProps {
  className?: string;
  onCountryClick: (countryName: string) => void;
  timeSeriesData: TimeSeriesData;
  availableDates: string[];
  maxStringency: number;
}

export function WorldMap({ 
  className, 
  onCountryClick, 
  timeSeriesData, 
  availableDates, 
  maxStringency 
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldGeoData, setWorldGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms between frames
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Load GeoJSON world data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        if (!response.ok) {
          throw new Error('Failed to fetch world geography data');
        }
        const data = await response.json();
        setWorldGeoData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading geo data:', error);
        setLoading(false);
      }
    };

    loadGeoData();
  }, []);

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Animation control - play/pause
  useEffect(() => {
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    // Start animation if playing
    if (isPlaying && availableDates.length > 0) {
      animationRef.current = setInterval(() => {
        setCurrentDateIndex(prev => {
          const nextIndex = (prev + 1) % availableDates.length;
          return nextIndex;
        });
      }, animationSpeed);
    }

    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, availableDates.length, animationSpeed]);

  // Create/update map when data changes
  useEffect(() => {
    if (!svgRef.current || !worldGeoData || !availableDates.length || Object.keys(timeSeriesData).length === 0) {
      return;
    }

    try {
      // Get current date data
      const currentDate = availableDates[currentDateIndex];
      const currentData = timeSeriesData[currentDate] || [];

      // Clear previous content
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Set up dimensions
      const width = svgRef.current.clientWidth || 800;
      const height = svgRef.current.clientHeight || 400;

      // Create projection
      const projection = d3.geoNaturalEarth1()
        .scale(width / 6)
        .translate([width / 2, height / 2]);

      const pathGenerator = d3.geoPath().projection(projection);

      // Create color scale
      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxStringency]);

      // Create tooltip
      const tooltip = d3.select(tooltipRef.current)
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('padding', '10px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('box-shadow', '0 4px 8px rgba(0,0,0,0.1)');

      // Function to find country data
      const getCountryData = (countryName: string): StringencyData | undefined => {
        if (!countryName || !currentData) return undefined;
        
        // Simple name matching
        return currentData.find(d => 
          d.country.toLowerCase() === countryName.toLowerCase() ||
          countryName.toLowerCase().includes(d.country.toLowerCase()) ||
          d.country.toLowerCase().includes(countryName.toLowerCase())
        );
      };

      // Draw countries
      svg.append('g')
        .selectAll('path')
        .data(worldGeoData.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator)
        .attr('fill', (d: any) => {
          const countryData = getCountryData(d.properties.name);
          return countryData ? colorScale(countryData.value) : '#e0e0e0';
        })
        .attr('stroke', '#808080')
        .attr('stroke-width', 0.5)
        .attr('class', 'country')
        .style('cursor', 'pointer')
        .on('mouseover', function(event: any, d: any) {
          d3.select(this)
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5);
            
          const countryData = getCountryData(d.properties.name);
          tooltip
            .style('visibility', 'visible')
            .html(`
              <strong>${d.properties.name}</strong><br/>
              Stringency: ${countryData ? countryData.value.toFixed(1) : 'No data'}
            `);
        })
        .on('mousemove', (event: any) => {
          tooltip
            .style('top', `${event.pageY - 10}px`)
            .style('left', `${event.pageX + 10}px`);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#808080')
            .attr('stroke-width', 0.5);
            
          tooltip.style('visibility', 'hidden');
        })
        .on('click', (event: any, d: any) => {
          onCountryClick(d.properties.name);
        });

      // Add legend
      const legendWidth = 200;
      const legendHeight = 15;
      const legendGroup = svg.append('g')
        .attr('transform', `translate(${width - legendWidth - 20}, ${height - 40})`);

      // Create gradient for legend
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'stringency-gradient')
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '0%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(0));

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(100));

      // Add legend rectangle
      legendGroup.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('fill', 'url(#stringency-gradient)');

      // Add legend labels
      legendGroup.append('text')
        .attr('x', 0)
        .attr('y', legendHeight + 15)
        .attr('font-size', '12px')
        .text('Low');

      legendGroup.append('text')
        .attr('x', legendWidth)
        .attr('y', legendHeight + 15)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .text('High');

      // Add title with current date
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .text(`COVID-19 Stringency Index: ${formatDate(currentDate)}`);

      // Add timeline
      if (availableDates.length > 1) {
        const timelineWidth = width * 0.7;
        const timelineHeight = 30;
        const timelineX = (width - timelineWidth) / 2;
        const timelineY = height - 60;
        
        // Add timeline background
        svg.append('rect')
          .attr('x', timelineX)
          .attr('y', timelineY)
          .attr('width', timelineWidth)
          .attr('height', timelineHeight)
          .attr('rx', 5)
          .attr('ry', 5)
          .attr('fill', '#f0f0f0')
          .attr('stroke', '#ccc')
          .attr('stroke-width', 1);
          
        // Add timeline markers
        const numberOfTicks = Math.min(12, availableDates.length);
        const tickInterval = Math.floor(availableDates.length / numberOfTicks);
        
        for (let i = 0; i < availableDates.length; i += tickInterval) {
          const x = timelineX + (i / (availableDates.length - 1)) * timelineWidth;
          
          svg.append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', timelineY + 5)
            .attr('y2', timelineY + timelineHeight - 5)
            .attr('stroke', '#999')
            .attr('stroke-width', 1);
            
          if (i % (tickInterval * 2) === 0 || i === 0 || i === availableDates.length - 1) {
            const date = new Date(availableDates[i]);
            const year = date.getFullYear();
            const month = date.toLocaleString('default', { month: 'short' });
            
            svg.append('text')
              .attr('x', x)
              .attr('y', timelineY + timelineHeight + 15)
              .attr('text-anchor', 'middle')
              .attr('font-size', '10px')
              .text(`${month} ${year}`);
          }
        }
        
        // Add timeline progress indicator
        const progressX = timelineX + (currentDateIndex / (availableDates.length - 1)) * timelineWidth;
        
        svg.append('circle')
          .attr('cx', progressX)
          .attr('cy', timelineY + timelineHeight / 2)
          .attr('r', 8)
          .attr('fill', '#3B82F6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      }

    } catch (error) {
      console.error('Error rendering map:', error);
    }
  }, [worldGeoData, timeSeriesData, availableDates, currentDateIndex, maxStringency, onCountryClick]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDateIndex(parseInt(e.target.value, 10));
    // Stop animation when manually changing
    setIsPlaying(false);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnimationSpeed(parseInt(e.target.value, 10));
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className || "h-full w-full"}`}>
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto"></div>
          <p>Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full">
      {/* Map container */}
      <div className="relative flex-grow">
        <svg 
          ref={svgRef} 
          className={className || "w-full h-full"}
          width="100%" 
          height="100%"
        />
        <div ref={tooltipRef} className="absolute" style={{ visibility: 'hidden' }} />
      </div>
      
      {/* Controls */}
      <div className="mt-4 px-4 py-3 flex items-center space-x-4 bg-gray-50 rounded-lg">
        {/* Play/pause button */}
        <button 
          onClick={togglePlayPause}
          className={`flex items-center justify-center w-10 h-10 rounded-full 
                    ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} 
                    text-white transition-colors`}
          aria-label={isPlaying ? "Pause animation" : "Play animation"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>
        
        {/* Current date display */}
        <div className="text-sm font-medium min-w-28">
          {availableDates.length > 0 ? formatDate(availableDates[currentDateIndex]) : "No data"}
        </div>
        
        {/* Timeline slider */}
        <div className="flex-grow">
          <input 
            type="range" 
            min="0" 
            max={availableDates.length - 1}
            value={currentDateIndex}
            onChange={handleSliderChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
          />
        </div>
        
        {/* Animation speed control */}
        <div className="flex items-center space-x-2">
          <label htmlFor="speed" className="text-sm text-gray-700">Speed:</label>
          <select 
            id="speed"
            value={animationSpeed}
            onChange={handleSpeedChange}
            className="text-sm border border-gray-300 rounded py-1 px-2"
          >
            <option value="2000">Slow</option>
            <option value="1000">Normal</option>
            <option value="500">Fast</option>
            <option value="250">Very Fast</option>
          </select>
        </div>
      </div>
    </div>
  );
}