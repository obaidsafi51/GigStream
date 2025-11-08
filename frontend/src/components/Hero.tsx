"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, Zap, Shield, TrendingUp, Building } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-light/30 via-background to-accent/10" />
      
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full icon-circle-bg icon-primary px-4 py-2 text-sm font-medium text-primary animate-slide-up">
            <Zap className="h-4 w-4" />
            <span>Powered by Circle Arc Blockchain</span>
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl animate-slide-up">
            Get Paid{" "}
            <span className="text-gradient-primary">Instantly</span>
            {" "}for Every Task
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto animate-slide-up">
            GigStream uses AI-powered automation to stream USDC payments in real-time. 
            No more waiting weeks for your earnings—get paid as you work.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up">
            <Button asChild size="lg" variant="gradient" className="text-base">
              <Link href="/register">
                Worker Signup <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/platform/register">
                For Platforms <Building className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto animate-slide-up">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full icon-circle-bg">
                <Zap className="h-6 w-6 icon-primary" />
              </div>
              <div className="text-2xl font-bold">{"<3s"}</div>
              <div className="text-sm text-muted-foreground">Payment Time</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full icon-circle-bg">
                <Shield className="h-6 w-6 icon-primary" />
              </div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full icon-circle-bg">
                <TrendingUp className="h-6 w-6 icon-primary" />
              </div>
              <div className="text-2xl font-bold">$0</div>
              <div className="text-sm text-muted-foreground">Transaction Fees</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
