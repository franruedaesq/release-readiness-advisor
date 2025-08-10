"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { AlertCircle, BrainCircuit, ListChecks } from "lucide-react";

interface AnalysisResult {
  id: string;
  model: string;
  task: string;
  report: string;
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(
    "Assess release risk and suggest a deployment plan."
  );
  const [selectedModel, setSelectedModel] = useState("gpt-5");

  const handleAnalyzeClick = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:3002/api/v2/analysis/run",
        {
          task: selectedTask,
          model: selectedModel,
        }
      );

      const newResult: AnalysisResult = {
        id: `run-${results.length + 1}`,
        model: selectedModel,
        task: selectedTask,
        report: response.data.report,
      };

      setResults((prevResults) => [...prevResults, newResult]);
    } catch (err) {
      console.error("Error fetching analysis report:", err);
      setError(
        "Failed to fetch analysis report. Is the backend server running and configured?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 bg-gray-50 font-sans">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center">
            <BrainCircuit className="h-10 w-10 mr-3 text-blue-600" />
            Release Readiness Advisor
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            An AI-driven agent to assess release risk and generate deployment
            plans.
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="task">Task</Label>
              <Select
                onValueChange={setSelectedTask}
                defaultValue={selectedTask}
              >
                <SelectTrigger id="task">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assess release risk and suggest a deployment plan.">
                    Assess Release
                  </SelectItem>
                  <SelectItem value="Generate a brief, user-facing changelog from the context.">
                    Generate Changelog
                  </SelectItem>
                  <SelectItem value="Create a detailed rollback plan based on the findings.">
                    Create Rollback Plan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                onValueChange={setSelectedModel}
                defaultValue={selectedModel}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5">GPT 5</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT 5 mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT 4.1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Analyzing..." : "Run Analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-3" />
            <div>
              <p className="font-bold">An Error Occurred</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">
              Agents are working... Please wait.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <Tabs
            defaultValue={results[results.length - 1].id}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
              {results.map((result) => (
                <TabsTrigger key={result.id} value={result.id}>
                  {`Run ${result.id.split("-")[1]}: ${result.model}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {results.map((result) => (
              <TabsContent key={result.id} value={result.id}>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ListChecks className="h-6 w-6 mr-3 text-blue-600" />
                      Analysis Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <article className="prose max-w-none">
                      <ReactMarkdown>{result.report}</ReactMarkdown>
                    </article>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          // </Tabs>
        )}
      </div>
    </main>
  );
}
