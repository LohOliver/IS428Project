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
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

    const margin = { top: 50, right: 30, bottom: 50, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const graph = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m");
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

    svg
      .append("text")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(title);

    graph
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle");

    graph.append("g").call(yAxis);

    graph
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Month");

    graph
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("New Cases");

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

    const bisectDate = d3.bisector((d: { date: Date }) => d.date).left;

    if (policies) {
      policies.forEach((policy) => {
        const pDate = new Date(policy.effective_start_date);
        if (pDate < start || pDate > end) return;

        const index = bisectDate(newCasesData, pDate);
        const dataPoint = newCasesData[Math.min(index, newCasesData.length - 1)];
        const xPos = xScale(dataPoint.date);
        const yPos = yScale(dataPoint.cases);

        let effectivenessText = "";
        if (index > 0 && index < newCasesData.length) {
          const before = newCasesData[index - 1].cases;
          const after = newCasesData[index].cases;
          if (before > 0) {
            const drop = Math.round(((before - after) / before) * 100);
            effectivenessText = drop > 0 ? ` (↓${drop}%)` : "";
          }
        }

        graph
          .append("circle")
          .attr("cx", xPos)
          .attr("cy", yPos)
          .attr("r", 5)
          .attr("fill", "red")
          .on("mouseover", function (event) {
            if (tooltipRef.current) {
              const { clientX, clientY } = event;
              const formattedDate = d3.timeFormat("%a, %d %b %Y")(pDate);
              d3.select(tooltipRef.current)
                .style("opacity", 1)
                .style("left", `${clientX + 10}px`)
                .style("top", `${clientY - 10}px`)
                .html(
                  `<strong>${policy.policy_category}${effectivenessText}</strong><br/>
                   <em>${formattedDate}</em>`
                );
            }
          })
          .on("mouseout", function () {
            if (tooltipRef.current) {
              d3.select(tooltipRef.current).style("opacity", 0);
            }
          });
      });
    }
  }, [data, policies, location, startDate, endDate, title]);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={800} height={400}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          opacity: 0,
          pointerEvents: "none",
          backgroundColor: "white",
          border: "1px solid gray",
          padding: "5px",
          fontSize: "12px",
          zIndex: 1000,
          maxWidth: "220px",
          whiteSpace: "normal",
        }}
      ></div>
    </div>
  );
};

export default NewCasesGraph;
