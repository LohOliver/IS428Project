import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface CovidData {
  [key: string]: {
    [yearMonth: string]: number;
  };
}

interface PolicyData {
  effective_start_date: string;
  policy_category: string;
  policy_description: string;
  policy_law_name: string;
}

interface PolicyCount {
  date: Date;
  count: number;
  policies: PolicyData[];
}

interface NewCasesGraphProps {
  location: string;
  startDate: string;
  endDate: string;
  title?: string;
}

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

const NewCasesGraph: React.FC<NewCasesGraphProps> = ({
  location,
  startDate,
  endDate,
  title = `Monthly New COVID-19 Cases in ${location}`,
}) => {
  const [data, setData] = useState<CovidData | null>(null);
  const [policies, setPolicies] = useState<PolicyData[] | null>(null);
  const [selectedPolicyMonth, setSelectedPolicyMonth] = useState<PolicyCount | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const policyInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("https://is428project.onrender.com/cases_by_month_and_country")
      .then((res) => res.json())
      .then((fetchedData: CovidData) => {
        setData(fetchedData);
        console.log("Fetched COVID case data:", Object.keys(fetchedData));
      })
      .catch((err) => console.error("Error fetching case data:", err));
  }, []);

  useEffect(() => {
    const countryCode = countryNameToAlpha3[location] || location;
    const policyUrl = `https://is428project.onrender.com/policies/${countryCode}`;
    console.log("Fetching policies from:", policyUrl);

    fetch(policyUrl)
      .then((res) => res.json())
      .then((fetchedPolicies: PolicyData[]) => {
        setPolicies(fetchedPolicies);
        console.log("Fetched policy count:", fetchedPolicies.length);
      })
      .catch((err) => console.error("Error fetching policy data:", err));
  }, [location]);

  useEffect(() => {
    if (!data || !location || !data[location]) return;

    const margin = { top: 50, right: 80, bottom: 50, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const graph = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m");
    const formatYearMonth = d3.timeFormat("%Y-%m");
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return;

    const filteredDataset = Object.entries(data[location])
      .map(([date, cases]) => {
        const parsed = parseDate(date);
        return parsed ? { date: parsed, cases } : undefined;
      })
      .filter(
        (d): d is { date: Date; cases: number } =>
          d !== undefined && d.date >= start && d.date <= end
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const newCasesData = filteredDataset.map((d, i) =>
      i === 0
        ? { date: d.date, cases: d.cases }
        : { date: d.date, cases: d.cases - filteredDataset[i - 1].cases }
    );

    // Group policies by month
    const policyCountByMonth: Record<string, PolicyCount> = {};
    
    if (policies) {
      policies.forEach(policy => {
        const policyDate = new Date(policy.effective_start_date);
        if (policyDate < start || policyDate > end) return;
        
        // Format to YYYY-MM for grouping
        const yearMonth = formatYearMonth(policyDate);
        
        if (!policyCountByMonth[yearMonth]) {
          policyCountByMonth[yearMonth] = {
            date: new Date(policyDate.getFullYear(), policyDate.getMonth(), 1),
            count: 0,
            policies: []
          };
        }
        
        policyCountByMonth[yearMonth].count += 1;
        policyCountByMonth[yearMonth].policies.push(policy);
      });
    }
    
    const policyCounts = Object.values(policyCountByMonth).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(newCasesData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const maxNewCases = d3.max(newCasesData, (d) => d.cases) || 0;
    const yScale = d3.scaleLinear().domain([0, maxNewCases]).range([height, 0]);

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date))
      .ticks(6);

    const yAxis = d3.axisLeft(yScale);

    // Add title
    svg
      .append("text")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(title);

    // Add x-axis
    graph
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle");

    // Add y-axis for cases
    graph.append("g").call(yAxis);

    // Add x-axis label
    graph
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Month");

    // Add y-axis label for cases
    graph
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("New Cases");

    // Add line for new cases
    const line = d3
      .line<{ date: Date; cases: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.cases))
      .curve(d3.curveMonotoneX);

    graph
      .append("path")
      .datum(newCasesData)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${margin.left + width - 100}, ${margin.top + 10})`);
    
    legend
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", "orange")
      .attr("stroke-width", 2);
    
    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("New Cases")
      .style("font-size", "12px");
    
    legend
      .append("circle")
      .attr("cx", 10)
      .attr("cy", 20)
      .attr("r", 5)
      .attr("fill", "red");
    
    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 25)
      .text("Policy Implemented")
      .style("font-size", "12px");

    // Add circles for policy counts directly on the line chart
    if (policyCounts.length > 0) {
      policyCounts.forEach(policyMonth => {
        const xPos = xScale(policyMonth.date);
        
        // Find the corresponding case value for this month
        const caseDataPoint = newCasesData.find(d => 
          d.date.getMonth() === policyMonth.date.getMonth() && 
          d.date.getFullYear() === policyMonth.date.getFullYear()
        );
        
        // Only place dot if we have case data for this month
        if (caseDataPoint) {
          const yPos = yScale(caseDataPoint.cases);
          
          // Use a fixed size for the dots
          const radius = 5;
          
          graph
            .append("circle")
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("r", radius)
            .attr("fill", "red")
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("click", function () {
              setSelectedPolicyMonth(policyMonth);
            });
        }
      });
    }
  }, [data, policies, location, startDate, endDate, title]);

  // Function to render policy details when a dot is clicked
  const renderPolicyDetails = () => {
    if (!selectedPolicyMonth) return null;
    
    const formattedDate = d3.timeFormat("%B %Y")(selectedPolicyMonth.date);
    
    return (
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
          maxHeight: "500px",
          overflowY: "auto",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
        }}
      >
        <h3 style={{ 
          marginTop: 0, 

          paddingBottom: "10px",
          color: "#2c3e50",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>
            <span style={{ fontSize: "1.3rem" }}>{formattedDate}</span>: 
            <span style={{ 
              backgroundColor: "#e74c3c", 
              color: "white", 
              padding: "3px 8px", 
              borderRadius: "4px",
              fontSize: "0.9rem",
              marginLeft: "10px"
            }}>
              {selectedPolicyMonth.count} Policies
            </span>
          </span>
        </h3>
        <button 
          onClick={() => setSelectedPolicyMonth(null)}
          style={{
            position: "absolute",
            right: "20px",
            top: "20px",
            background: "#f8f9fa",
            border: "1px solid #ddd",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "16px",
            cursor: "pointer",
            color: "#666",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
        >
          ✕
        </button>
        <ul style={{ paddingLeft: "0", listStyleType: "none" }}>
          {selectedPolicyMonth.policies.map((policy, index) => (
            <li key={index} style={{ 
                marginBottom: "20px", 
                borderBottom: index < selectedPolicyMonth.policies.length - 1 ? "1px solid #eee" : "none",
                paddingBottom: "15px" 
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ 
                  backgroundColor: "#e74c3c", 
                  color: "white", 
                  padding: "3px 8px", 
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: "bold" 
                }}>
                  {policy.policy_category}
                </span>
                <small style={{ color: "#666" }}>
                  Effective: {new Date(policy.effective_start_date).toLocaleDateString()}
                </small>
              </div>
              
              <h4 style={{ 
                margin: "10px 0", 
                color: "#2c3e50", 
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}>
                {policy.policy_law_name}
              </h4>
              
              <p style={{ 
                margin: "8px 0", 
                lineHeight: "1.5",
                color: "#333",
                textAlign: "justify",
                fontSize: "0.95rem",
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #eaeaea"
              }}>
                {policy.policy_description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={800} height={400}></svg>
      <div ref={policyInfoRef}>
        {selectedPolicyMonth && renderPolicyDetails()}
      </div>
    </div>
  );
};

export default NewCasesGraph;