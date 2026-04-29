"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Chart({
  apiByDay, sessionsByDay, topKeywords,
}: {
  apiByDay: { date: string; count: number }[];
  sessionsByDay: { date: string; count: number }[];
  topKeywords: { token: string; count: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">API Calls (14d)</CardTitle></CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={apiByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Sessions (14d)</CardTitle></CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={sessionsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Top JD Keywords</CardTitle></CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={topKeywords} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="token" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
