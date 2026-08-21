import Link from "next/link";
import { Activity, Heart, Shield, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-12 text-sm text-muted-foreground">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base">MedTrack Pro</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Intelligent healthcare appointment scheduling, pre-visit AI synthesis, and patient follow-up management.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online & Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">Patient Portal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-foreground transition-colors">Book an Appointment</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Find Specialists</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Medical Records & History</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Create Patient Account</Link></li>
            </ul>
          </div>

          {/* Provider Portal */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">Providers & Clinics</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-foreground transition-colors">Doctor Schedule Manager</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Leave & Availability</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Provider Registration</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Admin Analytics</Link></li>
            </ul>
          </div>

          {/* Security & Compliance */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">Trust & Security</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> HIPAA-Compliant Architecture</li>
              <li className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Clinical Assistance</li>
              <li className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-primary" /> Patient-Centric Design</li>
            </ul>
            <p className="text-[11px] text-muted-foreground/80 mt-4">
              Demo platform for clinical portfolio and evaluation.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} MedTrack Pro Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Security Overview</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
