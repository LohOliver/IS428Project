"use client";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface CategoryData {
  category: string;
  count: number;
}

interface CountryOption {
  name: string;
  iso: string;
}

export default function PolicyCategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (countryIso?: string) => {
    setLoading(true);
    setError(null);

    let url = "http://127.0.0.1:5002/policy_category_distribution";
    if (countryIso) {
      url += `?country=${encodeURIComponent(countryIso)}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      const json: CategoryData[] = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching policy category data", err);
      setError("Failed to load category data. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5002/all_policies");
      if (!res.ok) throw new Error("Failed to fetch countries");

      const raw = await res.json();
      const seen = new Set();
      const uniqueCountries: CountryOption[] = raw
        .map((d: any) => ({
          name: `${d.country} (${d.policy_name?.slice(0, 3) || "ISO"})`, // Optional label
          iso: d.country,
        }))
        .filter((d: CountryOption) => {
          if (seen.has(d.iso)) return false;
          seen.add(d.iso);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setCountries(uniqueCountries);
    } catch (err) {
      console.error("Error fetching countries", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCountries();
  }, []);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const iso = e.target.value;
    setSelectedCountry(iso);
    fetchData(iso || undefined);
  };

  const COLORS = [
    "#8884d8", "#8dd1e1", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c",
    "#d0ed57", "#ffbb28", "#ff8042", "#00C49F", "#FF69B4", "#BA55D3",
  ];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Policy Category Distribution</h2>
          <select
            value={selectedCountry || ""}
            onChange={handleCountryChange}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Global</option>
            {countries.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading chart...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available for this country.
            </div>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  label
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
