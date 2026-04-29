import { BarChart2, RefreshCw, Search, Settings, Upload } from "lucide-react";
import { Badge } from "@/components/gladly/badge";
import { Button } from "@/components/gladly/button";
import { Input } from "@/components/gladly/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/gladly/table";

const buckets = [
  { label: "Total", value: "141" },
  { label: "Fresh", value: "4" },
  { label: "Warm", value: "57" },
  { label: "Cooling", value: "35" },
  { label: "Stale", value: "35" },
  { label: "No Activity", value: "10" }
];

const rows = [
  {
    name: "LauraLee Hall",
    account: "Example Brand",
    title: "Director, Global Guest Experience",
    stage: "DM Sent / No Reply",
    bucket: "Warm"
  },
  {
    name: "Jane Smith",
    account: "2K Games",
    title: "VP Customer Experience",
    stage: "Replied",
    bucket: "Fresh"
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gladly-page">
      <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gladly-green flex items-center justify-center text-white font-bold">
            +
          </div>
          <span className="text-xl font-semibold text-gray-900">Gladly</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <div className="h-8 w-8 rounded-full bg-gladly-green text-white text-xs font-medium flex items-center justify-center">
            DT
          </div>
        </div>
      </header>

      <section className="px-10 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LinkedIn Connections Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">141 connections · Data as of Apr 29, 2026</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh Connections
            </Button>
            <Button>
              <BarChart2 className="h-4 w-4" />
              Refresh Activity
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">{bucket.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{bucket.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <Input
              aria-label="Search relationships"
              className="w-80"
              icon={<Search className="h-4 w-4" />}
              placeholder="Search by name, account, title, or location"
              rounded
            />
            <Button variant="secondary">
              <Upload className="h-4 w-4" />
              Export
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Freshness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
                  <TableCell>{row.account}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.stage}</TableCell>
                  <TableCell>
                    <Badge variant={row.bucket === "Fresh" ? "active" : "neutral"}>{row.bucket}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
