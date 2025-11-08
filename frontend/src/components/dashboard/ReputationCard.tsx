import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Star } from "lucide-react";

interface ReputationCardProps {
  score: number;
  level: string;
  tasksCompleted: number;
}

export const ReputationCard = ({ score, level, tasksCompleted }: ReputationCardProps) => {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Reputation Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-bold">{score}</div>
            <div className="text-sm text-muted-foreground">{level}</div>
          </div>
        </div>

        <Progress value={score} className="mb-2" />
        
        <p className="text-xs text-muted-foreground">
          {tasksCompleted} tasks completed • Keep building your score!
        </p>
      </CardContent>
    </Card>
  );
};
