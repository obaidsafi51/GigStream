"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Demo data
const DEMO_WORKERS = [
  { id: "worker-1", name: "Alice Johnson", reputation: 850 },
  { id: "worker-2", name: "Bob Smith", reputation: 720 },
  { id: "worker-3", name: "Carol Davis", reputation: 680 },
];

const DEMO_SCENARIOS = [
  {
    id: "quick-delivery",
    name: "Quick Food Delivery",
    taskType: "fixed",
    amount: 15.50,
    description: "Deliver food order within 30 minutes",
  },
  {
    id: "data-entry",
    name: "Data Entry Task",
    taskType: "streaming",
    amount: 25.00,
    description: "Enter 100 records with real-time streaming payment",
  },
  {
    id: "customer-support",
    name: "Customer Support - 2hr",
    taskType: "streaming",
    amount: 40.00,
    description: "Handle customer inquiries with streaming payment",
  },
  {
    id: "content-moderation",
    name: "Content Moderation",
    taskType: "fixed",
    amount: 30.00,
    description: "Review and moderate 50 posts",
  },
];

type PaymentStage =
  | "idle"
  | "verifying"
  | "processing"
  | "blockchain"
  | "completed";

export default function SimulatorPage() {
  const [selectedWorker, setSelectedWorker] = useState(DEMO_WORKERS[0].id);
  const [taskType, setTaskType] = useState<"fixed" | "streaming">("fixed");
  const [amount, setAmount] = useState("25.00");
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("idle");
  const [progress, setProgress] = useState(0);
  const [txHash, setTxHash] = useState("");

  const worker = DEMO_WORKERS.find((w) => w.id === selectedWorker);

  const handleScenarioSelect = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      setTaskType(scenario.taskType as "fixed" | "streaming");
      setAmount(scenario.amount.toFixed(2));
    }
  };

  const simulateTaskCompletion = async () => {
    // Reset state
    setPaymentStage("verifying");
    setProgress(0);
    setTxHash("");

    // Stage 1: Task Verification (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));
    setProgress(25);

    // Stage 2: Payment Processing (800ms)
    setPaymentStage("processing");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setProgress(50);

    // Stage 3: Blockchain Transaction (1200ms)
    setPaymentStage("blockchain");
    await new Promise((resolve) => setTimeout(resolve, 600));
    setProgress(75);

    // Generate mock transaction hash
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    setTxHash(mockTxHash);

    await new Promise((resolve) => setTimeout(resolve, 600));
    setProgress(100);

    // Stage 4: Completed
    setPaymentStage("completed");
  };

  const resetSimulator = () => {
    setPaymentStage("idle");
    setProgress(0);
    setTxHash("");
  };

  const getStageMessage = () => {
    switch (paymentStage) {
      case "verifying":
        return "🔍 Verifying task completion...";
      case "processing":
        return "⚙️ Processing payment...";
      case "blockchain":
        return "⛓️ Submitting to Arc blockchain...";
      case "completed":
        return "✅ Payment completed successfully!";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🎬 GigStream Demo Simulator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Simulate task completion and instant payment flow in under 2 minutes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="space-y-6">
            {/* Worker Selection */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Select Worker</h3>
                <div className="space-y-3">
                  {DEMO_WORKERS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWorker(w.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        selectedWorker === w.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                            {w.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {w.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {w.id}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            w.reputation >= 800
                              ? "default"
                              : w.reputation >= 700
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {w.reputation} ⭐
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Demo Scenarios */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Quick Demo Scenarios
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {DEMO_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => handleScenarioSelect(scenario.id)}
                      disabled={paymentStage !== "idle"}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {scenario.name}
                        </div>
                        <Badge
                          variant={
                            scenario.taskType === "streaming"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {scenario.taskType}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {scenario.description}
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${scenario.amount.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Manual Controls */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Manual Configuration
                </h3>
                <div className="space-y-4">
                  {/* Task Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Task Type
                    </label>
                    <Select
                      value={taskType}
                      onChange={(e) =>
                        setTaskType(e.target.value as "fixed" | "streaming")
                      }
                      disabled={paymentStage !== "idle"}
                      className="w-full"
                    >
                      <option value="fixed">Fixed Payment</option>
                      <option value="streaming">Streaming Payment</option>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Payment Amount (USDC)
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={paymentStage !== "idle"}
                      min="1"
                      max="1000"
                      step="0.01"
                      className="w-full"
                    />
                  </div>

                  {/* Complete Task Button */}
                  <Button
                    onClick={simulateTaskCompletion}
                    disabled={paymentStage !== "idle" && paymentStage !== "completed"}
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    {paymentStage === "idle"
                      ? "🚀 Complete Task & Process Payment"
                      : paymentStage === "completed"
                      ? "✅ Completed"
                      : "⏳ Processing..."}
                  </Button>

                  {paymentStage === "completed" && (
                    <Button
                      onClick={resetSimulator}
                      variant="outline"
                      className="w-full"
                    >
                      Reset Simulator
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Progress & Results */}
          <div className="space-y-6">
            {/* Payment Progress */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Progress</h3>

                {paymentStage === "idle" ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <div className="text-6xl mb-4">💤</div>
                    <p>Ready to simulate task completion</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getStageMessage()}
                        </span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stage Indicators */}
                    <div className="space-y-3">
                      {[
                        { stage: "verifying", label: "Task Verification", icon: "🔍" },
                        { stage: "processing", label: "Payment Processing", icon: "⚙️" },
                        { stage: "blockchain", label: "Blockchain Submission", icon: "⛓️" },
                        { stage: "completed", label: "Payment Completed", icon: "✅" },
                      ].map(({ stage, label, icon }) => {
                        const stageIndex = ["verifying", "processing", "blockchain", "completed"].indexOf(stage);
                        const currentStageIndex = ["verifying", "processing", "blockchain", "completed"].indexOf(paymentStage);
                        const isComplete = currentStageIndex > stageIndex;
                        const isCurrent = currentStageIndex === stageIndex;

                        return (
                          <div
                            key={stage}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              isComplete
                                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                : isCurrent
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 animate-pulse"
                                : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50"
                            }`}
                          >
                            <div className="text-2xl">{icon}</div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {label}
                              </div>
                            </div>
                            {isComplete && (
                              <div className="text-green-600 dark:text-green-400 font-bold">
                                ✓
                              </div>
                            )}
                            {isCurrent && (
                              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Success Animation */}
                    {paymentStage === "completed" && (
                      <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border-2 border-green-400 dark:border-green-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center">
                          <div className="text-6xl mb-4 animate-bounce">🎉</div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Payment Successful!
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            ${amount} USDC transferred to {worker?.name}
                          </p>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>Settlement time:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              2.7 seconds
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Details */}
            {txHash && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Transaction Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Worker
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {worker?.name}
                        </div>
                      </div>
                      <Badge variant="default">{worker?.reputation} ⭐</Badge>
                    </div>

                    <div className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Amount
                        </div>
                        <div className="font-bold text-xl text-green-600 dark:text-green-400">
                          ${amount} USDC
                        </div>
                      </div>
                      <Badge
                        variant={
                          taskType === "streaming" ? "default" : "secondary"
                        }
                      >
                        {taskType}
                      </Badge>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Transaction Hash
                      </div>
                      <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                        {txHash}
                      </div>
                      <a
                        href={`${process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://testnet.arcscan.app"}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View on Arc Explorer
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Network
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Arc Testnet (Chain ID: 5042002)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Demo Info */}
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Demo Information</span>
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>
                      This simulator demonstrates the complete payment flow from task
                      completion to blockchain settlement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>
                      Real implementation uses Circle Developer-Controlled Wallets
                      for USDC transfers on Arc blockchain
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>
                      Average settlement time: &lt;3 seconds (vs 2-7 days traditional)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>Transaction hash links to Arc Testnet Explorer</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
