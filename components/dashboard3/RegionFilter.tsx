"use client"

import React from "react";

interface RegionFilterProps {
  regions: string[];
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
}

const RegionFilter: React.FC<RegionFilterProps> = ({ regions, selectedRegion, onSelectRegion }) => {
  return (
    <div className="flex space-x-2 p-4">
      {regions.map((region) => (
        <button
          key={region}
          className={`px-4 py-2 rounded ${
            selectedRegion === region ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => onSelectRegion(region)}
        >
          {region}
        </button>
      ))}
      {/* Reset Filter Button */}
      <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={() => onSelectRegion(null)}>
        Reset
      </button>
    </div>
  );
};

export default RegionFilter;