import { BarChart2, RefreshCw, Search, Settings, Upload } from "lucide-react";
import Link from "next/link";
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
          <Link
            href="/settings/linkedin"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gladly-green transition-colors hover:text-gladly-green-hover focus:outline-none focus:ring-2 focus:ring-gladly-green focus:ring-offset-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <div className="h-8 w-8 rounded-full bg-gladly-green text-white text-xs font-medium flex items-center justify-center">
            DT
          </div>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LinkedIn Connections Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">141 connections · Data as of Apr 29, 2026</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh Connections
            </Button>
            <Button className="flex-1 sm:flex-none">
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
          <div className="flex flex-col items-stretch justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <Input
              aria-label="Search relationships"
              className="w-full sm:w-80"
              icon={<Search className="h-4 w-4" />}
              placeholder="Search by name, account, title, or location"
              rounded
            />
            <Button className="sm:flex-none" variant="secondary">
              <Upload className="h-4 w-4" />
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
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
        </div>
      </section>
    </main>
  );
}
