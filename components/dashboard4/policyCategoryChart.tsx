import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { CATEGORY_COLORS } from '../ui/sharedColorMap';

// instead of importing from an external JSON file
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
  Bahamas: "BHS",
  Bahrain: "BHR",
  Bangladesh: "BGD",
  Barbados: "BRB",
  Belarus: "BLR",
  Belgium: "BEL",
  Belize: "BLZ",
  Benin: "BEN",
  Bhutan: "BTN",
  Bolivia: "BOL",
  "Bosnia and Herzegovina": "BIH",
  Botswana: "BWA",
  Brazil: "BRA",
  Brunei: "BRN",
  Bulgaria: "BGR",
  "Burkina Faso": "BFA",
  Burundi: "BDI",
  Cambodia: "KHM",
  Cameroon: "CMR",
  Canada: "CAN",
  "Cape Verde": "CPV",
  "Central African Republic": "CAF",
  Chad: "TCD",
  Chile: "CHL",
  China: "CHN",
  Colombia: "COL",
  Comoros: "COM",
  Congo: "COG",
  "Costa Rica": "CRI",
  Croatia: "HRV",
  Cuba: "CUB",
  Cyprus: "CYP",
  "Czech Republic": "CZE",
  Denmark: "DNK",
  Djibouti: "DJI",
  Dominica: "DMA",
  "Dominican Republic": "DOM",
  Ecuador: "ECU",
  Egypt: "EGY",
  "El Salvador": "SLV",
  "Equatorial Guinea": "GNQ",
  Eritrea: "ERI",
  Estonia: "EST",
  Eswatini: "SWZ",
  Ethiopia: "ETH",
  Fiji: "FJI",
  Finland: "FIN",
  France: "FRA",
  Gabon: "GAB",
  Gambia: "GMB",
  Georgia: "GEO",
  Germany: "DEU",
  Ghana: "GHA",
  Greece: "GRC",
  Grenada: "GRD",
  Guatemala: "GTM",
  Guinea: "GIN",
  "Guinea-Bissau": "GNB",
  Guyana: "GUY",
  Haiti: "HTI",
  Honduras: "HND",
  Hungary: "HUN",
  Iceland: "ISL",
  India: "IND",
  Indonesia: "IDN",
  Iran: "IRN",
  Iraq: "IRQ",
  Ireland: "IRL",
  Israel: "ISR",
  Italy: "ITA",
  Jamaica: "JAM",
  Japan: "JPN",
  Jordan: "JOR",
  Kazakhstan: "KAZ",
  Kenya: "KEN",
  Kiribati: "KIR",
  Kuwait: "KWT",
  Kyrgyzstan: "KGZ",
  Laos: "LAO",
  Latvia: "LVA",
  Lebanon: "LBN",
  Lesotho: "LSO",
  Liberia: "LBR",
  Libya: "LBY",
  Liechtenstein: "LIE",
  Lithuania: "LTU",
  Luxembourg: "LUX",
  Madagascar: "MDG",
  Malawi: "MWI",
  Malaysia: "MYS",
  Maldives: "MDV",
  Mali: "MLI",
  Malta: "MLT",
  Mauritania: "MRT",
  Mauritius: "MUS",
  Mexico: "MEX",
  Moldova: "MDA",
  Monaco: "MCO",
  Mongolia: "MNG",
  Montenegro: "MNE",
  Morocco: "MAR",
  Mozambique: "MOZ",
  Myanmar: "MMR",
  Namibia: "NAM",
  Nepal: "NPL",
  Netherlands: "NLD",
  "New Zealand": "NZL",
  Nicaragua: "NIC",
  Niger: "NER",
  Nigeria: "NGA",
  "North Korea": "PRK",
  "North Macedonia": "MKD",
  Norway: "NOR",
  Oman: "OMN",
  Pakistan: "PAK",
  Palau: "PLW",
  Panama: "PAN",
  "Papua New Guinea": "PNG",
  Paraguay: "PRY",
  Peru: "PER",
  Philippines: "PHL",
  Poland: "POL",
  Portugal: "PRT",
  Qatar: "QAT",
  Romania: "ROU",
  Russia: "RUS",
  Rwanda: "RWA",
  "Saudi Arabia": "SAU",
  Senegal: "SEN",
  Serbia: "SRB",
  Singapore: "SGP",
  Slovakia: "SVK",
  Slovenia: "SVN",
  "Solomon Islands": "SLB",
  "South Africa": "ZAF",
  "South Korea": "KOR",
  Spain: "ESP",
  "Sri Lanka": "LKA",
  Sudan: "SDN",
  Suriname: "SUR",
  Sweden: "SWE",
  Switzerland: "CHE",
  Syria: "SYR",
  Taiwan: "TWN",
  Tajikistan: "TJK",
  Tanzania: "TZA",
  Thailand: "THA",
  Togo: "TGO",
  Tonga: "TON",
  "Trinidad and Tobago": "TTO",
  Tunisia: "TUN",
  Turkey: "TUR",
  Turkmenistan: "TKM",
  Uganda: "UGA",
  Ukraine: "UKR",
  "United Arab Emirates": "ARE",
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
        const countryCode = countryNameToAlpha3[location] || location;
        const response = await fetch(`https://is428project.onrender.com/policy_category_count/${countryCode}`);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error("Error fetching policy category data:", error);
        setData([]);
      }
    };

    fetchPolicyCategoryData();
  }, [location]);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = 400;
    const height = 400;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3
      .pie<PolicyCategoryData>()
      .value((d) => d.policy_count)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<PolicyCategoryData>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = svg.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => CATEGORY_COLORS[d.data.policy_category] || "#ccc")
      .attr("stroke", "white")
      .attr("stroke-width", "2px");
  }, [data]);

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Policy Categories for {location}</h2>
      <div className="flex items-center justify-center">
        {data.length > 0 ? (
          <div className="flex items-center">
            <svg ref={svgRef}></svg>
            <div className="ml-4">
              {data.map((item) => (
                <div key={item.policy_category} className="flex items-center mb-2">
                  <div
                    className="w-4 h-4 mr-2"
                    style={{
                      backgroundColor: CATEGORY_COLORS[item.policy_category] || "#ccc",
                    }}
                  ></div>
                  <span>
                    {item.policy_category} ({item.policy_count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No policy data available for {location}</p>
        )}
      </div>
    </div>
  );
};

export default PolicyCategoryPieChart;