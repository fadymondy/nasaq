<x-nq::mcp-connect server-url="https://mcp.example.com/mcp" server-name="example" token="nsq_live_a1b2c3d4e5f6g7h8i9j0" testable
    x-on:test="$event.detail.wait(Promise.resolve({ ok: true, tools: 12 }))" />
