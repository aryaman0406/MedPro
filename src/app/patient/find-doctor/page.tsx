import Link from "next/link";
import { Clock, Search, Stethoscope, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function FindDoctorPage() {
  const doctors = [
    {
      id: "doc-1",
      name: "Dr. Sarah Jenkins",
      specialization: "Cardiology",
      bio: "Board-certified Cardiologist with 12+ years of clinical experience specializing in preventive cardiology and heart rhythm disorders.",
      slotDuration: "30 mins",
      hours: "Mon-Fri (09:00 - 17:00)",
    },
    {
      id: "doc-2",
      name: "Dr. Marcus Chen",
      specialization: "Neurology",
      bio: "Senior Neurologist focusing on neurovascular care, migraine therapy, cognitive health, and modern neurological diagnostics.",
      slotDuration: "45 mins",
      hours: "Mon-Fri (08:00 - 16:00)",
    },
    {
      id: "doc-3",
      name: "Dr. Priya Patel",
      specialization: "Pediatrics",
      bio: "Compassionate Pediatric Specialist dedicated to early childhood wellness, developmental assessments, and comprehensive pediatric care.",
      slotDuration: "30 mins",
      hours: "Mon-Sat (10:00 - 18:00)",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-sm text-muted-foreground">
          Browse certified medical practitioners and schedule your next visit.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by doctor name or medical specialization..." className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <Card key={doc.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{doc.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{doc.specialization}</Badge>
                </div>
                <Badge variant="success">Available</Badge>
              </div>
              <CardDescription className="pt-2 text-xs line-clamp-3">
                {doc.bio}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span>Slot Duration:</span>
                  <span className="font-mono text-foreground">{doc.slotDuration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hours:</span>
                  <span className="text-foreground">{doc.hours}</span>
                </div>
              </div>
              <Button className="w-full" size="sm">
                Book Consultation
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
