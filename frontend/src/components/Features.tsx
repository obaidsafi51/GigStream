import { Coins, Brain, Gauge, CreditCard } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Coins,
      title: "Real-Time Streaming",
      description: "Get paid continuously as you complete tasks. No more waiting for weekly or bi-weekly payouts.",
    },
    {
      icon: Brain,
      title: "AI-Powered Verification",
      description: "Smart task verification and fraud detection ensure secure, instant payments for legitimate work.",
    },
    {
      icon: Gauge,
      title: "Credit Score Building",
      description: "Build your on-chain reputation and unlock instant advances based on your work history.",
    },
    {
      icon: CreditCard,
      title: "USDC Payments",
      description: "Receive stable, borderless payments on Circle's Arc blockchain with sub-second finality.",
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for Gig Workers
          </h2>
          <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto animate-slide-up">
            GigStream eliminates payment delays and financial uncertainty with AI-driven automation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-hover rounded-xl bg-card p-6 shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-primary">
                <feature.icon className="h-7 w-7 text-primary-foreground text-white" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
