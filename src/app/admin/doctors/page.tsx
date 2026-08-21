import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Shield, Stethoscope, UserCheck } from "lucide-react";

export default function AdminDoctorsPage() {
  const doctors = [
    {
      name: "Dr. Sarah Jenkins",
      email: "sarah.jenkins@medtrack.pro",
      specialization: "Cardiology",
      slotDuration: "30 mins",
      status: "Active",
    },
    {
      name: "Dr. Marcus Chen",
      email: "marcus.chen@medtrack.pro",
      specialization: "Neurology",
      slotDuration: "45 mins",
      status: "Active",
    },
    {
      name: "Dr. Priya Patel",
      email: "priya.patel@medtrack.pro",
      specialization: "Pediatrics",
      slotDuration: "30 mins",
      status: "Active",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Management</h1>
          <p className="text-sm text-muted-foreground">
            View active medical practitioners, adjust consultation durations, and oversee clinic staffing.
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registered Practitioners</CardTitle>
          <CardDescription>All certified physicians in MedTrack Pro</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Slot Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <TableRow key={doc.email}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.specialization}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{doc.email}</TableCell>
                  <TableCell className="font-mono text-xs">{doc.slotDuration}</TableCell>
                  <TableCell>
                    <Badge variant="success">{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
