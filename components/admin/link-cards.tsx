import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LinkCardItem {
  href: string;
  title: string;
  description?: string;
}

interface AdminLinkCardsProps {
  items: LinkCardItem[];
  columns?: "2" | "3";
}

function AdminLinkCards({ items, columns = "3" }: AdminLinkCardsProps) {
  return (
    <div
      className={
        columns === "2"
          ? "grid gap-4 md:grid-cols-2"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="group">
          <Card className="h-full transition-colors group-hover:border-primary/50 pb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {item.title}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
              {item.description ? (
                <CardDescription>{item.description}</CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export { AdminLinkCards };
