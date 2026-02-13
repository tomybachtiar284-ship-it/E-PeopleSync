/**
 * AI Flows (Mocking Genkit + Gemini 1.5 Flash)
 * 
 * This file mimics the centralized AI logic described in the concept.
 * It contains the "flows" that analyze data and return structured insights.
 */

// Simulate Genkit Flow: aiCandidateScreening
// Input: Job Description, Candidate Data (CV/Test)
// Output: Suitability Score, Strengths, Gaps
export async function aiCandidateScreening(candidate, jobTitle) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock Logic based on scores
            let score = candidate.testScore || Math.floor(Math.random() * 40) + 50; // Fallback random
            let classification = 'Proses';
            let strengths = [];
            let gaps = [];

            if (score >= 85) {
                score += Math.floor(Math.random() * 5); // Boost slightly
                classification = 'Recommended';
                strengths = ['Strong Technical alignment', 'Leadership potential', 'Excellent test results'];
                gaps = ['Minor experience gap in specialized tools'];
            } else if (score >= 70) {
                classification = 'Review';
                strengths = ['Good foundational knowledge', 'Cultural fit'];
                gaps = ['Needs training in specific framework', 'Communication score average'];
            } else {
                classification = 'Rejected';
                strengths = ['Enthusiastic'];
                gaps = ['Skillset mismatch for this role', 'Test score below threshold'];
            }

            // Cap score
            if (score > 100) score = 99;

            resolve({
                score: score,
                status: classification,
                analysis: {
                    strengths: strengths,
                    gaps: gaps
                }
            });
        }, 1500); // Simulate API latency
    });
}

// Simulate Genkit Flow: aiPerformanceReviewSummary
// Input: KPI Scores, Manager Notes
// Output: Narrative, Top Strength, Development Area
export async function aiPerformanceReviewSummary(employeeName, kpiData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const narratives = [
                "demonstrates exceptional consistency in delivery. Their ability to mentor junior team members has been a highlight this quarter.",
                "has shown great improvement in technical velocity. However, cross-functional communication often delays project handoffs.",
                "is a top performer in innovation, frequently proposing new architectural solutions. Attention to documentation detail could be improved."
            ];

            // Randomize for variant
            const rand = Math.floor(Math.random() * narratives.length);
            const narrative = `${employeeName} ${narratives[rand]}`;

            let topStrength = "Technical Execution";
            let devArea = "Public Speaking";

            if (rand === 0) { topStrength = "Mentorship"; devArea = "Strategic Planning"; }
            if (rand === 1) { topStrength = "Delivery Speed"; devArea = "Cross-team Comm"; }
            if (rand === 2) { topStrength = "Innovation"; devArea = "Documentation"; }

            resolve({
                narrative: narrative,
                structured: {
                    strength: topStrength,
                    area: devArea
                }
            });
        }, 1500);
    });
}
