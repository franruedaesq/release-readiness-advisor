"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  const handleAnalyzeClick = async () => {
    setIsLoading(true);
    setReport("");
    setError("");

    try {
      // The backend is running on port 3002
      const response = await axios.post(
        "http://localhost:3002/api/analysis/run"
      );
      setReport(response.data.report);
    } catch (err) {
      console.error("Error fetching analysis report:", err);
      setError(
        "Failed to fetch analysis report. Is the backend server running?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50 font-sans">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800">
            Release Readiness Advisor
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            An AI-driven agent to assess release risk and generate deployment
            plans.
          </p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <button
            onClick={handleAnalyzeClick}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
          >
            {isLoading ? "Analyzing..." : "Analyze Last Release"}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        )}

        {report && (
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">
                Analysis Report
              </h2>
            </div>
            <article className="prose max-w-none p-6">
              {/* The react-markdown library renders the report */}
              <ReactMarkdown>{report}</ReactMarkdown>
            </article>
          </div>
        )}

        {isLoading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">
              Fetching artifacts and running analysis... Please wait.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
