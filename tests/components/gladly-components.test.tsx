import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/gladly/badge";
import { Button } from "@/components/gladly/button";
import { Input } from "@/components/gladly/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/gladly/table";

describe("Gladly UI primitives", () => {
  it("renders button variants with accessible labels", () => {
    render(
      <div>
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary action</Button>
        <Button disabled>Disabled action</Button>
      </div>
    );

    expect(screen.getByRole("button", { name: "Primary action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Secondary action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Disabled action" })).toBeDisabled();
  });

  it("renders a rounded search input with a label", () => {
    render(<Input aria-label="Search relationships" placeholder="Search" rounded />);

    expect(screen.getByLabelText("Search relationships")).toHaveAttribute("placeholder", "Search");
  });

  it("preserves semantic table markup", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>LauraLee Hall</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "LauraLee Hall" })).toBeInTheDocument();
  });

  it("renders badge text", () => {
    render(<Badge variant="active">Fresh</Badge>);

    expect(screen.getByText("Fresh")).toBeInTheDocument();
  });
});
