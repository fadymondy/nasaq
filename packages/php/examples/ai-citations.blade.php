<x-nq::ai-citations feedback :sources="[
    ['id' => 's1', 'title' => 'Q3 report', 'url' => 'https://example.com/q3', 'quote' => 'Revenue grew 12% year over year, driven by renewals.', 'locator' => 'p. 4', 'highlight' => 'Revenue grew 12%', 'score' => 0.92],
    ['id' => 's2', 'title' => 'Board notes', 'quote' => 'Churn fell to 2.1% after the onboarding change.', 'kind' => 'Notes', 'score' => 0.74],
]" text="Revenue grew 12% [1] while churn fell [2].

The outlook is stable." :provenance="['model' => 'claude-sonnet', 'latencyMs' => 1240, 'grounded' => true, 'sourceCount' => 2, 'confidence' => 0.86]" />
