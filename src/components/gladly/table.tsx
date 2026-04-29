export function Table({ className = "", ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={["w-full", className].join(" ")} {...props} />;
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={["divide-y divide-gray-200 bg-white", className].join(" ")} {...props} />;
}

export function TableRow({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={["hover:bg-gray-50", className].join(" ")} {...props} />;
}

export function TableHead({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={["bg-gladly-park-light px-4 py-3 text-left text-sm font-medium text-gray-700", className].join(" ")}
      {...props}
    />
  );
}

export function TableCell({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={["px-4 py-3 text-sm text-gray-700", className].join(" ")} {...props} />;
}
