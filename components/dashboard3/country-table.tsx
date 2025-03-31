"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import type { CountryData } from "@/lib/types"
import { ChevronDown, ChevronUp, Search } from "lucide-react"

interface CountryTableProps {
  countries: CountryData[]
  onCountrySelect: (countryCode: string) => void
  selectedCountry: string | null
}

export default function CountryTable({ countries, onCountrySelect, selectedCountry }: CountryTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CountryData
    direction: "ascending" | "descending"
  }>({
    key: "cases",
    direction: "descending",
  })

  // Filter countries based on search term
  const filteredCountries = countries.filter((country) => country.name.toLowerCase().includes(searchTerm.toLowerCase()))

  // Sort countries based on sort config
  const sortedCountries = [...filteredCountries].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? -1 : 1
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? 1 : -1
    }
    return 0
  })

  // Request sort
  const requestSort = (key: keyof CountryData) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Format numbers for display
  const formatNumber = (value: number) => {
    return value.toLocaleString()
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <button className="flex items-center" onClick={() => requestSort("name")}>
                  Country
                  {sortConfig.key === "name" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center" onClick={() => requestSort("cases")}>
                  Cases
                  {sortConfig.key === "cases" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center" onClick={() => requestSort("deaths")}>
                  Deaths
                  {sortConfig.key === "deaths" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center" onClick={() => requestSort("recovered")}>
                  Recovered
                  {sortConfig.key === "recovered" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center" onClick={() => requestSort("vaccinated")}>
                  Vaccinated
                  {sortConfig.key === "vaccinated" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCountries.length > 0 ? (
              sortedCountries.map((country) => (
                <TableRow
                  key={country.code}
                  className={`cursor-pointer ${country.code === selectedCountry ? "bg-muted" : ""}`}
                  onClick={() => onCountrySelect(country.code)}
                >
                  <TableCell className="font-medium">{country.name}</TableCell>
                  <TableCell>{formatNumber(country.cases)}</TableCell>
                  <TableCell>{formatNumber(country.deaths)}</TableCell>
                  <TableCell>{formatNumber(country.recovered)}</TableCell>
                  <TableCell>{formatNumber(country.vaccinated)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No countries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

